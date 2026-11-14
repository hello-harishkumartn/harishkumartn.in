import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SHUTTLE, ShuttleMesh } from './Badminton';
import { DESK } from './Room';
import { LAYOUT } from './layout';

/**
 * The playful bit: a real-feeling shuttlecock. Cork-heavy rigid body plus
 * quadratic air drag applied at the skirt, so it flips cork-first in flight
 * just like a real one. Click it (or swipe across it) to flick it.
 */

const MASS_CORK = 0.0042;
const MASS_SKIRT = 0.0009;
// Terminal velocity of a real shuttle is ~6.8 m/s → c = m g / vt².
const DRAG = ((MASS_CORK + MASS_SKIRT) * 9.81) / (6.8 * 6.8);

interface Props {
  onHover: (obj: THREE.Object3D | null) => void;
  /** Exposes a "flick" function for tests and the HTML hint button. */
  registerFlick?: (fn: () => void) => void;
}

function Shuttle({ onHover, registerFlick }: Props) {
  const body = useRef<RapierRigidBody>(null);
  const mesh = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const lastPointer = useRef({ x: 0, y: 0, t: 0 });
  const tmp = useRef({ v: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Quaternion() });

  const [sx, , sz] = LAYOUT.shuttle.position;
  const home = { x: sx, y: 0.04, z: sz };

  const flick = (dir?: THREE.Vector3, strength = 1) => {
    const b = body.current;
    if (!b) return;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const d = dir ?? right.multiplyScalar((Math.random() - 0.5) * 0.8);
    const m = MASS_CORK + MASS_SKIRT;
    const impulse = new THREE.Vector3(d.x * 2.2, 3.4 + Math.random() * 0.6, d.z * 2.2 - 0.6).multiplyScalar(m * strength);
    b.applyImpulse(impulse, true);
    b.applyTorqueImpulse({ x: (Math.random() - 0.5) * 2e-5, y: 0, z: (Math.random() - 0.5) * 2e-5 }, true);
  };

  useEffect(() => {
    registerFlick?.(() => flick());
  });

  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const { v, p, q } = tmp.current;
    // Respawn if it fell off the desk.
    const t = b.translation();
    if (t.y < -0.6 || Math.abs(t.x) > 1.4 || t.z > 1.2) {
      b.setTranslation(home, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      b.setRotation({ x: 0, y: 0, z: Math.sin(-Math.PI / 4), w: Math.cos(-Math.PI / 4) }, true);
      return;
    }
    const lv = b.linvel();
    v.set(lv.x, lv.y, lv.z);
    const speed = v.length();
    b.resetForces(true);
    if (speed > 0.05) {
      // Drag acts at the skirt's centre of pressure (behind the cork) → stabilises cork-first.
      const r = b.rotation();
      q.set(r.x, r.y, r.z, r.w);
      p.set(0, 0.045, 0).applyQuaternion(q).add(new THREE.Vector3(t.x, t.y, t.z));
      const f = v.multiplyScalar(-DRAG * speed);
      b.addForceAtPoint({ x: f.x, y: f.y, z: f.z }, { x: p.x, y: p.y, z: p.z }, true);
    }
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    flick();
  };
  // Swipe across it: use the pointer's screen velocity as the hit direction.
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const now = performance.now();
    const lp = lastPointer.current;
    const dt = Math.max(now - lp.t, 1);
    const vx = (e.clientX - lp.x) / dt;
    const vy = (e.clientY - lp.y) / dt;
    lastPointer.current = { x: e.clientX, y: e.clientY, t: now };
    const sp = Math.hypot(vx, vy);
    if (dt < 60 && sp > 1.2) {
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      flick(right.multiplyScalar(THREE.MathUtils.clamp(vx, -2, 2)), Math.min(sp / 1.5, 1.4));
    }
  };

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[home.x, home.y, home.z]}
      rotation={[0, 0.6, -Math.PI / 2 + 0.38]}
      angularDamping={0.6}
      linearDamping={0.02}
      ccd
    >
      <BallCollider args={[SHUTTLE.corkR]} mass={MASS_CORK} friction={0.6} restitution={0.35} />
      <CylinderCollider
        args={[SHUTTLE.skirtLen / 2, (SHUTTLE.corkR + SHUTTLE.skirtR) / 2]}
        position={[0, 0.012 + SHUTTLE.skirtLen / 2, 0]}
        mass={MASS_SKIRT}
        friction={0.9}
        restitution={0.1}
      />
      <ShuttleMesh
        ref={mesh}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'grab';
          onHover(mesh.current);
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
          onHover(null);
        }}
      />
    </RigidBody>
  );
}

export default function DeskPhysics(props: Props) {
  const L = LAYOUT;
  return (
    <Physics gravity={[0, -9.81, 0]} timeStep={1 / 120} interpolate>
      {/* Desk, wall and the big objects the shuttle can bounce off */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[DESK.w / 2, DESK.t / 2, DESK.d / 2]} position={[0, -DESK.t / 2, 0]} friction={0.8} />
        <CuboidCollider args={[3, 1.5, 0.02]} position={[0, 0.6, DESK.backZ - 0.03]} />
        <CuboidCollider args={[0.156, 0.008, 0.11]} position={[L.laptop.position[0], 0.008, L.laptop.position[2]]} rotation={[0, L.laptop.rotation[1], 0]} />
        <CuboidCollider args={[0.28, 0.17, 0.03]} position={[L.monitor.position[0], 0.34, L.monitor.position[2] - 0.01]} rotation={[0, L.monitor.rotation[1], 0]} />
        <BallCollider args={[0.125]} position={[L.globe.position[0], 0.2, L.globe.position[2]]} />
        <CuboidCollider args={[0.1, 0.12, 0.08]} position={[L.books.position[0] + 0.08, 0.12, L.books.position[2]]} />
      </RigidBody>
      <Shuttle {...props} />
    </Physics>
  );
}
