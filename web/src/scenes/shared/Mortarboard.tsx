import { RoundedBox } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

/** Graduation cap: fabric board + skull, gold tassel. */
export function Mortarboard() {
  const mats = useMemo(
    () => ({
      fabric: new THREE.MeshPhysicalMaterial({
        color: '#121214',
        roughness: 0.9,
        sheen: 1,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color('#5a5a66'),
      }),
      gold: new THREE.MeshPhysicalMaterial({ color: '#d4a548', roughness: 0.55, metalness: 0.3, sheen: 0.8, sheenColor: new THREE.Color('#ffd27a') }),
    }),
    [],
  );
  const tassel = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.067, 0),
      new THREE.Vector3(0.06, 0.066, 0.05),
      new THREE.Vector3(0.112, 0.064, 0.105),
      new THREE.Vector3(0.118, 0.04, 0.112),
      new THREE.Vector3(0.12, 0.012, 0.114),
    ]);
    return new THREE.TubeGeometry(c, 64, 0.0012, 6, false);
  }, []);
  return (
    <group>
      <mesh position={[0, 0.028, 0]} material={mats.fabric} castShadow receiveShadow>
        <cylinderGeometry args={[0.078, 0.084, 0.056, 64]} />
      </mesh>
      <RoundedBox args={[0.24, 0.006, 0.24]} radius={0.0025} smoothness={3} position={[0, 0.06, 0]} rotation={[0, Math.PI / 4, 0]} material={mats.fabric} castShadow receiveShadow />
      <mesh position={[0, 0.0645, 0]} material={mats.fabric} castShadow>
        <cylinderGeometry args={[0.008, 0.009, 0.004, 24]} />
      </mesh>
      <mesh geometry={tassel} material={mats.gold} castShadow />
      <mesh position={[0.12, 0.0, 0.114]} material={mats.gold} castShadow>
        <cylinderGeometry args={[0.0028, 0.007, 0.03, 16]} />
      </mesh>
    </group>
  );
}
