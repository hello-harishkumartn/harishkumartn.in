import { Html, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { asset } from './assets';

export const GLOBE_R = 0.12;
const AXIS_TILT = THREE.MathUtils.degToRad(23.4);

/** Places that matter on the journey (labels only; no content claims beyond content.ts). */
type PinSide = 'left' | 'right' | 'below';
export const PINS: { id: string; label: string; lat: number; lon: number; side: PinSide }[] = [
  { id: 'blr', label: 'Bengaluru', lat: 12.97, lon: 77.59, side: 'left' },
  { id: 'maa', label: 'Chennai · IIT Madras', lat: 12.99, lon: 80.23, side: 'below' },
  { id: 'lon', label: 'London · UCL', lat: 51.52, lon: -0.13, side: 'right' },
];

/** lat/lon → point on a sphere matching three's SphereGeometry UV layout. */
export function latLon(lat: number, lon: number, r: number) {
  const phi = THREE.MathUtils.degToRad(lat);
  const lam = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(phi) * Math.cos(lam), r * Math.sin(phi), -r * Math.cos(phi) * Math.sin(lam));
}

interface Props {
  focused: boolean;
  still: boolean;
  /** Geometry / texture detail: 1 = full, 0.5 = phones (half the segments, 1k map). */
  detail?: number;
}

export function Globe({ focused, still, detail = 1 }: Props) {
  const earth = useTexture(asset(detail < 1 ? 'textures/earth_1024.webp' : 'textures/earth_2048.webp'));
  earth.colorSpace = THREE.SRGBColorSpace;
  earth.anisotropy = 8;

  const spin = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const arcs = useRef<THREE.Mesh[]>([]);
  const halos = useRef<THREE.Mesh[]>([]);
  const t = useRef(0);

  const brass = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: '#c8a064', metalness: 1, roughness: 0.28, clearcoat: 0.3 }),
    [],
  );
  const wood = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#3a2216', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }), []);

  const baseGeo = useMemo(() => {
    const pts = [
      [0, 0],
      [0.072, 0],
      [0.074, 0.004],
      [0.071, 0.012],
      [0.05, 0.018],
      [0.022, 0.026],
      [0.012, 0.045],
      [0.009, 0.06],
      [0, 0.062],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 96);
  }, []);

  const pinPts = useMemo(() => PINS.map((p) => latLon(p.lat, p.lon, GLOBE_R * 1.004)), []);
  const pinQuats = useMemo(() => pinPts.map((p) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize())), [pinPts]);
  const arcGeos = useMemo(() => {
    const london = pinPts[2];
    return [pinPts[0], pinPts[1]].map((from) => {
      const mid = from.clone().add(london).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_R * 1.32);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, london);
      return new THREE.TubeGeometry(curve, 96, 0.0006, 6, false);
    });
  }, [pinPts]);

  // Rotation that faces longitude ~45°E (between London and India) toward the camera.
  const faceY = THREE.MathUtils.degToRad(-90 - 45);

  useFrame((_, delta) => {
    t.current += delta;
    const k = 1 - Math.exp(-delta * 3);
    if (spin.current) {
      if (focused) {
        // Ease to the nearest equivalent of faceY.
        const r = spin.current.rotation.y;
        const target = faceY + Math.round((r - faceY) / (Math.PI * 2)) * Math.PI * 2;
        spin.current.rotation.y = THREE.MathUtils.lerp(r, target, still ? 1 : k);
      } else if (!still) {
        spin.current.rotation.y += delta * 0.12;
      }
    }
    if (lift.current) {
      const s = THREE.MathUtils.lerp(lift.current.scale.x, focused ? 1.18 : 1, still ? 1 : k);
      lift.current.scale.setScalar(s);
    }
    // Arcs draw in on focus.
    arcs.current.forEach((m) => {
      if (!m) return;
      const geo = m.geometry as THREE.TubeGeometry;
      const total = geo.index ? geo.index.count : 0;
      const cur = (m.userData.draw ?? 0) as number;
      const next = THREE.MathUtils.lerp(cur, focused ? 1 : 0.0, still ? 1 : 1 - Math.exp(-delta * 1.6));
      m.userData.draw = next;
      geo.setDrawRange(0, Math.floor((total * next) / 6) * 6);
    });
    halos.current.forEach((m, i) => {
      if (!m) return;
      const s = 1 + ((t.current * 0.8 + i * 0.33) % 1) * 1.3;
      m.scale.setScalar(s);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - (s - 1) / 1.3);
    });
  });

  const globeY = 0.062 + GLOBE_R + 0.012;

  return (
    <group>
      <mesh geometry={baseGeo} material={wood} castShadow receiveShadow />
      <group ref={lift} position={[0, 0.062, 0]}>
        <group position={[0, globeY - 0.062, 0]} rotation={[0, 0, AXIS_TILT]}>
          {/* Meridian half-ring */}
          <mesh rotation={[0, 0, Math.PI / 2]} material={brass} castShadow>
            <torusGeometry args={[GLOBE_R + 0.008, 0.0028, 12, 128, Math.PI * 1.08]} />
          </mesh>
          <mesh position={[0, GLOBE_R + 0.01, 0]} material={brass}>
            <sphereGeometry args={[0.004, 16, 16]} />
          </mesh>
          <group ref={spin} rotation={[0, faceY + 1.2, 0]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[GLOBE_R, Math.round(128 * detail), Math.round(96 * detail)]} />
              <meshPhysicalMaterial map={earth} roughness={0.5} clearcoat={0.85} clearcoatRoughness={0.12} />
            </mesh>
            {pinPts.map((p, i) => (
              <group key={PINS[i].id} position={p}>
                <mesh>
                  <sphereGeometry args={[0.0032, 16, 16]} />
                  <meshBasicMaterial color={[4, 1.9, 0.6]} toneMapped={false} />
                </mesh>
                <mesh
                  ref={(el) => {
                    if (el) halos.current[i] = el;
                  }}
                  quaternion={pinQuats[i]}
                >
                  <ringGeometry args={[0.004, 0.0052, 32]} />
                  <meshBasicMaterial color={[1.6, 0.75, 0.22]} toneMapped={false} transparent depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
                {focused && (
                  <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                    <div className={`globe-label globe-label-${PINS[i].side}`}>{PINS[i].label}</div>
                  </Html>
                )}
              </group>
            ))}
            {arcGeos.map((g, i) => (
              <mesh
                key={i}
                geometry={g}
                ref={(el) => {
                  if (el) arcs.current[i] = el;
                }}
              >
                <meshBasicMaterial color={[1.8, 0.85, 0.28]} toneMapped={false} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
