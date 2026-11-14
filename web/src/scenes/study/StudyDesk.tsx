import { ContactShadows, Environment, SoftShadows } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraRig } from '../shared/CameraRig';
import { Hotspot } from '../shared/Hotspot';
import type { SceneProps } from '../types';
import { asset } from './assets';
import { Racket, ShuttleMesh } from './Badminton';
import { Laptop, Monitor } from './Electronics';
import { Globe } from './Globe';
import { FOCUS_SHOTS, LAYOUT, PATH } from './layout';
import {
  Books,
  CameraProp,
  Compass,
  Desk,
  DeskLamp,
  Mortarboard,
  Notebook,
  PencilCup,
  Plant,
  Postcards,
  Spectacles,
} from './Room';

const Effects = lazy(() => import('./Effects'));
const DeskPhysics = lazy(() => import('./Physics'));

declare global {
  interface Window {
    __flick?: () => void;
  }
}

/**
 * "Study Desk": Harish's desk at golden hour. Real CC0 props (Poly Haven) plus
 * hand-built PBR electronics, a globe and badminton kit. Each hotspot id must
 * match an id in content.ts → hero.hotspots.
 */
export default function StudyDesk({ hotspots, tier, degraded, reducedMotion, focusId, onFocus, signals, onReady }: SceneProps) {
  const [hovered, setHovered] = useState<THREE.Object3D | null>(null);
  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null);
  const [physics, setPhysics] = useState(false);
  const high = tier === 'high';
  // Postprocessing doesn't resize its buffers on DPR changes, so the composer is remounted.
  const dpr = useThree((s) => s.viewport.dpr);
  const still = reducedMotion;
  const label = (id: string) => hotspots.find((h) => h.id === id)?.label ?? id;
  const L = LAYOUT;

  // Signal readiness after a couple of rendered frames (all suspended assets are in by now).
  const frames = useRef(0);
  const readyFired = useRef(false);
  useFrame(() => {
    if (readyFired.current) return;
    if (++frames.current > 2) {
      readyFired.current = true;
      onReady?.();
      // Physics (Rapier WASM) is the heaviest chunk: load it only once the scene is up.
      if (!reducedMotion) window.setTimeout(() => setPhysics(true), 400);
    }
  });

  useEffect(() => {
    if (!focusId) setFocusTarget(null);
  }, [focusId]);

  const spot = (id: string, props: { position: [number, number, number]; rotation: [number, number, number] }, labelOffset: [number, number, number], children: React.ReactNode) =>
    hotspots.some((h) => h.id === id) ? (
      <Hotspot
        id={id}
        label={label(id)}
        position={props.position}
        rotation={props.rotation}
        labelOffset={labelOffset}
        active={focusId === id}
        quiet={!!focusId}
        onSelect={() => onFocus(id)}
        onHover={setHovered}
      >
        {children}
      </Hotspot>
    ) : (
      <group position={props.position} rotation={props.rotation}>
        {children}
      </group>
    );

  return (
    <>
      <color attach="background" args={['#0d0b09']} />
      <fog attach="fog" args={['#0d0b09', 3, 8]} />
      {high && <SoftShadows size={18} samples={10} focus={0.6} />}
      <Environment files={asset('hdri/brown_photostudio_02_1k.hdr')} environmentIntensity={0.55} environmentRotation={[0, 1.2, 0]} />
      <Lights high={high} />

      <CameraRig
        path={PATH}
        focus={focusId ? FOCUS_SHOTS[focusId] ?? null : null}
        signals={signals}
        reducedMotion={reducedMotion}
        parallax={high}
        onSettle={setFocusTarget}
      />

      <Desk tier={tier} />

      {spot('laptop', L.laptop, [0, 0.27, 0], <Laptop fps={high ? 24 : 12} still={still} />)}
      {spot('chart', L.monitor, [0, 0.55, 0], <Monitor fps={high ? 20 : 10} still={still} />)}
      {spot('globe', L.globe, [0, 0.38, 0], <Globe focused={focusId === 'globe'} still={still} />)}
      {spot(
        'racket',
        L.racket,
        [0, 0.4, -0.05],
        <Racket />,
      )}
      {spot(
        'books',
        L.books,
        [0.1, 0.32, 0],
        <>
          <Books />
          <group position={[L.notebook.position[0] - L.books.position[0], 0, L.notebook.position[2] - L.books.position[2]]} rotation={L.notebook.rotation}>
            <Notebook />
            <group position={[0.0, 0.024, 0.0]} rotation={[0, 0.3, 0]} scale={0.82}>
              <Mortarboard />
            </group>
          </group>
        </>,
      )}

      <group position={L.lamp.position} rotation={L.lamp.rotation}>
        <DeskLamp />
      </group>
      <group position={L.cup.position} rotation={L.cup.rotation}>
        <PencilCup />
      </group>
      <group position={L.spectacles.position} rotation={L.spectacles.rotation}>
        <Spectacles />
      </group>
      <group position={L.postcards.position} rotation={L.postcards.rotation}>
        <Postcards />
      </group>
      <group position={L.camera.position} rotation={L.camera.rotation}>
        <CameraProp />
      </group>
      <group position={L.compass.position} rotation={L.compass.rotation}>
        <Compass />
      </group>
      <group position={L.plant.position} rotation={L.plant.rotation}>
        <Plant />
      </group>

      {/* Shuttle: static until the physics chunk arrives, then it's flickable. */}
      {physics ? (
        <Suspense fallback={<StaticShuttle />}>
          <DeskPhysics onHover={setHovered} registerFlick={(fn) => (window.__flick = fn)} />
        </Suspense>
      ) : (
        <StaticShuttle />
      )}

      {!high && (
        <ContactShadows position={[0, 0.0005, 0]} scale={[2, 1]} far={0.5} blur={2.2} opacity={0.6} resolution={512} frames={1} color="#1a0f06" />
      )}

      <Suspense fallback={null}>
        <Effects key={`${dpr}-${degraded}`} tier={tier} degraded={degraded} hovered={hovered} focusTarget={focusTarget} />
      </Suspense>
    </>
  );
}

function StaticShuttle() {
  const [x, , z] = LAYOUT.shuttle.position;
  return <ShuttleMesh position={[x, 0.0128, z]} rotation={[0, 0.6, -Math.PI / 2 + 0.38]} />;
}

/** Warm lamp key + cool window fill; real-time soft shadows on the high tier. */
function Lights({ high }: { high: boolean }) {
  const spot = useRef<THREE.SpotLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    const s = spot.current;
    if (!s) return;
    s.target.position.set(-0.3, 0, 0.0);
    scene.add(s.target);
    return () => {
      scene.remove(s.target);
    };
  }, [scene]);
  return (
    <>
      <spotLight
        ref={spot}
        position={[-0.62, 0.62, -0.08]}
        angle={0.95}
        penumbra={1}
        intensity={2.4}
        distance={3}
        decay={2}
        color="#ffc88a"
        castShadow={high}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.01}
      />
      <directionalLight
        position={[1.6, 2.2, 1.4]}
        intensity={1.1}
        color="#dbe6ff"
        castShadow
        shadow-mapSize={high ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-1.2}
        shadow-camera-right={1.2}
        shadow-camera-top={1}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.5}
        shadow-camera-far={6}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
      />
      <pointLight position={[0.5, 0.45, 0.6]} intensity={0.15} color="#ffb070" distance={2} />
    </>
  );
}
