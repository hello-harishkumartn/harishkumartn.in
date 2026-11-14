import type { ThreeElements } from '@react-three/fiber';
import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { featherTexture, gripTexture, stringsTexture } from './textures';

const HEAD_A = 0.1; // half width
const HEAD_B = 0.118; // half length
const SHAFT_TOP = 0.43;
const HEAD_CY = SHAFT_TOP + 0.035 + HEAD_B;

/** Racket materials and geometry are built once and shared by every racket in the scene. */
let materials: ReturnType<typeof buildMaterials> | null = null;
let geometries: ReturnType<typeof buildGeometries> | null = null;
const racketMaterials = () => (materials ??= buildMaterials());
const racketGeometries = () => (geometries ??= buildGeometries());

function buildMaterials() {
  const grip = gripTexture();
  grip.repeat.set(3, 6);
  const strings = stringsTexture();
  return {
    frame: new THREE.MeshPhysicalMaterial({
      color: '#14161c',
      metalness: 0.4,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    }),
    accent: new THREE.MeshPhysicalMaterial({ color: '#e8561b', metalness: 0.3, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }),
    shaft: new THREE.MeshPhysicalMaterial({ color: '#1f232b', metalness: 0.6, roughness: 0.22, clearcoat: 1 }),
    grip: new THREE.MeshPhysicalMaterial({
      color: '#f1ece2',
      roughness: 0.85,
      bumpMap: grip,
      bumpScale: 1.4,
      sheen: 0.5,
      sheenColor: new THREE.Color('#ffffff'),
    }),
    strings: new THREE.MeshStandardMaterial({
      map: strings,
      alphaMap: strings,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.5,
    }),
    cap: new THREE.MeshPhysicalMaterial({ color: '#1a1a1a', roughness: 0.4, clearcoat: 0.6 }),
  };
}

function buildGeometries() {
  // Head: an ellipse slightly squared at the bottom, swept with an oval cross-section.
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const squish = Math.sin(a) < 0 ? 1 - 0.12 * Math.pow(-Math.sin(a), 3) : 1;
    pts.push(new THREE.Vector3(Math.cos(a) * HEAD_A * squish, HEAD_CY + Math.sin(a) * HEAD_B, 0));
  }
  const head = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, 0.0042, 10, true);
  head.scale(1, 1, 1.45);
  // Accent stripe on the outer edge (slightly larger tube, upper half only).
  const accentPts = pts.filter((p) => p.y > HEAD_CY + HEAD_B * 0.35);
  accentPts.sort((a, b) => a.x - b.x);
  const accent = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(accentPts), 80, 0.0045, 10, false);
  accent.scale(1, 1, 0.7);
  // Throat: two curves from the T-joint to the frame.
  const throat = [-1, 1].map((s) => {
    const c = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, SHAFT_TOP, 0),
      new THREE.Vector3(s * 0.012, SHAFT_TOP + 0.03, 0),
      new THREE.Vector3(s * HEAD_A * 0.62, HEAD_CY - HEAD_B * 0.8, 0),
    );
    return new THREE.TubeGeometry(c, 32, 0.0036, 8, false);
  });
  return { head, accent, throat };
}

/**
 * Built along +Y: grip at the bottom, head at the top. ~0.67 m long, like a real racket.
 * `shadows={false}` for moving copies (the rally) so they never force a shadow-map redraw.
 */
export function Racket({ shadows = true }: { shadows?: boolean }) {
  const mats = useMemo(racketMaterials, []);
  const geos = useMemo(racketGeometries, []);

  return (
    <group>
      <mesh geometry={geos.head} material={mats.frame} castShadow={shadows} receiveShadow />
      <mesh geometry={geos.accent} material={mats.accent} castShadow={shadows} />
      {geos.throat.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.frame} castShadow={shadows} />
      ))}
      {/* String bed */}
      <mesh position={[0, HEAD_CY, 0]} material={mats.strings}>
        <planeGeometry args={[HEAD_A * 2 * 0.97, HEAD_B * 2 * 0.97]} />
      </mesh>
      {/* Shaft */}
      <mesh position={[0, 0.2 + (SHAFT_TOP - 0.2) / 2, 0]} material={mats.shaft} castShadow={shadows}>
        <cylinderGeometry args={[0.0036, 0.0042, SHAFT_TOP - 0.2, 16]} />
      </mesh>
      {/* Ferrule + grip + butt cap */}
      <mesh position={[0, 0.212, 0]} material={mats.cap} castShadow={shadows}>
        <cylinderGeometry args={[0.0045, 0.012, 0.024, 24]} />
      </mesh>
      <mesh position={[0, 0.1, 0]} material={mats.grip} castShadow={shadows} receiveShadow>
        <cylinderGeometry args={[0.0128, 0.0138, 0.19, 24, 1]} />
      </mesh>
      <mesh position={[0, 0.0035, 0]} material={mats.cap} castShadow={shadows}>
        <cylinderGeometry args={[0.0142, 0.0136, 0.008, 24]} />
      </mesh>
    </group>
  );
}

/** Shuttle geometry along +Y with the cork at the origin (cork-first = -Y). Length ≈ 0.085 m. */
export const SHUTTLE = { corkR: 0.0128, skirtLen: 0.066, skirtR: 0.033 };

export const ShuttleMesh = forwardRef<THREE.Group, ThreeElements['group'] & { shadows?: boolean }>(function ShuttleMesh({ shadows = true, ...props }, ref) {
  const { corkGeo, skirtGeo, mats } = useMemo(() => {
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = -Math.PI / 2 + (i / 16) * (Math.PI / 2);
      prof.push(new THREE.Vector2(Math.cos(a) * SHUTTLE.corkR, Math.sin(a) * SHUTTLE.corkR));
    }
    prof.push(new THREE.Vector2(SHUTTLE.corkR, 0.012));
    prof.push(new THREE.Vector2(SHUTTLE.corkR * 0.92, 0.0135));
    prof.push(new THREE.Vector2(0, 0.0135));
    const cork = new THREE.LatheGeometry(prof, 48);
    const skirt = new THREE.CylinderGeometry(SHUTTLE.skirtR, SHUTTLE.corkR * 0.82, SHUTTLE.skirtLen, 64, 1, true);
    skirt.translate(0, 0.012 + SHUTTLE.skirtLen / 2, 0);
    const feathers = featherTexture();
    return {
      corkGeo: cork,
      skirtGeo: skirt,
      mats: {
        cork: new THREE.MeshPhysicalMaterial({ color: '#f4f1ea', roughness: 0.45, clearcoat: 0.4, sheen: 0.4 }),
        band: new THREE.MeshPhysicalMaterial({ color: '#e8561b', roughness: 0.4 }),
        feather: new THREE.MeshPhysicalMaterial({
          map: feathers,
          alphaMap: feathers,
          alphaTest: 0.4,
          side: THREE.DoubleSide,
          roughness: 0.75,
          sheen: 0.6,
          sheenColor: new THREE.Color('#ffffff'),
        }),
        thread: new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.9 }),
      },
    };
  }, []);
  // CylinderGeometry UVs flip v; feathers are drawn narrow-at-cork at v=0, so flip back.
  useMemo(() => {
    const uv = skirtGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  }, [skirtGeo]);

  return (
    <group ref={ref} {...props}>
      <mesh geometry={corkGeo} material={mats.cork} castShadow={shadows} receiveShadow />
      <mesh position={[0, 0.0105, 0]} material={mats.band}>
        <cylinderGeometry args={[SHUTTLE.corkR * 1.004, SHUTTLE.corkR * 1.004, 0.003, 48, 1, true]} />
      </mesh>
      <mesh geometry={skirtGeo} material={mats.feather} castShadow={shadows} />
      {[0.03, 0.045].map((y) => {
        const r = SHUTTLE.corkR * 0.82 + ((y - 0.012) / SHUTTLE.skirtLen) * (SHUTTLE.skirtR - SHUTTLE.corkR * 0.82);
        return (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.thread}>
            <torusGeometry args={[r, 0.0007, 6, 64]} />
          </mesh>
        );
      })}
    </group>
  );
});
