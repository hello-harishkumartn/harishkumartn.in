import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createChartScreen, createCodeScreen, type ScreenPainter } from './screens';

/** Shared aluminium + glass materials (physically based, lit by the HDRI). */
function useMaterials() {
  return useMemo(
    () => ({
      alu: new THREE.MeshPhysicalMaterial({ color: '#8d9096', metalness: 1, roughness: 0.34, clearcoat: 0.15 }),
      aluDark: new THREE.MeshPhysicalMaterial({ color: '#3b3d42', metalness: 1, roughness: 0.38 }),
      keys: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.62 }),
      bezel: new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#000000',
        roughness: 0.06,
        metalness: 0,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
      plastic: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.55 }),
    }),
    [],
  );
}

/** Repaint a screen at a capped rate; once only under reduced motion. */
function useScreen(factory: () => ScreenPainter, fps: number, still: boolean) {
  const screen = useMemo(factory, [factory]);
  useEffect(() => {
    screen.paint(4);
    return () => screen.dispose();
  }, [screen]);
  const acc = useMemo(() => ({ t: 0, since: 0 }), []);
  useFrame((_, delta) => {
    if (still) return;
    acc.t += delta;
    acc.since += delta;
    if (acc.since < 1 / fps) return;
    acc.since = 0;
    screen.paint(acc.t + 4);
  });
  return screen.texture;
}

interface ScreenProps {
  fps: number;
  still: boolean;
}

const W = 0.312;
const D = 0.221;
const BASE_H = 0.0155;
const LID_H = 0.212;

export function Laptop({ fps, still }: ScreenProps) {
  const m = useMaterials();
  const tex = useScreen(createCodeScreen, fps, still);

  // Keyboard: one instanced mesh for all keys.
  const keys = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.0158, 0.0012, 0.0152);
    const mesh = new THREE.InstancedMesh(geo, m.keys, 6 * 14);
    const mat = new THREE.Matrix4();
    let n = 0;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 14; c++) {
        if (r === 5 && c > 3 && c < 10) continue; // space bar gap
        const x = -0.1235 + c * 0.019;
        const z = -0.088 + r * (r === 0 ? 0.016 : 0.0188) + (r > 0 ? -0.003 : 0);
        mat.makeScale(1, 1, r === 0 ? 0.6 : 1);
        mat.setPosition(x, BASE_H + 0.0004, z);
        mesh.setMatrixAt(n++, mat);
      }
    }
    mesh.count = n;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  }, [m.keys]);

  return (
    <group>
      {/* Base */}
      <RoundedBox args={[W, BASE_H, D]} radius={0.006} smoothness={5} position={[0, BASE_H / 2, 0]} material={m.alu} castShadow receiveShadow />
      <primitive object={keys} />
      <mesh position={[0, BASE_H + 0.0004, -0.0045 + 5 * 0.0188 - 0.088 - 0.003]} material={m.keys} receiveShadow>
        <boxGeometry args={[0.112, 0.0012, 0.0152]} />
      </mesh>
      {/* Trackpad */}
      <RoundedBox args={[0.13, 0.0006, 0.078]} radius={0.0003} smoothness={2} position={[0, BASE_H, 0.066]} receiveShadow>
        <meshPhysicalMaterial color="#7d8086" metalness={0.9} roughness={0.2} />
      </RoundedBox>
      {/* Lid, hinged at the back edge, opened ~110° */}
      <group position={[0, BASE_H, -D / 2 + 0.004]} rotation={[-0.33, 0, 0]}>
        <RoundedBox args={[W, LID_H, 0.0055]} radius={0.0027} smoothness={4} position={[0, LID_H / 2, -0.0028]} material={m.alu} castShadow receiveShadow />
        <mesh position={[0, LID_H / 2, 0.00005]} material={m.bezel}>
          <planeGeometry args={[W - 0.006, LID_H - 0.006]} />
        </mesh>
        <mesh position={[0, LID_H / 2 + 0.003, 0.0002]}>
          <planeGeometry args={[W - 0.018, LID_H - 0.024]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, LID_H / 2, 0.0004]} material={m.glass}>
          <planeGeometry args={[W - 0.006, LID_H - 0.006]} />
        </mesh>
      </group>
    </group>
  );
}

export function Monitor({ fps, still }: ScreenProps) {
  const m = useMaterials();
  const tex = useScreen(createChartScreen, fps, still);
  const PW = 0.545;
  const PH = 0.318;
  const cy = 0.335;
  return (
    <group>
      {/* Stand base and neck */}
      <RoundedBox args={[0.23, 0.009, 0.17]} radius={0.004} smoothness={4} position={[0, 0.0045, 0.01]} material={m.alu} castShadow receiveShadow />
      <group position={[0, 0.009, -0.035]} rotation={[-0.12, 0, 0]}>
        <RoundedBox args={[0.065, 0.29, 0.014]} radius={0.006} smoothness={4} position={[0, 0.145, 0]} material={m.alu} castShadow receiveShadow />
      </group>
      {/* Panel */}
      <group position={[0, cy, -0.012]} rotation={[-0.05, 0, 0]}>
        <RoundedBox args={[PW, PH, 0.011]} radius={0.004} smoothness={4} material={m.bezel} castShadow receiveShadow />
        <RoundedBox args={[PW * 0.92, PH * 0.86, 0.03]} radius={0.012} smoothness={4} position={[0, 0, -0.016]} material={m.alu} castShadow />
        <mesh position={[0, 0.006, 0.0058]}>
          <planeGeometry args={[PW - 0.016, PH - 0.032]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.006]} material={m.glass}>
          <planeGeometry args={[PW - 0.004, PH - 0.004]} />
        </mesh>
      </group>
    </group>
  );
}
