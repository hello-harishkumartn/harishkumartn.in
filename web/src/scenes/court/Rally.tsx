import { useFrame, useThree } from '@react-three/fiber';
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  Physics,
  RigidBody,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from '@react-three/rapier';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { Racket, SHUTTLE, ShuttleMesh } from '../study/Badminton';
import type { SceneSignals } from '../types';
import { BWF, HALF_W, MAT, RALLY } from './layout';
import { glowTexture } from './textures';

/**
 * The playable rally. Rapier integrates the shuttle (a 5 g cork-heavy body) and
 * resolves its collisions with the floor, net, posts and both rackets; every
 * physics step also applies quadratic air drag tuned to a real shuttle's ~6.8 m/s
 * terminal velocity, which is what gives the steep, "falling off a cliff" flight.
 * The mesh turns cork-first along its velocity (so it visibly flips after each hit).
 *
 * The visitor's racket follows the cursor in a vertical plane behind the short
 * service line; the opponent racket is a simple AI that reads the trajectory.
 *
 * Physics runs at a fixed 120 Hz before the frame's other callbacks; the shuttle and
 * both rackets are drawn interpolated between their last two steps, and nothing in the
 * step or frame loop allocates.
 */

const MASS = 0.0051;
const G = 9.81;
const VT = 6.8;
const K = G / (VT * VT); // drag per unit mass: a = -K |v| v
const DT = 1 / 120;
const HEAD = 0.583; // racket head centre above the grip end (see study/Badminton)
const REACH = 0.4; // generous "sweet spot" radius for playability
const NET_CLEAR = BWF.postHeight + 0.08;
const OPP_HOME = new THREE.Vector3(0, 1.5, RALLY.opponentZ);

declare global {
  interface Window {
    /** Test hook: let the visitor's racket play itself (for screenshots). */
    __autoplay?: boolean;
  }
}

interface Shot {
  v: THREE.Vector3;
  /** Where the flight crosses the target plane. */
  cross: THREE.Vector3;
  /** Time to reach the plane. */
  t: number;
}

/** Result of `simulate` (one shared record: the solver runs thousands of flights per hit). */
const sim = { hit: false, y: -1, netY: Infinity, t: 0, x: 0, py: 0, z: 0 };

/** Integrate a drag-affected flight (same model as the physics step) until it crosses `planeZ`. */
function simulate(px: number, py: number, pz: number, vx: number, vy: number, vz: number, planeZ: number) {
  const dir = Math.sign(planeZ - pz);
  sim.netY = Infinity;
  sim.hit = false;
  sim.y = -1;
  sim.t = 5;
  for (let i = 0; i < 600; i++) {
    const s = Math.sqrt(vx * vx + vy * vy + vz * vz);
    vx -= K * s * vx * DT;
    vy -= (G + K * s * vy) * DT;
    vz -= K * s * vz * DT;
    const prevZ = pz;
    px += vx * DT;
    py += vy * DT;
    pz += vz * DT;
    if (Math.sign(prevZ) !== Math.sign(pz) || (prevZ !== 0 && pz === 0)) sim.netY = py;
    if (py < 0) {
      sim.t = i * DT;
      break;
    }
    if ((pz - planeZ) * dir >= 0) {
      sim.hit = true;
      sim.y = py;
      sim.t = i * DT;
      break;
    }
  }
  sim.x = px;
  sim.py = py;
  sim.z = pz;
  return sim;
}

/**
 * Solve a launch velocity from `from` that crosses the plane z = planeZ at (x, y),
 * clearing the net. Binary search on speed for a given elevation; raise the
 * elevation until the net is cleared. Writes into `out` (no allocations).
 */
function aim(from: THREE.Vector3, x: number, planeZ: number, y: number, elevation: number, out: Shot): Shot {
  let fx = x - from.x;
  let fz = planeZ - from.z;
  const fl = Math.hypot(fx, fz) || 1;
  fx /= fl;
  fz /= fl;
  let a = elevation;
  for (let tries = 0; tries < 8; tries++) {
    let lo = 2;
    let hi = 60;
    let res = simulate(from.x, from.y, from.z, 0, 0, 0, planeZ);
    for (let i = 0; i < 22; i++) {
      const s = (lo + hi) / 2;
      const h = Math.cos(a) * s;
      out.v.set(fx * h, Math.sin(a) * s, fz * h);
      res = simulate(from.x, from.y, from.z, out.v.x, out.v.y, out.v.z, planeZ);
      if (!res.hit || res.y < y) lo = s;
      else hi = s;
    }
    out.cross.set(res.x, res.py, res.z);
    out.t = res.t;
    if (res.hit && res.netY > NET_CLEAR) return out;
    a += 0.1;
  }
  return out;
}

interface Props {
  playing: boolean;
  signals: SceneSignals;
}

type Phase = 'wait' | 'toPlayer' | 'toOpp' | 'over';

function Game({ playing, signals }: Props) {
  const { camera, pointer, gl, scene } = useThree();
  const root = useRef<THREE.Group>(null);
  const shuttle = useRef<RapierRigidBody>(null);
  const mesh = useRef<THREE.Group>(null);
  const player = useRef<RapierRigidBody>(null);
  const playerVis = useRef<THREE.Group>(null);
  const opp = useRef<RapierRigidBody>(null);
  const oppVis = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Mesh>(null);
  /** Recent shuttle positions, sampled at 60 Hz in the physics step (frame-rate independent). */
  const trail = useRef<THREE.Vector3[]>([]);
  /** Spare trail points, so sampling never allocates. */
  const spare = useMemo(() => Array.from({ length: TRAIL_N }, () => new THREE.Vector3()), []);
  const glow = useMemo(glowTexture, []);
  const stepN = useRef(0);
  const floorMark = useRef<THREE.Mesh>(null);
  const blobs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  /** Shaders compiled (off the main thread where the driver allows); the serve waits for it. */
  const [compiled, setCompiled] = useState(false);

  const st = useRef({
    phase: 'wait' as Phase,
    timer: 0.9,
    count: 0,
    best: Number(localStorage.getItem('hk:rally-best') ?? 0) || 0,
    expect: new THREE.Vector3(0, 1.5, RALLY.playerZ),
    oppGoal: new THREE.Vector3(0, 1.6, RALLY.opponentZ),
    racket: new THREE.Vector3(0.6, 1.4, RALLY.playerZ),
    racketPrev: new THREE.Vector3(0.6, 1.4, RALLY.playerZ),
    racketVel: new THREE.Vector3(),
    oppPos: new THREE.Vector3(0, 1.5, RALLY.opponentZ),
    oppPrev: new THREE.Vector3(0, 1.5, RALLY.opponentZ),
    racketGoal: new THREE.Vector3(0.6, 1.4, RALLY.playerZ),
    predict: 0,
    swing: 0,
    oppSwing: 0,
    /** Mirrors the Physics accumulator, for interpolating the rackets between steps. */
    acc: 0,
  });
  const tmp = useMemo(
    () => ({
      ray: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -RALLY.playerZ),
      hitP: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      up: new THREE.Vector3(0, 1, 0),
      v: new THREE.Vector3(),
      d: new THREE.Vector3(),
      from: new THREE.Vector3(),
      vis: new THREE.Vector3(),
      shot: { v: new THREE.Vector3(), cross: new THREE.Vector3(), t: 0 } as Shot,
      rest: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.8, -Math.PI / 2 + 0.38)),
    }),
    [],
  );

  // Compile every material of the rally before it is first drawn: mounting it used to
  // link a dozen new programs inside one frame (a multi-second stall in software GL).
  useEffect(() => {
    const g = root.current;
    if (!g) return;
    let live = true;
    const done = () => {
      if (!live) return;
      g.visible = true;
      setCompiled(true);
    };
    // The scene draws into the post-processing buffer (linear output, no tone mapping),
    // so compile against a render target too, or the cached programs won't match.
    const prev = gl.getRenderTarget();
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    gl.setRenderTarget(rt);
    const ready = gl.compileAsync(g, camera, scene);
    gl.setRenderTarget(prev);
    rt.dispose();
    ready.then(done, done);
    return () => {
      live = false;
    };
  }, [gl, camera, scene]);

  // The page reads the score every frame: mutate one record (and only when it changes).
  const publish = () => {
    const s = st.current;
    const state = s.phase === 'over' ? 'over' : s.phase === 'wait' ? 'idle' : 'live';
    const r = signals.rally;
    if (!r) signals.rally = { count: s.count, best: s.best, state };
    else if (r.count !== s.count || r.best !== s.best || r.state !== state) {
      r.count = s.count;
      r.best = s.best;
      r.state = state;
    }
  };

  const clearTrail = () => {
    const tr = trail.current;
    for (const p of tr) spare.push(p);
    tr.length = 0;
  };

  const launch = (from: THREE.Vector3, v: THREE.Vector3) => {
    const b = shuttle.current;
    if (!b) return;
    b.setTranslation(from, true);
    b.setLinvel(v, true);
    clearTrail();
  };

  /** Opponent feeds or returns towards the visitor's hitting plane. */
  const oppShot = (from: THREE.Vector3, serve: boolean) => {
    const s = st.current;
    const x = THREE.MathUtils.clamp((Math.random() - 0.5) * 3.2, -RALLY.maxX + 0.4, RALLY.maxX - 0.4);
    const y = 1.2 + Math.random() * 0.7;
    const shot = aim(from, x, RALLY.playerZ, y, serve ? 0.55 : 0.3 + Math.random() * 0.3, tmp.shot);
    launch(from, shot.v);
    s.expect.copy(shot.cross);
    s.phase = 'toPlayer';
    s.oppSwing = 1;
  };

  useEffect(() => {
    const s = st.current;
    if (playing) {
      s.phase = 'wait';
      s.timer = 0.9;
      s.count = 0;
    }
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Air drag every physics step (same explicit step as `simulate`, so predictions match).
  useBeforePhysicsStep(() => {
    const b = shuttle.current;
    if (!b) return;
    const v = b.linvel();
    const sp = Math.hypot(v.x, v.y, v.z);
    if (sp < 0.01) return;
    const f = 1 - K * sp * DT;
    b.setLinvel({ x: v.x * f, y: v.y * f, z: v.z * f }, true);
  });

  // Rally logic runs on every fixed physics step (not per rendered frame), so a fast
  // shuttle can't skip past the racket on slow devices.
  useAfterPhysicsStep(() => {
    const s = st.current;
    const b = shuttle.current;
    if (!b) return;
    const t = b.translation();
    const lv = b.linvel();

    // Visitor's racket eases towards the cursor target (or the expected crossing, for tests).
    if (window.__autoplay && s.phase === 'toPlayer') s.racketGoal.set(s.expect.x + 0.1, s.expect.y - 0.04, RALLY.playerZ);
    s.racketPrev.copy(s.racket);
    s.racket.lerp(s.racketGoal, 1 - Math.exp(-DT * (window.__autoplay ? 9 : 22)));
    s.racketVel.lerp(tmp.d.subVectors(s.racket, s.racketPrev).divideScalar(DT), 0.2);
    // The physical head sits just behind the hitting plane, so the proximity test below claims the hit first.
    player.current?.setNextKinematicTranslation({ x: s.racket.x, y: s.racket.y, z: s.racket.z + 0.06 });

    // Opponent racket drifts to where the shuttle will arrive.
    s.oppPrev.copy(s.oppPos);
    s.oppPos.lerp(s.phase === 'toOpp' ? s.oppGoal : OPP_HOME, 1 - Math.exp(-DT * 4.5));
    opp.current?.setNextKinematicTranslation({ x: s.oppPos.x, y: s.oppPos.y, z: s.oppPos.z });

    if (s.phase === 'wait' && playing && compiled) {
      s.timer -= DT;
      if (s.timer <= 0) oppShot(tmp.from.set(0, 2.0, RALLY.opponentZ - 0.3), true);
    } else if (s.phase === 'toPlayer') {
      // Refine where it will cross the hitting plane from the live state (drives the ring + autoplay).
      if (++s.predict % 6 === 0 && t.z < RALLY.playerZ - 0.2) {
        const r = simulate(t.x, t.y, t.z, lv.x, lv.y, lv.z, RALLY.playerZ);
        if (r.hit) s.expect.set(r.x, r.py, r.z);
      }
      // Per-step proximity to the racket head (fast shots move < 0.25 m per step).
      const head = s.racket;
      const near = t.z > RALLY.playerZ - 0.55 && t.z < RALLY.playerZ + 0.25;
      if (near && lv.z > 0 && Math.hypot(t.x - head.x, t.y - head.y, t.z - head.z) < REACH) {
        // Hit: steer with sideways racket speed, lift with upward speed.
        s.count += 1;
        if (s.count > s.best) {
          s.best = s.count;
          localStorage.setItem('hk:rally-best', String(s.best));
        }
        s.swing = 1;
        const steer = THREE.MathUtils.clamp(s.racketVel.x * 0.18 + (Math.random() - 0.5) * 1.6, -RALLY.maxX + 0.3, RALLY.maxX - 0.3);
        const lift = THREE.MathUtils.clamp(s.racketVel.y * 0.04, -0.15, 0.35);
        const from = tmp.from.set(t.x, Math.max(t.y, 0.6), Math.min(t.z, RALLY.playerZ) - 0.02);
        const shot = aim(from, steer, RALLY.opponentZ, 1.4 + Math.random() * 0.7, 0.32 + lift + Math.random() * 0.2, tmp.shot);
        launch(from, shot.v);
        s.oppGoal.copy(shot.cross);
        s.phase = 'toOpp';
      } else if (t.z > RALLY.playerZ + 0.6 || t.y < 0.08) {
        s.phase = 'over';
        s.timer = 1.8;
      }
    } else if (s.phase === 'toOpp') {
      if (t.z < RALLY.opponentZ + 0.25 && lv.z < 0) {
        // The AI gets a little more fallible as the rally grows; wide shots are out.
        const miss = Math.random() < Math.min(0.03 * s.count, 0.3) || Math.abs(t.x) > HALF_W + 0.3;
        if (miss) {
          s.phase = 'over';
          s.timer = 2;
        } else oppShot(tmp.from.set(t.x, Math.max(t.y, 0.7), RALLY.opponentZ + 0.05), false);
      } else if (t.y < 0.08) {
        s.phase = 'over';
        s.timer = 1.8;
      }
    } else if (s.phase === 'over') {
      s.timer -= DT;
      if (s.timer <= 0 && playing) {
        s.count = 0;
        s.phase = 'wait';
        s.timer = 0.5;
      }
    }
    publish();

    if (++stepN.current % 2 === 0) {
      const now = b.translation();
      const tr = trail.current;
      if (Math.hypot(lv.x, lv.y, lv.z) > 1.5) {
        const p = tr.length >= TRAIL_N ? tr.pop()! : spare.pop() ?? new THREE.Vector3();
        tr.unshift(p.set(now.x, now.y, now.z));
      } else {
        const p = tr.pop();
        if (p) spare.push(p);
      }
    }
  });

  useFrame((state, delta) => {
    const s = st.current;
    const b = shuttle.current;
    if (!b) return;
    const dt = Math.min(delta, 1 / 20);
    // Same bookkeeping as the Physics stepper (which runs just before this, at priority -1):
    // the fraction of a step not simulated yet, to draw the rackets between their last two states.
    s.acc += THREE.MathUtils.clamp(delta, 0, 0.5);
    while (s.acc >= DT) s.acc -= DT;
    const alpha = s.acc / DT;
    // The shuttle's group is already interpolated by Physics; read that, not the raw body.
    const body = mesh.current?.parent;
    if (!body) return;
    const t = body.position;
    const lv = b.linvel();
    tmp.v.set(lv.x, lv.y, lv.z);
    const speed = tmp.v.length();

    // Cursor → a point in the racket's plane.
    if (playing) {
      tmp.ray.setFromCamera(pointer, camera);
      if (tmp.ray.ray.intersectPlane(tmp.plane, tmp.hitP)) {
        tmp.hitP.x = THREE.MathUtils.clamp(tmp.hitP.x, -RALLY.maxX, RALLY.maxX);
        tmp.hitP.y = THREE.MathUtils.clamp(tmp.hitP.y, RALLY.minY, RALLY.maxY);
        s.racketGoal.copy(tmp.hitP);
      }
    }
    s.swing = Math.max(0, s.swing - dt * 4);
    s.oppSwing = Math.max(0, s.oppSwing - dt * 4);

    const tilt = -s.racket.x * 0.12 + THREE.MathUtils.clamp(s.racketVel.x * 0.02, -0.3, 0.3);
    const pv = tmp.vis.lerpVectors(s.racketPrev, s.racket, alpha);
    if (playerVis.current) {
      playerVis.current.position.set(pv.x, pv.y - HEAD, pv.z);
      playerVis.current.rotation.set(-Math.sin(s.swing * Math.PI) * 0.9, 0, tilt);
    }
    blobs[0].current?.position.set(pv.x, MAT.t + 0.002, pv.z - 0.1);
    const ov = tmp.vis.lerpVectors(s.oppPrev, s.oppPos, alpha);
    if (oppVis.current) {
      oppVis.current.position.set(ov.x, ov.y - HEAD, ov.z);
      oppVis.current.rotation.set(Math.sin(s.oppSwing * Math.PI) * 0.9, Math.PI, ov.x * 0.12);
    }
    blobs[1].current?.position.set(ov.x, MAT.t + 0.002, ov.z + 0.1);

    // ── Shuttle orientation: cork leads the flight; at rest it lies on its side.
    const m = mesh.current;
    if (m) {
      if (speed > 0.6 && t.y > 0.05) {
        tmp.q.setFromUnitVectors(tmp.up, tmp.v.multiplyScalar(-1 / speed));
        m.quaternion.slerp(tmp.q, 1 - Math.exp(-dt * (4 + speed * 1.6)));
      } else if (t.y < 0.06) {
        m.quaternion.slerp(tmp.rest, 1 - Math.exp(-dt * 6));
      }
    }

    // ── Where it will arrive: a ring in the hitting plane + a shadow dot on the floor.
    const show = s.phase === 'toPlayer';
    if (marker.current) {
      marker.current.visible = show;
      marker.current.position.copy(s.expect);
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.06;
      marker.current.scale.setScalar(pulse);
    }
    if (floorMark.current) {
      floorMark.current.visible = t.y > 0.1;
      floorMark.current.position.set(t.x, MAT.t + 0.002, t.z);
      const k = THREE.MathUtils.clamp(1 - t.y / 6, 0.25, 1);
      floorMark.current.scale.setScalar(0.6 + (1 - k));
      (floorMark.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * k;
    }
  });

  // Nothing here casts into the arena's shadow maps (they stay static during the rally,
  // instead of re-drawing ~100 casters twice per frame); soft floor blobs ground the
  // rackets and the dot below grounds the shuttle.
  return (
    <group ref={root} visible={false}>
      <RigidBody
        ref={shuttle}
        colliders={false}
        position={[0.4, 0.05, 1.6]}
        enabledRotations={[false, false, false]}
        linearDamping={0}
        ccd
      >
        <BallCollider args={[SHUTTLE.corkR * 1.6]} mass={MASS} friction={0.9} restitution={0.25} />
        <group ref={mesh} quaternion={tmp.rest}>
          <ShuttleMesh shadows={false} />
        </group>
        {/* Soft halo so the 85 mm shuttle reads at rally distance */}
        <sprite scale={0.16} renderOrder={13}>
          <spriteMaterial map={glow} color={[1.4, 1.2, 1.0]} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </RigidBody>
      <Trail points={trail} />

      <RigidBody ref={player} type="kinematicPosition" colliders={false} position={[0.6, 1.4, RALLY.playerZ]}>
        <CuboidCollider args={[0.1, 0.12, 0.012]} restitution={0.9} />
      </RigidBody>
      <group ref={playerVis}>
        <Racket shadows={false} />
      </group>
      <RigidBody ref={opp} type="kinematicPosition" colliders={false} position={[0, 1.5, RALLY.opponentZ]}>
        <CuboidCollider args={[0.1, 0.12, 0.012]} restitution={0.9} />
      </RigidBody>
      <group ref={oppVis}>
        <Racket shadows={false} />
      </group>
      {blobs.map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[-Math.PI / 2, 0, 0]} scale={[0.55, 0.38, 1]} renderOrder={1}>
          <planeGeometry />
          <meshBasicMaterial color="#000000" alphaMap={glow} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}

      <mesh ref={marker} visible={false}>
        <ringGeometry args={[0.15, 0.162, 64]} />
        <meshBasicMaterial color={[1.3, 0.75, 0.35]} toneMapped={false} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={floorMark} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.09, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

const TRAIL_N = 30;

/** Tapered additive ribbon through the shuttle's recent positions, facing the camera. */
function Trail({ points }: { points: RefObject<THREE.Vector3[]> }) {
  const N = TRAIL_N;
  const { camera } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(N * 2), 1));
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(idx);
    return g;
  }, [N]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(1.0,0.82,0.6) * 1.1 * vA, vA); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const side = useMemo(() => new THREE.Vector3(), []);
  const view = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const pts = points.current ?? [];
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const al = geo.attributes.alpha as THREE.BufferAttribute;
    const n = pts.length;
    for (let i = 0; i < N; i++) {
      if (n < 2) {
        al.setX(i * 2, 0);
        al.setX(i * 2 + 1, 0);
        pos.setXYZ(i * 2, 0, -10, 0);
        pos.setXYZ(i * 2 + 1, 0, -10, 0);
        continue;
      }
      if (i >= n) {
        // Fewer samples than vertex pairs (the first and last ~0.5 s of a flight): fold the
        // rest onto the last sample, zero width and transparent. Reading pts[i - 1] here used
        // to throw, which aborted the frame before the post pass drew it to the screen.
        const p = pts[n - 1];
        al.setX(i * 2, 0);
        al.setX(i * 2 + 1, 0);
        pos.setXYZ(i * 2, p.x, p.y, p.z);
        pos.setXYZ(i * 2 + 1, p.x, p.y, p.z);
        continue;
      }
      const p = pts[i];
      const q = pts[Math.min(i + 1, n - 1)];
      const r = pts[Math.max(i - 1, 0)];
      view.subVectors(camera.position, p).normalize();
      side.subVectors(r, q).cross(view).normalize();
      const f = 1 - i / (N - 1);
      const w = 0.016 * f;
      pos.setXYZ(i * 2, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
      pos.setXYZ(i * 2 + 1, p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
      al.setX(i * 2, f * f * 0.7);
      al.setX(i * 2 + 1, f * f * 0.7);
    }
    pos.needsUpdate = true;
    al.needsUpdate = true;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={12} />;
}

export default function Rally(props: Props) {
  return (
    <Physics gravity={[0, -G, 0]} timeStep={DT} updatePriority={-1}>
      <RigidBody type="fixed" colliders={false}>
        {/* Floor (top at the mat surface), the net, and the posts */}
        <CuboidCollider args={[16, 0.5, 15]} position={[0, MAT.t - 0.5, 0]} friction={0.9} restitution={0.2} />
        <CuboidCollider args={[HALF_W, BWF.netDepth / 2, 0.01]} position={[0, BWF.netCentre - BWF.netDepth / 2, 0]} restitution={0.05} friction={1} />
        {[-1, 1].map((s) => (
          <CylinderCollider key={s} args={[BWF.postHeight / 2, 0.026]} position={[s * (HALF_W + 0.02), BWF.postHeight / 2, 0]} />
        ))}
      </RigidBody>
      <Game {...props} />
    </Physics>
  );
}
