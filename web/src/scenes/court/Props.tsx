import { RoundedBox, useGLTF, useTexture } from '@react-three/drei';
import { createContext, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Mortarboard } from '../shared/Mortarboard';
import { Racket, ShuttleMesh } from '../study/Badminton';
import { asset } from '../study/assets';
import { Globe } from '../study/Globe';
import type { SceneSignals } from '../types';
import { createChalk, createClipScreen, createScoreboard, createSpines, createTicker } from './displays';
import { tubeLabel } from './textures';
import { useScreen } from './useScreen';

/** Enable shadows on every mesh of a loaded glTF. */
function prep(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
  });
}

function useModel(name: string) {
  const gltf = useGLTF(asset(`court/models/${name}.glb`));
  useLayoutEffect(() => prep(gltf.scene), [gltf.scene]);
  return gltf;
}

interface ScreenProps {
  fps: number;
  still: boolean;
}

// ───────────────────────────── Shared materials ─────────────────────────────

/** Kit texture size: 1024 on the high tier, 512 on phones (small props, ~1 MB less to fetch). */
export const KitTextureSize = createContext<512 | 1024>(1024);

function useKitMaterials() {
  const res = useContext(KitTextureSize);
  const [fMap, fNor] = useTexture([asset(`court/textures/fabric_diff_${res}.webp`), asset(`court/textures/fabric_nor_${res}.webp`)]);
  const [lMap, lNor] = useTexture([asset(`court/textures/leather_diff_${res}.webp`), asset(`court/textures/leather_nor_${res}.webp`)]);
  useLayoutEffect(() => {
    [fMap, lMap].forEach((t) => (t.colorSpace = THREE.SRGBColorSpace));
    [fMap, fNor, lMap, lNor].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(2, 1);
      t.needsUpdate = true;
    });
  }, [fMap, fNor, lMap, lNor]);
  return useMemo(
    () => ({
      // Dyed nylon: denim weave tinted near-black.
      nylon: new THREE.MeshPhysicalMaterial({
        map: fMap,
        normalMap: fNor,
        color: '#2a2d36',
        roughness: 0.78,
        sheen: 0.7,
        sheenRoughness: 0.4,
        sheenColor: new THREE.Color('#6a7088'),
      }),
      accent: new THREE.MeshPhysicalMaterial({ color: '#e8561b', roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#ffb080'), clearcoat: 0.3 }),
      leather: new THREE.MeshPhysicalMaterial({ map: lMap, normalMap: lNor, color: '#5a3a26', roughness: 0.55, clearcoat: 0.25 }),
      zip: new THREE.MeshStandardMaterial({ color: '#0e0f12', roughness: 0.6 }),
      metal: new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 1, roughness: 0.22 }),
      towel: new THREE.MeshPhysicalMaterial({ map: fMap, normalMap: fNor, color: '#f1ece2', roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#ffffff') }),
      plastic: new THREE.MeshPhysicalMaterial({ color: '#16181d', roughness: 0.35, clearcoat: 0.6 }),
      bottle: new THREE.MeshPhysicalMaterial({
        color: '#9fd3ff',
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.45,
        clearcoat: 1,
        depthWrite: false,
      }),
    }),
    [fMap, fNor, lMap, lNor],
  );
}

// ───────────────────────────── Bench + kit (About) ─────────────────────────────

/** Racket thermo bag: a soft rounded body with a zip, handles and a contrast panel. */
function KitBag() {
  const m = useKitMaterials();
  const L = 0.78;
  const H = 0.3;
  const D = 0.3;
  const handle = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, 0, 0),
      new THREE.Vector3(-0.09, 0.08, 0),
      new THREE.Vector3(0.09, 0.08, 0),
      new THREE.Vector3(0.12, 0, 0),
    ]);
    return new THREE.TubeGeometry(c, 32, 0.012, 10, false);
  }, []);
  const strap = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-L / 2 + 0.04, H * 0.15, D / 2 - 0.02),
      new THREE.Vector3(-0.2, -H * 0.42, D / 2 + 0.06),
      new THREE.Vector3(0.2, -H * 0.45, D / 2 + 0.06),
      new THREE.Vector3(L / 2 - 0.04, H * 0.15, D / 2 - 0.02),
    ]);
    const g = new THREE.TubeGeometry(c, 48, 0.008, 6, false);
    g.scale(1, 1, 1);
    return g;
  }, []);
  return (
    <group>
      <RoundedBox args={[L, H, D]} radius={0.11} smoothness={8} material={m.nylon} castShadow receiveShadow />
      {/* Contrast side panel + stripe */}
      <RoundedBox args={[L * 0.92, H * 0.5, 0.01]} radius={0.004} smoothness={2} position={[0, -0.01, D / 2 - 0.002]} material={m.leather} castShadow />
      <mesh position={[0, -0.01, D / 2 + 0.0045]} material={m.accent}>
        <boxGeometry args={[L * 0.9, 0.018, 0.002]} />
      </mesh>
      {/* Zip along the top */}
      <mesh position={[0, H / 2 - 0.004, 0]} rotation={[0, 0, Math.PI / 2]} material={m.zip}>
        <cylinderGeometry args={[0.006, 0.006, L - 0.16, 8]} />
      </mesh>
      <mesh position={[0.18, H / 2 + 0.002, 0.012]} material={m.metal} castShadow>
        <boxGeometry args={[0.03, 0.006, 0.014]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={handle} material={m.leather} position={[0, H / 2 - 0.01, s * 0.05]} castShadow />
      ))}
      <mesh geometry={strap} material={m.zip} castShadow />
    </group>
  );
}

function ShuttleTube({ accent = '#e8561b' }: { accent?: string }) {
  const m = useKitMaterials();
  const label = useMemo(() => tubeLabel(accent), [accent]);
  return (
    <group>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.041, 0.041, 0.3, 40]} />
        <meshPhysicalMaterial map={label} roughness={0.5} clearcoat={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * 0.155, 0]} material={m.plastic} castShadow>
          <cylinderGeometry args={[0.043, 0.043, 0.014, 40]} />
        </mesh>
      ))}
    </group>
  );
}

function Bottle() {
  const m = useKitMaterials();
  const geo = useMemo(() => {
    const p = [
      [0, 0],
      [0.036, 0],
      [0.038, 0.01],
      [0.038, 0.16],
      [0.032, 0.19],
      [0.018, 0.21],
      [0.018, 0.225],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 40);
  }, []);
  return (
    <group>
      <mesh geometry={geo} material={m.bottle} />
      <mesh position={[0, 0.235, 0]} material={m.accent} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 24]} />
      </mesh>
    </group>
  );
}

export function BenchKit() {
  const { scene } = useModel('painted_wooden_bench');
  const m = useKitMaterials();
  // Seat height measured from the model so the kit sits on it.
  const seat = useMemo(() => seatHeight(scene), [scene]);
  return (
    <group>
      <primitive object={scene} />
      <group position={[-0.12, seat + 0.15, -0.02]} rotation={[0, 0.05, 0]}>
        <KitBag />
      </group>
      <group position={[0.42, seat + 0.041, 0.04]} rotation={[0, 0.5, Math.PI / 2]}>
        <ShuttleTube />
      </group>
      <group position={[0.36, seat + 0.041 + 0.082, 0.02]} rotation={[0, 0.35, Math.PI / 2]}>
        <ShuttleTube accent="#2563eb" />
      </group>
      <RoundedBox args={[0.3, 0.05, 0.22]} radius={0.02} smoothness={4} position={[0.4, seat + 0.025, -0.13]} rotation={[0, -0.2, 0]} material={m.towel} castShadow receiveShadow />
      {/* On the floor: a bottle and a racket leaning on the bench */}
      <group position={[0.7, 0, 0.28]}>
        <Bottle />
      </group>
      <group position={[-0.62, 0.0, 0.3]} rotation={[-0.38, 0.25, 0.06]}>
        <Racket />
      </group>
      <group position={[0.1, 0.0, 0.42]} rotation={[0, -0.6, 0]}>
        <ShuttleTube />
      </group>
    </group>
  );
}

/** Highest large horizontal surface below 0.7 m: the bench seat. */
function seatHeight(scene: THREE.Object3D) {
  let best = 0.45;
  scene.updateMatrixWorld(true);
  const hist = new Map<number, number>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const nor = mesh.geometry.attributes.normal as THREE.BufferAttribute | undefined;
    if (!nor) return;
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      if (n.y < 0.95) continue;
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (v.y < 0.2 || v.y > 0.7) continue;
      const k = Math.round(v.y * 100);
      hist.set(k, (hist.get(k) ?? 0) + 1);
    }
  });
  let max = 0;
  hist.forEach((c, k) => {
    if (c > max) {
      max = c;
      best = k / 100;
    }
  });
  return best;
}

/** Distinct shelf-board heights of the bookshelf model (upward faces with many vertices). */
function shelfHeights(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);
  const hist = new Map<number, number>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const nor = mesh.geometry.attributes.normal as THREE.BufferAttribute | undefined;
    if (!nor) return;
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      if (n.y < 0.97) continue;
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const k = Math.round(v.y * 50);
      hist.set(k, (hist.get(k) ?? 0) + 1);
    }
  });
  const ys = [...hist.entries()]
    .filter(([k, c]) => c >= 8 && k / 50 > 0.05 && k / 50 < 1.95)
    .map(([k]) => k / 50)
    .sort((a, b) => a - b);
  // Merge neighbours (2 cm buckets) and keep shelves at least 25 cm apart.
  const out: number[] = [];
  for (const y of ys) if (!out.length || y - out[out.length - 1] > 0.25) out.push(y);
  return out;
}

// ───────────────────────────── Clip screen (Badminton) ─────────────────────────────

export function ClipScreen({ fps, still }: ScreenProps) {
  const panel = useRef<THREE.Mesh>(null);
  const tex = useScreen(createClipScreen, fps, still, [panel]);
  const mats = useMemo(
    () => ({
      bezel: new THREE.MeshPhysicalMaterial({ color: '#0a0a0c', roughness: 0.25, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
      steel: new THREE.MeshStandardMaterial({ color: '#2b2e34', metalness: 0.9, roughness: 0.35 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#101113', roughness: 0.8 }),
    }),
    [],
  );
  const W = 1.24;
  const H = 0.7;
  const Y = 1.28;
  return (
    <group>
      {/* Panel */}
      <RoundedBox args={[W + 0.03, H + 0.03, 0.05]} radius={0.01} smoothness={3} position={[0, Y, 0]} material={mats.bezel} castShadow />
      <mesh ref={panel} position={[0, Y, 0.0255]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={[1.25, 1.25, 1.25]} />
      </mesh>
      {/* Rolling stand: column, cross bar, H-base with casters */}
      <mesh position={[0, (Y - 0.1) / 2 + 0.06, -0.06]} material={mats.steel} castShadow>
        <boxGeometry args={[0.08, Y - 0.1, 0.05]} />
      </mesh>
      <mesh position={[0, Y, -0.045]} material={mats.steel} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.03]} />
      </mesh>
      <mesh position={[0, 0.07, -0.06]} material={mats.steel} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.04, 0.06]} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.07, -0.06]} material={mats.steel} castShadow receiveShadow>
            <boxGeometry args={[0.06, 0.04, 0.62]} />
          </mesh>
          {[-0.3, 0.18].map((z) => (
            <mesh key={z} position={[x, 0.03, z - 0.06]} rotation={[0, 0, Math.PI / 2]} material={mats.rubber} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.03, 16]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ───────────────────────────── Ticker (Markets) ─────────────────────────────

export function TickerBoard({ fps, still }: ScreenProps) {
  const panel = useRef<THREE.Mesh>(null);
  const tex = useScreen(createTicker, fps, still, [panel]);
  const frame = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#111216', metalness: 0.7, roughness: 0.35, clearcoat: 0.5 }), []);
  const W = 2.4;
  const H = 0.8;
  const Y = 0.95;
  return (
    <group>
      <RoundedBox args={[W + 0.08, H + 0.08, 0.12]} radius={0.02} smoothness={3} position={[0, Y, 0]} material={frame} castShadow receiveShadow />
      <mesh ref={panel} position={[0, Y, 0.061]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={[1.5, 1.5, 1.5]} />
      </mesh>
      {[-W / 2 + 0.2, W / 2 - 0.2].map((x) => (
        <group key={x}>
          <mesh position={[x, (Y - H / 2) / 2, 0]} material={frame} castShadow>
            <boxGeometry args={[0.06, Y - H / 2, 0.06]} />
          </mesh>
          <mesh position={[x, 0.02, 0]} material={frame} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.04, 0.6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ───────────────────────────── Scoreboard (Work) ─────────────────────────────

export function Scoreboard({ fps, still, signals }: ScreenProps & { signals: SceneSignals }) {
  const factory = useMemo(() => () => createScoreboard(() => signals.rally ?? { count: 0, best: 0 }), [signals]);
  const panel = useRef<THREE.Mesh>(null);
  const tex = useScreen(factory, fps, still, [panel]);
  const body = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#0c0d10', metalness: 0.6, roughness: 0.4, clearcoat: 0.6 }), []);
  const W = 6.4;
  const H = W / (1536 / 672);
  return (
    <group>
      <RoundedBox args={[W + 0.3, H + 0.3, 0.5]} radius={0.06} smoothness={3} material={body} castShadow />
      <mesh ref={panel} position={[0, 0, 0.252]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={[1.7, 1.7, 1.7]} />
      </mesh>
      {/* Accent trim and the cables it hangs from */}
      <mesh position={[0, -H / 2 - 0.16, 0.2]}>
        <boxGeometry args={[W + 0.3, 0.04, 0.1]} />
        <meshBasicMaterial color={[2.2, 1.0, 0.4]} toneMapped={false} />
      </mesh>
      {[-W / 2 + 0.4, W / 2 - 0.4].map((x) => (
        <mesh key={x} position={[x, H / 2 + 2.6, 0]} material={body}>
          <cylinderGeometry args={[0.015, 0.015, 5, 6]} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────────── Chalkboard (Ideas) ─────────────────────────────

export function Chalkboard() {
  const { scene } = useModel('standing_chalkboard_01');
  // Write on the board by compositing chalk over its own albedo (glTF UVs: no flipY).
  useLayoutEffect(() => {
    let board: THREE.Mesh | undefined;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.Material).name === 'standing_chalkboard_01_board') board = m;
    });
    const mat = board?.material as THREE.MeshStandardMaterial | undefined;
    const img = mat?.map?.image as CanvasImageSource & { width: number; height: number } | undefined;
    if (!board || !mat || !img) return;
    const chalk = createChalk(1024, 1024).image as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    // The slate occupies the top ~75 % of the texture, mapped upside down on the mesh.
    ctx.save();
    ctx.translate(c.width * 0.96, c.height * 0.73);
    ctx.rotate(Math.PI);
    ctx.drawImage(chalk, 0, 0, c.width * 0.92, c.height * 0.7);
    ctx.restore();
    const t = new THREE.CanvasTexture(c);
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const next = mat.clone();
    next.map = t;
    board.material = next;
    // Chalk dust is matte.
    next.roughness = 1;
  }, [scene]);
  return <primitive object={scene} />;
}

// ───────────────────────────── Bookshelf (Education) ─────────────────────────────

/**
 * A row of books as two merged meshes (spines + page/cover sides) instead of one
 * six-material box per book: ~2 draw calls per row rather than ~150.
 */
function BookRow({ width, seed, spines }: { width: number; seed: number; spines: THREE.Texture }) {
  const mats = useMemo(
    () => ({
      spine: new THREE.MeshPhysicalMaterial({ map: spines, roughness: 0.6, clearcoat: 0.2 }),
      side: new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9 }),
    }),
    [spines],
  );
  const geos = useMemo(() => {
    const spineParts: THREE.BufferGeometry[] = [];
    const sideParts: THREE.BufferGeometry[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    let x = 0;
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    while (x < width - 0.06) {
      const w = 0.025 + rnd() * 0.035;
      const h = 0.22 + rnd() * 0.12;
      const d = 0.16 + rnd() * 0.06;
      const lean = x > width * 0.75 && rnd() > 0.6 ? -0.25 : 0;
      const k = Math.floor(rnd() * 8);
      m.compose(new THREE.Vector3(x + w / 2 - width / 2, h / 2, 0), q.setFromEuler(e.set(0, 0, lean)), one);
      // Box face order: +x, -x, +y, -y, +z (spine), -z; 6 vertices per face once non-indexed.
      const box = new THREE.BoxGeometry(w, h, d).toNonIndexed().applyMatrix4(m);
      const pos = box.attributes.position.array as Float32Array;
      const nor = box.attributes.normal.array as Float32Array;
      const uv = box.attributes.uv.array as Float32Array;
      const part = (from: number, to: number, atlas: boolean) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos.slice(from * 3, to * 3), 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nor.slice(from * 3, to * 3), 3));
        const u = uv.slice(from * 2, to * 2);
        // The spine atlas holds 8 designs side by side.
        if (atlas) for (let i = 0; i < u.length; i += 2) u[i] = (k + u[i]) / 8;
        g.setAttribute('uv', new THREE.BufferAttribute(u, 2));
        return g;
      };
      spineParts.push(part(24, 30, true));
      sideParts.push(part(0, 24, false), part(30, 36, false));
      box.dispose();
      x += w + 0.002 + (lean ? 0.06 : 0);
    }
    const spine = mergeGeometries(spineParts)!;
    const side = mergeGeometries(sideParts)!;
    [...spineParts, ...sideParts].forEach((g) => g.dispose());
    return { spine, side };
  }, [width, seed]);
  return (
    <group>
      <mesh geometry={geos.spine} material={mats.spine} castShadow receiveShadow />
      <mesh geometry={geos.side} material={mats.side} castShadow receiveShadow />
    </group>
  );
}

function Trophy({ scale = 1 }: { scale?: number }) {
  const geo = useMemo(() => {
    const p = [
      [0, 0],
      [0.06, 0],
      [0.06, 0.02],
      [0.03, 0.03],
      [0.012, 0.05],
      [0.01, 0.1],
      [0.02, 0.11],
      [0.055, 0.14],
      [0.07, 0.2],
      [0.072, 0.24],
      [0.066, 0.24],
      [0.06, 0.2],
      [0, 0.15],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 48);
  }, []);
  const gold = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e0b25a', metalness: 1, roughness: 0.18, clearcoat: 0.4 }), []);
  return <mesh geometry={geo} material={gold} scale={scale} castShadow receiveShadow />;
}

export function Bookshelf() {
  const { scene } = useModel('wooden_bookshelf_worn');
  const shelves = useMemo(() => shelfHeights(scene), [scene]);
  const box = useMemo(() => new THREE.Box3().setFromObject(scene), [scene]);
  const inner = box.max.x - box.min.x - 0.16;
  const front = box.max.z - 0.2;
  const spines = useMemo(createSpines, []);
  return (
    <group>
      <primitive object={scene} />
      {shelves.map((y, i) => (
        <group key={y} position={[0, y + 0.002, front - 0.1]}>
          {i % 2 === 0 ? (
            <BookRow width={inner} seed={i * 17 + 3} spines={spines} />
          ) : (
            <>
              <group position={[-inner / 4, 0, 0]}>
                <BookRow width={inner / 2 - 0.05} seed={i * 31 + 5} spines={spines} />
              </group>
              <group position={[inner / 4 + 0.05, 0, 0.02]} rotation={[0, -0.4, 0]}>
                {i === 1 ? <Mortarboard /> : <Trophy scale={1.3} />}
              </group>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

// ───────────────────────────── Globe on a plinth (Travel) ─────────────────────────────

export function GlobeStand({ focused, still, detail = 1 }: { focused: boolean; still: boolean; detail?: number }) {
  const mats = useMemo(
    () => ({
      plinth: new THREE.MeshPhysicalMaterial({ color: '#1a1c21', roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
      top: new THREE.MeshPhysicalMaterial({ color: '#3a2216', roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.42, 0]} material={mats.plinth} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.84, 48]} />
      </mesh>
      <mesh position={[0, 0.855, 0]} material={mats.top} castShadow receiveShadow>
        <cylinderGeometry args={[0.31, 0.31, 0.03, 48]} />
      </mesh>
      <group position={[0, 0.87, 0]} scale={2.3}>
        <Globe focused={focused} still={still} detail={detail} />
      </group>
    </group>
  );
}

// ───────────────────────────── Loose kit on court ─────────────────────────────

/** A spare racket and a few shuttles lying around near the net. */
export function CourtLitter() {
  return (
    <group>
      <group position={[1.4, 0.012, 1.1]} rotation={[-Math.PI / 2, 0, 2.2]}>
        <Racket />
      </group>
      {[
        [0.6, 0.6, 0.4],
        [-0.9, 0.45, 2.1],
        [-1.6, 0.8, -0.7],
        [2.2, 0.35, -1.4],
      ].map(([x, z, r], i) => (
        <ShuttleMesh key={i} position={[x, 0.0128 + 0.0045, z]} rotation={[0, r * 5, -Math.PI / 2 + 0.38]} />
      ))}
    </group>
  );
}

['painted_wooden_bench', 'wooden_bookshelf_worn', 'standing_chalkboard_01'].forEach((m) => useGLTF.preload(asset(`court/models/${m}.glb`)));
