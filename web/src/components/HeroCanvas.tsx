import { PerformanceMonitor, useProgress } from '@react-three/drei';
import { Canvas, useThree, type RootState } from '@react-three/fiber';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { hero, site } from '../content';
import { scenes } from '../scenes';
import { Loader } from './Loader';
import type { SceneSignals, Tier } from '../scenes/types';

interface Props {
  tier: Tier;
  reducedMotion: boolean;
  focusId: string | null;
  onFocus: (id: string | null) => void;
  signals: SceneSignals;
  ready: boolean;
  onReady: () => void;
  playing: boolean;
}

declare global {
  interface Window {
    /** Test hook: the R3F root state (renderer.info for draw calls / triangles). */
    __r3f?: RootState;
  }
}

/**
 * Test hooks for headless screenshots (software GL renders a frame in seconds):
 * `?capture` keeps the last finished frame in the drawing buffer and pins the DPR,
 * `?dpr=1.5` picks the pixel ratio.
 */
const query = new URLSearchParams(window.location.search);
const CAPTURE = query.has('capture');
const FIXED_DPR = Number(query.get('dpr')) || (CAPTURE ? 1 : 0);
const NATIVE_DPR = window.devicePixelRatio || 1;

/**
 * Pixel-ratio budget per tier: phones start at 1.25 and may climb to 1.5, desktops
 * start at 1.5 and may climb to 2. Never above the screen's own ratio.
 */
function dprRange(tier: Tier) {
  const max = Math.min(NATIVE_DPR, tier === 'low' ? 1.5 : 2);
  const start = Math.min(NATIVE_DPR, tier === 'low' ? 1.25 : 1.5);
  return { min: Math.min(1, NATIVE_DPR), start, max };
}

/** The WebGL canvas. Lazy-loaded so three.js stays out of the main bundle. */
export default function HeroCanvas({ tier, reducedMotion, focusId, onFocus, signals, ready, onReady, playing }: Props) {
  const { progress } = useProgress();
  const def = scenes[site.scene];
  const Scene = useMemo(() => lazy(def.load), [def]);
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible');
  const [warm, setWarm] = useState(false);
  const [degraded, setDegraded] = useState(false);
  // Dropping effects swaps materials and rebuilds the post pass (shader compiles that
  // stall a frame), so during the rally only the pixel ratio adapts; the rest waits.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const pendingDegrade = useRef(false);
  const degrade = () => {
    if (playingRef.current) pendingDegrade.current = true;
    else setDegraded(true);
  };
  useEffect(() => {
    if (!playing && pendingDegrade.current) {
      pendingDegrade.current = false;
      setDegraded(true);
    }
  }, [playing]);
  const range = useMemo(() => dprRange(tier), [tier]);
  const [dpr, setDpr] = useState(FIXED_DPR || range.start);

  // Stop rendering when the hero is scrolled out of view or the tab is hidden.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    const vis = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', vis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  // Phones render on demand (full rate while something moves, a lower idle rate otherwise).
  const loop = tier === 'low' && !CAPTURE ? 'demand' : 'always';
  const frameloop = warm && inView && pageVisible ? loop : 'never';

  return (
    <div ref={wrap} className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} data-scene-ready={ready ? '' : undefined}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        flat
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: CAPTURE }}
        camera={{ position: def.camera.position, fov: def.camera.fov, near: 'far' in def.camera ? 0.1 : 0.05, far: 'far' in def.camera ? def.camera.far : 20 }}
        frameloop={frameloop}
        onCreated={(state) => {
          window.__r3f = state;
        }}
        aria-label={`Interactive 3D ${def.name}: ${hero.hotspots.map((h) => h.label).join(', ')}`}
        role="img"
      >
        {!FIXED_DPR && (
          <PerformanceMonitor
            bounds={(refresh) => (refresh > 90 ? [50, 90] : [40, 55])}
            flipflops={3}
            onDecline={() => {
              // Shed pixels first; once at the floor, drop the expensive effects.
              setDpr((d) => {
                if (d <= range.min + 0.01) degrade();
                return Math.max(range.min, d - 0.25);
              });
            }}
            onIncline={() => setDpr((d) => Math.min(range.max, d + 0.25))}
            onFallback={() => {
              setDpr(range.min);
              degrade();
            }}
          />
        )}
        {loop === 'demand' && <RenderDriver signals={signals} playing={playing} idleFps={reducedMotion ? 4 : 30} />}
        <Suspense fallback={null}>
          <Scene
            hotspots={hero.hotspots}
            tier={tier}
            degraded={degraded}
            reducedMotion={reducedMotion}
            focusId={focusId}
            onFocus={onFocus}
            signals={signals}
            onReady={onReady}
            playing={playing}
          />
          <Warmup onDone={() => setWarm(true)} />
        </Suspense>
      </Canvas>
      <Loader progress={ready ? 100 : Math.min(progress, 99)} done={ready} />
    </div>
  );
}

/**
 * Compile every shader before the first frame. Mounted next to the scene inside the
 * same Suspense boundary, so it runs once all assets are in; with
 * KHR_parallel_shader_compile the driver links programs off the main thread instead
 * of stalling the first render for a second or more on phones.
 */
function Warmup({ onDone }: { onDone: () => void }) {
  const { gl, scene, camera } = useThree();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    let live = true;
    const finish = () => live && done.current();
    gl.compileAsync(scene, camera).then(finish, finish);
    return () => {
      live = false;
    };
  }, [gl, scene, camera]);
  return null;
}

/**
 * Drives `frameloop="demand"`: every display frame while the camera travels, the
 * visitor scrolls / touches, or the rally runs; `idleFps` otherwise (screens and
 * light shafts still tick, at a fraction of the GPU and battery cost).
 */
function RenderDriver({ signals, playing, idleFps }: { signals: SceneSignals; playing: boolean; idleFps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let input = performance.now();
    const poke = () => {
      input = performance.now();
    };
    const events = ['scroll', 'pointerdown', 'pointermove', 'touchmove', 'wheel', 'resize'] as const;
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const active = playingRef.current || signals.moving || t - input < 1200;
      if (active || t - last >= 1000 / idleFps - 2) {
        last = t;
        invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      events.forEach((e) => window.removeEventListener(e, poke));
    };
  }, [invalidate, signals, idleFps]);
  return null;
}
