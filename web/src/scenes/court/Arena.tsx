import { MeshReflectorMaterial, RoundedBox, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { asset } from '../study/assets';
import type { Tier } from '../types';
import { createPerimeterBoard } from './displays';
import { ARENA, BWF, HALF_L, HALF_W, MAT } from './layout';
import { netTexture, slatTexture } from './textures';
import { useScreen } from './useScreen';

type Rect = [x0: number, z0: number, x1: number, z1: number];
type V3 = [number, number, number];

interface Part {
  geo: THREE.BufferGeometry;
  position?: V3;
  rotation?: V3;
  /** Applied after the part's own transform (e.g. a parent group's). */
  parent?: THREE.Matrix4;
}

/**
 * Bake many static parts that share a material into one geometry: one draw call
 * (and one shadow-map draw) instead of one per part.
 */
export function bake(parts: Part[]) {
  const o = new THREE.Object3D();
  const geos = parts.map(({ geo, position, rotation, parent }) => {
    o.position.set(...(position ?? [0, 0, 0]));
    o.rotation.set(...(rotation ?? [0, 0, 0]));
    o.updateMatrix();
    if (parent) o.matrix.premultiply(parent);
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(o.matrix);
    geo.dispose();
    return g;
  });
  const merged = mergeGeometries(geos)!;
  geos.forEach((g) => g.dispose());
  return merged;
}

/**
 * Every BWF line as a rectangle (outer-edge dimensions, 40 mm lines).
 * Built for the +z half and mirrored to the -z half.
 */
export function courtLines(): Rect[] {
  const w = BWF.line;
  const sw = BWF.singlesWidth / 2;
  const half: Rect[] = [
    // Back boundary line (also the singles long service line)
    [-HALF_W, HALF_L - w, HALF_W, HALF_L],
    // Doubles long service line, 0.76 m inside the back boundary
    [-HALF_W, HALF_L - BWF.doublesLong - w, HALF_W, HALF_L - BWF.doublesLong],
    // Short service line, 1.98 m from the net
    [-HALF_W, BWF.shortService, HALF_W, BWF.shortService + w],
    // Centre line: short service line → back boundary
    [-w / 2, BWF.shortService + w, w / 2, HALF_L - w],
  ];
  const mirrored = half.map(([x0, z0, x1, z1]) => [x0, -z1, x1, -z0] as Rect);
  const full: Rect[] = [
    // Doubles side lines
    [-HALF_W, -HALF_L, -HALF_W + w, HALF_L],
    [HALF_W - w, -HALF_L, HALF_W, HALF_L],
    // Singles side lines, 0.46 m inside
    [-sw, -HALF_L, -sw + w, HALF_L],
    [sw - w, -HALF_L, sw, HALF_L],
  ];
  return [...half, ...mirrored, ...full];
}

/**
 * Paint the BWF lines into the mat's own shader: per-pixel box-filtered coverage of each
 * line rectangle (via fwidth), so 40 mm lines stay crisp up close and fade correctly
 * instead of breaking into dashes at grazing angles far down the court.
 */
function withCourtLines(mat: THREE.MeshPhysicalMaterial) {
  const rects = courtLines().map(([x0, z0, x1, z1]) => new THREE.Vector4(x0, z0, x1, z1));
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLines = { value: rects };
    shader.uniforms.uLineColor = { value: new THREE.Color('#eceee8') };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCourt;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCourt = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vCourt;
        uniform vec4 uLines[${rects.length}];
        uniform vec3 uLineColor;
        float courtCov;
        float boxCov(float x, float w, float a, float b) {
          return clamp((min(x + w * 0.5, b) - max(x - w * 0.5, a)) / max(w, 1e-5), 0.0, 1.0);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 fw = max(fwidth(vCourt), vec2(1e-4));
        courtCov = 0.0;
        for (int i = 0; i < ${rects.length}; i++) {
          vec4 r = uLines[i];
          courtCov = max(courtCov, boxCov(vCourt.x, fw.x, r.x, r.z) * boxCov(vCourt.y, fw.y, r.y, r.w));
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, uLineColor, courtCov);`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, courtCov);');
  };
  mat.customProgramCacheKey = () => 'court-lines';
  return mat;
}

function useTiled(paths: string[], repeat: [number, number], srgbFirst = true, anisotropy = 16) {
  const tex = useTexture(paths);
  useLayoutEffect(() => {
    tex.forEach((t, i) => {
      if (i === 0 && srgbFirst) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(...repeat);
      t.anisotropy = anisotropy;
      t.needsUpdate = true;
    });
  }, [tex, repeat, srgbFirst, anisotropy]);
  return tex;
}

/** Maple sports floor (reflective on the high tier) + the green synthetic court mat + lines. */
export function Floor({ tier, reflect }: { tier: Tier; reflect: boolean }) {
  const low = tier === 'low';
  const res = low ? 1024 : 2048;
  const aniso = low ? 4 : 16;
  const floorRepeat = useMemo<[number, number]>(() => [ARENA.halfX * 2 / 1.1, ARENA.halfZ * 2 / 1.1], []);
  const [fMap, fNor, fArm] = useTiled(
    [asset(`court/textures/floor_diff_${res}.webp`), asset(`court/textures/floor_nor_${res}.webp`), asset(`court/textures/floor_arm_${res}.webp`)],
    floorRepeat,
    true,
    aniso,
  );
  const matRepeat = useMemo<[number, number]>(() => [MAT.w / 1.6, MAT.l / 1.6], []);
  const matRes = low ? 512 : 1024;
  const [mNor, mRough] = useTiled([asset(`court/textures/mat_nor_${matRes}.webp`), asset(`court/textures/mat_rough_${matRes}.webp`)], matRepeat, false, aniso);
  // The floor and mat fill most of the screen, so phones skip the clearcoat / sheen
  // lobes (each one is another full specular evaluation per pixel).
  const matMaterial = useMemo(
    () =>
      withCourtLines(
        new THREE.MeshPhysicalMaterial({
          color: '#1c5a45',
          roughness: low ? 0.85 : 0.95,
          normalScale: new THREE.Vector2(0.35, 0.35),
          clearcoat: low ? 0 : 0.35,
          clearcoatRoughness: 0.4,
          sheen: low ? 0 : 0.3,
          sheenColor: new THREE.Color('#2f8a6b'),
          envMapIntensity: 0.6,
        }),
      ),
    [low],
  );
  useLayoutEffect(() => {
    matMaterial.roughnessMap = mRough;
    matMaterial.normalMap = mNor;
    matMaterial.needsUpdate = true;
  }, [matMaterial, mRough, mNor]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA.halfX * 2, ARENA.halfZ * 2]} />
        {reflect ? (
          <MeshReflectorMaterial
            map={fMap}
            normalMap={fNor}
            normalScale={new THREE.Vector2(0.6, 0.6)}
            roughnessMap={fArm}
            roughness={0.5}
            metalness={0}
            color="#b9a089"
            envMapIntensity={0.5}
            blur={[180, 60]}
            resolution={512}
            mixBlur={0.9}
            mixStrength={5}
            mixContrast={1}
            depthScale={0.6}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            mirror={0}
          />
        ) : (
          <meshPhysicalMaterial
            map={fMap}
            normalMap={fNor}
            normalScale={new THREE.Vector2(0.6, 0.6)}
            roughnessMap={fArm}
            roughness={low ? 0.7 : 0.9}
            color="#b9a089"
            clearcoat={low ? 0 : 0.6}
            clearcoatRoughness={0.22}
            envMapIntensity={0.5}
          />
        )}
      </mesh>

      {/* Court mat: 4.5 mm PU sheet with a soft sheen; the lines are painted in its shader */}
      <mesh position={[0, MAT.t / 2, 0]} receiveShadow material={matMaterial}>
        <boxGeometry args={[MAT.w, MAT.t, MAT.l]} />
      </mesh>
    </group>
  );
}

/** Net 1.524 m at the centre, 1.55 m at the posts; 760 mm deep; 75 mm white tape over a cord. */
export function Net({ tier }: { tier: Tier }) {
  const { netGeo, tapeGeo, mats } = useMemo(() => {
    const top = (x: number) => BWF.postHeight - (BWF.postHeight - BWF.netCentre) * (1 - (x / HALF_W) ** 2);
    const segs = 48;
    const net = new THREE.PlaneGeometry(BWF.width, BWF.netDepth, segs, 1);
    const pos = net.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const isTop = pos.getY(i) > 0;
      // Slight belly in the mesh as well as the sag at the top.
      pos.setXYZ(i, x, isTop ? top(x) - 0.035 : top(x) - BWF.netDepth, isTop ? 0 : 0.012 * (1 - (x / HALF_W) ** 2));
    }
    net.computeVertexNormals();
    // UVs: one texture repeat per 19 mm cell.
    const uv = net.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (BWF.width / 0.019), uv.getY(i) * (BWF.netDepth / 0.019));
    const tape = new THREE.PlaneGeometry(BWF.width, 0.075, segs, 1);
    const tp = tape.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i);
      tp.setY(i, top(x) + (tp.getY(i) > 0 ? 0 : -0.075));
    }
    tape.computeVertexNormals();
    const alpha = netTexture();
    alpha.anisotropy = tier === 'low' ? 4 : 16;
    return {
      netGeo: net,
      tapeGeo: tape,
      mats: {
        net: new THREE.MeshStandardMaterial({
          color: '#3a2c22',
          alphaMap: alpha,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
          roughness: 0.85,
        }),
        tape: new THREE.MeshPhysicalMaterial({ color: '#f5f4ef', roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide }),
        post: new THREE.MeshPhysicalMaterial({ color: '#13372c', metalness: 0.6, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
        steel: new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 1, roughness: 0.3 }),
        rubber: new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.8 }),
      },
    };
  }, [tier]);

  return (
    <group>
      <mesh geometry={netGeo} material={mats.net} castShadow />
      {[-0.007, 0.007].map((z) => (
        <mesh key={z} geometry={tapeGeo} material={mats.tape} position={[0, 0, z]} castShadow />
      ))}
      {/* Side tapes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HALF_W - 0.0125), BWF.postHeight - BWF.netDepth / 2 - 0.035, 0]} material={mats.tape}>
          <boxGeometry args={[0.025, BWF.netDepth, 0.012]} />
        </mesh>
      ))}
      {/* Posts on the doubles side lines, on weighted wheeled bases outside the court */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (HALF_W + 0.02), 0, 0]}>
          <mesh position={[0, BWF.postHeight / 2 + 0.03, 0]} material={mats.post} castShadow receiveShadow>
            <cylinderGeometry args={[0.024, 0.026, BWF.postHeight, 24]} />
          </mesh>
          <mesh position={[0, BWF.postHeight + 0.035, 0]} material={mats.steel} castShadow>
            <cylinderGeometry args={[0.028, 0.026, 0.02, 24]} />
          </mesh>
          {/* Tensioning ratchet */}
          <mesh position={[s * 0.035, 1.05, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.steel} castShadow>
            <cylinderGeometry args={[0.014, 0.014, 0.05, 16]} />
          </mesh>
          <RoundedBox args={[0.62, 0.09, 0.42]} radius={0.03} smoothness={4} position={[s * 0.27, 0.06, 0]} material={mats.post} castShadow receiveShadow />
          {[-0.17, 0.17].map((z) => (
            <mesh key={z} position={[s * 0.52, 0.03, z]} rotation={[Math.PI / 2, 0, 0]} material={mats.rubber} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.025, 18]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Dark slatted acoustic walls, a black ceiling with trusses, and an orange kick band. */
export function Shell({ tier }: { tier: Tier }) {
  const wallRes = tier === 'low' ? 512 : 1024;
  const wallRepeat = useMemo<[number, number]>(() => [8, 2], []);
  const slats = useMemo(() => {
    const t = slatTexture();
    t.repeat.set(26, 1);
    return t;
  }, []);
  const [wMap, wNor] = useTiled([asset(`court/textures/wall_diff_${wallRes}.webp`), asset(`court/textures/wall_nor_${wallRes}.webp`)], wallRepeat);
  const H = ARENA.height;
  const walls: { pos: [number, number, number]; rot: number; len: number }[] = [
    { pos: [0, H / 2, -ARENA.halfZ], rot: 0, len: ARENA.halfX * 2 },
    { pos: [0, H / 2, ARENA.halfZ], rot: Math.PI, len: ARENA.halfX * 2 },
    { pos: [-ARENA.halfX, H / 2, 0], rot: Math.PI / 2, len: ARENA.halfZ * 2 },
    { pos: [ARENA.halfX, H / 2, 0], rot: -Math.PI / 2, len: ARENA.halfZ * 2 },
  ];
  const truss = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.85, roughness: 0.45 }), []);
  const trussGeo = useMemo(
    () =>
      bake(
        [-10, -5, 0, 5, 10].flatMap((z): Part[] => {
          const y = H - 0.9;
          return [
            { geo: new THREE.BoxGeometry(ARENA.halfX * 2, 0.12, 0.12), position: [0, y, z] },
            { geo: new THREE.BoxGeometry(ARENA.halfX * 2, 0.1, 0.1), position: [0, y + 0.7, z] },
            ...Array.from({ length: 16 }, (_, i) => -ARENA.halfX + 1 + i * 2).map(
              (x): Part => ({ geo: new THREE.BoxGeometry(0.06, 0.82, 0.06), position: [x, y + 0.35, z], rotation: [0, 0, (x / 2) % 2 ? 0.6 : -0.6] }),
            ),
          ];
        }),
      ),
    [H],
  );

  return (
    <group>
      {walls.map((w, i) => (
        <group key={i} position={w.pos} rotation={[0, w.rot, 0]}>
          <mesh receiveShadow>
            <planeGeometry args={[w.len, H]} />
            <meshStandardMaterial color="#1b2230" bumpMap={slats} bumpScale={2} map={wMap} normalMap={wNor} roughness={0.85} />
          </mesh>
          {/* Kick band */}
          <mesh position={[0, -H / 2 + 0.6, 0.02]} receiveShadow>
            <planeGeometry args={[w.len, 1.2]} />
            <meshStandardMaterial color="#14171c" roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, -H / 2 + 1.22, 0.025]}>
            <planeGeometry args={[w.len, 0.05]} />
            <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ARENA.halfX * 2, ARENA.halfZ * 2]} />
        <meshStandardMaterial color="#07080a" roughness={1} />
      </mesh>
      {/* Roof trusses across the hall (one merged mesh) */}
      <mesh geometry={trussGeo} material={truss} />
    </group>
  );
}

/** Tiered seating along both long sides: concrete steps and instanced moulded seats. */
export function Bleachers({ tier }: { tier: Tier }) {
  const rows = tier === 'low' ? 6 : 8;
  const step = { rise: 0.42, run: 0.82 };
  const startX = 8.2;
  const len = 22;
  const seatGap = 0.55;
  const perRow = Math.floor(len / seatGap);

  const seatGeo = useMemo(() => {
    const pan = new THREE.BoxGeometry(0.44, 0.06, 0.4, 1, 1, 1);
    pan.translate(0, 0.42, 0);
    const back = new THREE.BoxGeometry(0.44, 0.42, 0.05);
    back.rotateX(-0.12);
    back.translate(0, 0.66, -0.2);
    const stem = new THREE.BoxGeometry(0.06, 0.4, 0.06);
    stem.translate(0, 0.2, -0.05);
    return mergeGeometries([pan.toNonIndexed(), back.toNonIndexed(), stem.toNonIndexed()])!;
  }, []);

  const seats = useRef<THREE.InstancedMesh>(null);
  const count = rows * perRow * 2;
  useLayoutEffect(() => {
    const m = seats.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let k = 0;
    for (const side of [-1, 1]) {
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < perRow; i++) {
          const x = side * (startX + r * step.run + step.run * 0.45);
          const z = -len / 2 + i * seatGap + seatGap / 2;
          o.position.set(x, (r + 1) * step.rise, z);
          o.rotation.set(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
          o.updateMatrix();
          m.setMatrixAt(k, o.matrix);
          // Navy seats with an orange "HK" block in the middle of each stand.
          const inBlock = Math.abs(z) < 2.2 && r >= 2 && r <= 5;
          c.set(inBlock ? '#c2531d' : (r + i) % 9 === 0 ? '#25324a' : '#1c2740');
          m.setColorAt(k, c);
          k++;
        }
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [rows, perRow, startX, step.rise, step.run]);

  // Concrete steps and the front railings, each merged into a single mesh.
  const { stepsGeo, railGeo } = useMemo(() => {
    const steps: Part[] = [];
    const rails: Part[] = [];
    for (const side of [-1, 1]) {
      for (let r = 0; r < rows; r++) {
        const w = ARENA.halfX - startX - r * step.run;
        steps.push({ geo: new THREE.BoxGeometry(w, (r + 1) * step.rise, len), position: [side * (startX + r * step.run + w / 2), ((r + 1) * step.rise) / 2, 0] });
      }
      rails.push({ geo: new THREE.BoxGeometry(0.04, 0.04, len), position: [side * (startX - 0.05), 1.05, 0] });
      for (let i = 0; i < 12; i++) {
        rails.push({ geo: new THREE.CylinderGeometry(0.02, 0.02, 0.66, 8), position: [side * (startX - 0.05), 0.72, -len / 2 + 0.9 + i * ((len - 1.8) / 11)] });
      }
    }
    return { stepsGeo: bake(steps), railGeo: bake(rails) };
  }, [rows, startX, step.run, step.rise]);

  return (
    <group>
      <mesh geometry={stepsGeo} receiveShadow castShadow={false}>
        <meshStandardMaterial color="#2a2c31" roughness={0.92} />
      </mesh>
      <mesh geometry={railGeo}>
        <meshStandardMaterial color="#9aa0a6" metalness={1} roughness={0.25} />
      </mesh>
      <instancedMesh ref={seats} args={[seatGeo, undefined, count]} castShadow={false} receiveShadow>
        <meshPhysicalMaterial roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} />
      </instancedMesh>
    </group>
  );
}

// ───────────────────────────── Light rigs + shafts ─────────────────────────────

/** High-bay LED fixtures beside the court (badminton halls keep lights off the court axis to avoid glare). */
export const FIXTURES: [number, number, number][] = [-6.4, -2.2, 2.2, 6.4].flatMap((z) => [
  [-4.6, 9.2, z] as [number, number, number],
  [4.6, 9.2, z] as [number, number, number],
]);

const beamVert = /* glsl */ `
  varying float vH;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vH = uv.y;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const beamFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying float vH;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    // Soft edges (fresnel) and a fade towards the floor and at the lamp.
    float edge = pow(abs(dot(normalize(vN), normalize(vView))), 1.6);
    float along = smoothstep(0.0, 0.55, vH) * smoothstep(1.0, 0.86, vH);
    float drift = 0.85 + 0.15 * sin(vH * 9.0 + uTime * 0.35);
    float a = edge * along * drift * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Fake volumetric light: additive cones with soft edges, all shafts in one draw call. */
function Beams({ shafts, radius, intensity }: { shafts: { from: THREE.Vector3; to: THREE.Vector3 }[]; radius: number; intensity: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color('#fff1dc') }, uIntensity: { value: intensity }, uTime: { value: 0 } },
        vertexShader: beamVert,
        fragmentShader: beamFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      }),
    [intensity],
  );
  const geo = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    return bake(
      shafts.map(({ from, to }) => {
        // uv.y = 1 at the lamp, 0 at the floor (CylinderGeometry's default layout).
        // The fade is computed per pixel from uv.y, so one height segment is enough.
        const m = new THREE.Matrix4().compose(
          from.clone().add(to).multiplyScalar(0.5),
          new THREE.Quaternion().setFromUnitVectors(up, from.clone().sub(to).normalize()),
          new THREE.Vector3(1, 1, 1),
        );
        return { geo: new THREE.CylinderGeometry(0.28, radius, from.distanceTo(to), 40, 1, true), parent: m };
      }),
    );
  }, [shafts, radius]);
  useFrame((_, d) => {
    mat.uniforms.uTime.value += d;
  });
  return <mesh geometry={geo} material={mat} renderOrder={10} frustumCulled={false} />;
}

/** Fixture bodies + glowing faces + their light shafts (bodies and faces merged). */
export function LightRigs({ shafts }: { shafts: boolean }) {
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#202328', metalness: 0.8, roughness: 0.4 }), []);
  const face = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4e2').multiplyScalar(6), toneMapped: false }), []);
  const { bodyGeo, faceGeo, beams } = useMemo(() => {
    const bodies: Part[] = [];
    const faces: Part[] = [];
    const beams: { from: THREE.Vector3; to: THREE.Vector3 }[] = [];
    const down = new THREE.Vector3(0, -1, 0);
    for (const p of FIXTURES) {
      const from = new THREE.Vector3(...p);
      const aim = new THREE.Vector3(p[0] * 0.25, 0, p[2] * 0.9);
      const look = new THREE.Quaternion().setFromUnitVectors(down, aim.clone().sub(from).normalize());
      const parent = new THREE.Matrix4().compose(from, look, new THREE.Vector3(1, 1, 1));
      bodies.push({ geo: new RoundedBoxGeometry(0.9, 0.16, 0.5, 3, 0.04), parent });
      // Hanger rods
      for (const x of [-0.35, 0.35]) bodies.push({ geo: new THREE.CylinderGeometry(0.012, 0.012, 1.8, 6), position: [x, 0.9, 0], parent });
      faces.push({ geo: new THREE.PlaneGeometry(0.8, 0.4), position: [0, -0.085, 0], rotation: [Math.PI / 2, 0, 0], parent });
      beams.push({ from, to: aim });
    }
    return { bodyGeo: bake(bodies), faceGeo: bake(faces), beams };
  }, []);
  return (
    <group>
      <mesh geometry={bodyGeo} material={body} />
      <mesh geometry={faceGeo} material={face} />
      {shafts && <Beams shafts={beams} radius={2.4} intensity={0.22} />}
    </group>
  );
}

/** Courtside LED advertising boards at both ends. */
export function PerimeterBoards({ fps, still }: { fps: number; still: boolean }) {
  const panels = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const tex = useScreen(createPerimeterBoard, fps, still, panels);
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0e10', metalness: 0.6, roughness: 0.5 }), []);
  const boards: { pos: [number, number, number]; rot: number }[] = [
    { pos: [-3.4, 0, -9.0], rot: 0 },
    { pos: [3.4, 0, -9.0], rot: 0 },
  ];
  return (
    <group>
      {boards.map((b, i) => (
        <group key={i} position={b.pos} rotation={[0, b.rot, 0]}>
          {/* Leaning A-frame board, 6.6 m × 0.9 m */}
          <group rotation={[-0.18, 0, 0]} position={[0, 0.47, 0]}>
            <mesh material={frame} castShadow receiveShadow>
              <boxGeometry args={[6.7, 0.96, 0.08]} />
            </mesh>
            <mesh ref={panels[i]} position={[0, 0, 0.041]}>
              <planeGeometry args={[6.6, 0.88]} />
              <meshBasicMaterial map={tex} toneMapped={false} color={[1.6, 1.6, 1.6]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Keep a light's target in the scene graph so it can be aimed. */
export function useAimedLight<T extends THREE.SpotLight | THREE.DirectionalLight>(target: [number, number, number]) {
  const ref = useRef<T>(null);
  const { scene } = useThree();
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.target.position.set(...target);
    scene.add(l.target);
    return () => {
      scene.remove(l.target);
    };
  }, [scene, target]);
  return ref;
}

const dustVert = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.11 + aSeed * 6.28) * 0.35;
    p.y += sin(uTime * 0.07 + aSeed * 12.0) * 0.25;
    p.z += cos(uTime * 0.09 + aSeed * 3.0) * 0.35;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uScale * (0.6 + aSeed) / max(-mv.z, 0.5);
    vA = 0.35 + 0.65 * fract(aSeed * 7.13);
  }
`;
const dustFrag = /* glsl */ `
  varying float vA;
  void main() {
    // Soft round mote; bounded (no division) so it can never produce Inf/NaN for bloom.
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a *= a * vA * 0.5;
    gl_FragColor = vec4(vec3(1.0, 0.93, 0.82) * a, a);
  }
`;

/** Dust drifting through the light shafts (high tier). */
export function Dust({ count = 420, still }: { count?: number; still: boolean }) {
  const { gl } = useThree();
  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Mostly inside the shafts beside the court.
      const f = FIXTURES[i % FIXTURES.length];
      const h = Math.random();
      pos[i * 3] = THREE.MathUtils.lerp(f[0], f[0] * 0.25, h) + (Math.random() - 0.5) * 2.2 * h;
      pos[i * 3 + 1] = f[1] * (1 - h) + 0.4;
      pos[i * 3 + 2] = THREE.MathUtils.lerp(f[2], f[2] * 0.9, h) + (Math.random() - 0.5) * 2.2 * h;
      seed[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale: { value: 26 * gl.getPixelRatio() } },
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo: g, mat: m };
  }, [count, gl]);
  useFrame((_, d) => {
    if (!still) mat.uniforms.uTime.value += d;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={11} />;
}
