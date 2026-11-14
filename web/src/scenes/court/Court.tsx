import { Environment } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { CameraRig } from '../shared/CameraRig';
import { Hotspot } from '../shared/Hotspot';
import { asset } from '../study/assets';
import { saveData } from '../../lib/useDevice';
import type { SceneProps } from '../types';
import { Bleachers, Dust, Floor, LightRigs, Net, PerimeterBoards, Shell, useAimedLight } from './Arena';
import { FOCUS_SHOTS, LAYOUT, PATH, PLAY_SHOT } from './layout';
import { BenchKit, Bookshelf, KitTextureSize, Chalkboard, ClipScreen, CourtLitter, GlobeStand, Scoreboard, TickerBoard } from './Props';

const Effects = lazy(() => import('./Effects'));
const loadRally = () => import('./Rally');
const Rally = lazy(loadRally);

type V3 = [number, number, number];

/**
 * "The Court": an indoor badminton arena at night. A BWF-accurate court on a maple
 * floor, high-bay fixtures with light shafts, bleachers, LED boards, and around the
 * court the things that point to each section. Hotspot ids must match content.ts.
 */
export default function Court({ hotspots, tier, degraded, reducedMotion, focusId, onFocus, signals, onReady, playing = false }: SceneProps) {
  const [hovered, setHovered] = useState<THREE.Object3D | null>(null);
  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null);
  const high = tier === 'high';
  const rich = high && !degraded;
  const still = reducedMotion;
  const fps = high ? 20 : 10;
  const label = (id: string) => hotspots.find((h) => h.id === id)?.label ?? id;

  // Ready after a couple of rendered frames. Desktops then warm the physics chunk
  // (Rapier, ~850 kB gzip) in the background; phones fetch it when Play is tapped.
  const frames = useRef(0);
  const readyFired = useRef(false);
  useFrame(() => {
    if (readyFired.current) return;
    if (++frames.current > 2) {
      readyFired.current = true;
      onReady?.();
      if (high && !saveData) window.setTimeout(() => void loadRally(), 2500);
    }
  });

  useEffect(() => {
    if (!focusId) setFocusTarget(null);
  }, [focusId]);

  const spot = (id: string, place: { position: V3; rotation: V3 }, labelOffset: V3, children: ReactNode) =>
    hotspots.some((h) => h.id === id) ? (
      <Hotspot
        id={id}
        label={label(id)}
        position={place.position}
        rotation={place.rotation}
        labelOffset={labelOffset}
        active={focusId === id}
        quiet={!!focusId || playing}
        lift={0.04}
        onSelect={() => !playing && onFocus(id)}
        onHover={(o) => setHovered(playing ? null : o)}
      >
        {children}
      </Hotspot>
    ) : (
      <group position={place.position} rotation={place.rotation}>
        {children}
      </group>
    );

  const focusShot = playing ? PLAY_SHOT : focusId ? FOCUS_SHOTS[focusId] ?? null : null;

  return (
    <KitTextureSize.Provider value={high ? 1024 : 512}>
      <color attach="background" args={['#06080b']} />
      <fogExp2 attach="fog" args={['#111720', 0.024]} />
      <Environment files={asset(high ? 'court/hdri/squash_court_1k.hdr' : 'court/hdri/squash_court_512.hdr')} environmentIntensity={0.2} environmentRotation={[0, 0.6, 0]} />
      <Lights tier={tier} />
      <ShadowUpdates pulse={`${hovered?.uuid}-${focusId}-${playing}`} />

      <CameraRig
        path={PATH}
        focus={focusShot}
        signals={signals}
        reducedMotion={reducedMotion}
        parallax={high && !playing}
        onSettle={playing ? undefined : setFocusTarget}
        centered={playing}
      />

      <Floor tier={tier} reflect={rich} />
      <Net tier={tier} />
      <Shell tier={tier} />
      <Bleachers tier={tier} />
      <LightRigs shafts />
      <PerimeterBoards fps={fps} still={still} />
      {!playing && <CourtLitter />}

      {spot('scoreboard', LAYOUT.scoreboard, [0, 2.2, 0.4], <Scoreboard fps={high ? 8 : 4} still={still} signals={signals} />)}
      {spot('bench', LAYOUT.bench, [0, 1.2, 0], <BenchKit />)}
      {spot('screen', LAYOUT.screen, [0, 1.85, 0], <ClipScreen fps={fps} still={still} />)}
      {spot('ticker', LAYOUT.ticker, [0, 1.65, 0], <TickerBoard fps={fps} still={still} />)}
      {spot('chalkboard', LAYOUT.chalkboard, [0, 1.8, 0], <Chalkboard />)}
      {spot('bookshelf', LAYOUT.bookshelf, [0, 2.35, 0], <Bookshelf />)}
      {spot('globe', LAYOUT.globe, [0, 1.85, 0], <GlobeStand focused={focusId === 'globe'} still={still} detail={high ? 1 : 0.5} />)}

      {rich && <Dust still={still} />}

      {/* The rally (Rapier world, rackets, shuttle) exists only while playing; its chunk is prefetched. */}
      {playing && (
        <Suspense fallback={null}>
          <Rally playing={playing} signals={signals} />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <Effects tier={tier} degraded={degraded} hovered={hovered} focusTarget={focusTarget} playing={playing} />
      </Suspense>
    </KitTextureSize.Provider>
  );
}

/**
 * Nothing that casts a shadow moves except a hover lift or a focus change (the rally's
 * rackets and shuttle don't cast; they have floor blobs), so the two shadow maps are
 * re-rendered only then, plus the first frames and when play starts / stops (the court
 * litter comes and goes), instead of re-drawing every caster twice on every frame.
 */
function ShadowUpdates({ pulse }: { pulse: string }) {
  const gl = useThree((s) => s.gl);
  const left = useRef({ s: 0, frames: 0 });
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  // ~1 s of updates covers the hover lift and the globe's focus animation (timed, not
  // counted in frames, so a slow device doesn't redraw shadows for many seconds).
  useEffect(() => {
    left.current = { s: 1, frames: 2 };
  }, [pulse]);
  useFrame((_, delta) => {
    const l = left.current;
    if (l.s <= 0 && l.frames <= 0) return;
    l.s -= delta;
    l.frames--;
    gl.shadowMap.needsUpdate = true;
  });
  return null;
}

/**
 * Arena lighting: every high-bay fixture is a real spotlight aimed across the court;
 * two of them cast soft shadows. Low tier keeps four fixtures and one shadow.
 * Warm accent spots pick out each prop around the court.
 */
function Lights({ tier }: { tier: Tier }) {
  const high = tier === 'high';
  // One real spotlight per pair of fixtures (same look, half the per-pixel cost).
  const keys: V3[] = high
    ? [
        [-4.6, 9.2, -4.3],
        [4.6, 9.2, -4.3],
        [-4.6, 9.2, 4.3],
        [4.6, 9.2, 4.3],
      ]
    : [
        [-4.6, 9.2, 0],
        [4.6, 9.2, 0],
      ];
  const accents: { at: V3; to: V3 }[] = [
    { at: [3.4, 4.2, 3.4], to: [4.75, 0.4, 2.6] },
    { at: [3.4, 4.2, -1.2], to: [4.85, 1.1, -2.0] },
    { at: [3.2, 4.2, -5.2], to: [4.7, 0.9, -6.4] },
    { at: [-3.2, 4.2, -4.0], to: [-4.6, 0.9, -4.9] },
    { at: [-3.6, 4.4, -0.8], to: [-5.55, 1.0, -1.6] },
    { at: [-3.4, 4.2, 3.6], to: [-4.7, 1.1, 2.7] },
  ];
  return (
    <>
      <hemisphereLight args={['#9fb3d1', '#2a1c12', high ? 0.06 : 0.22]} />
      {keys.map((p, i) => (
        <Fixture key={i} at={p} shadow={high ? i === 1 || i === 2 : i === 0} size={high ? 2048 : 1024} wide={!high} />
      ))}
      {high && accents.map((a, i) => <Accent key={i} at={a.at} to={a.to} />)}
    </>
  );
}

type Tier = SceneProps['tier'];

function Fixture({ at, shadow, size, wide }: { at: V3; shadow: boolean; size: number; wide: boolean }) {
  const to = useMemo<V3>(() => [at[0] * 0.25, 0, at[2] * 0.9], [at]);
  const ref = useAimedLight<THREE.SpotLight>(to);
  return (
    <spotLight
      ref={ref}
      position={at}
      angle={wide ? 0.72 : 0.56}
      penumbra={0.7}
      intensity={wide ? 900 : 760}
      distance={30}
      decay={2}
      color="#fff3e0"
      castShadow={shadow}
      shadow-mapSize={[size, size]}
      shadow-bias={-0.0002}
      shadow-normalBias={0.02}
      shadow-radius={6}
      shadow-camera-near={3}
      shadow-camera-far={18}
    />
  );
}

function Accent({ at, to }: { at: V3; to: V3 }) {
  const ref = useAimedLight<THREE.SpotLight>(to);
  return <spotLight ref={ref} position={at} angle={0.4} penumbra={1} intensity={45} distance={9} decay={2} color="#ffcf9a" />;
}
