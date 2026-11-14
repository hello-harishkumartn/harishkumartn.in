import { RoundedBox, useGLTF, useTexture } from '@react-three/drei';
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Tier } from '../types';
import { asset } from './assets';
import { plasterTexture } from './textures';

export { Mortarboard } from '../shared/Mortarboard';

export const DESK = { w: 2.0, d: 0.95, t: 0.045, backZ: -0.475 };

/** Enable shadows on every mesh of a loaded glTF and tune material response. */
function prep(scene: THREE.Object3D, receive = true) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = receive;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1;
  });
}

function useModel(name: string) {
  const gltf = useGLTF(asset(`models/${name}.glb`));
  useLayoutEffect(() => prep(gltf.scene), [gltf.scene]);
  return gltf;
}

/** Pick one named node out of a glTF set, reset to the origin. */
function useNode(name: string, node: string) {
  const { scene } = useModel(name);
  return useMemo(() => {
    const o = scene.getObjectByName(node)!.clone(true);
    o.position.set(0, 0, 0);
    o.quaternion.identity();
    return o;
  }, [scene, node]);
}

export function Desk({ tier }: { tier: Tier }) {
  const res = tier === 'low' ? 1024 : 2048;
  const [map, normalMap, arm] = useTexture([
    asset(`textures/wood_diff_${res}.webp`),
    asset(`textures/wood_nor_${res}.webp`),
    asset(`textures/wood_arm_${res}.webp`),
  ]);
  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    [map, normalMap, arm].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1.4, 0.7);
      t.anisotropy = 16;
      t.needsUpdate = true;
    });
  }, [map, normalMap, arm]);
  const plaster = useMemo(plasterTexture, []);

  return (
    <group>
      <RoundedBox args={[DESK.w, DESK.t, DESK.d]} radius={0.012} smoothness={6} position={[0, -DESK.t / 2, 0]} receiveShadow castShadow>
        <meshPhysicalMaterial
          map={map}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          roughnessMap={arm}
          aoMap={arm}
          metalness={0}
          roughness={1}
          color="#c9b6a2"
          clearcoat={0.35}
          clearcoatRoughness={0.28}
        />
      </RoundedBox>
      {/* Steel legs (mostly out of frame) */}
      {[-0.9, 0.9].map((x) => (
        <RoundedBox key={x} args={[0.05, 0.72, 0.8]} radius={0.01} position={[x, -DESK.t - 0.36, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#1b1b1d" metalness={0.8} roughness={0.45} />
        </RoundedBox>
      ))}
      {/* Wall */}
      <mesh position={[0, 0.6, DESK.backZ - 0.03]} receiveShadow>
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial color="#3a332d" roughness={0.95} bumpMap={plaster} bumpScale={0.6} />
      </mesh>
      {/* Floor far below, catches a bit of bounce so the void isn't pure black */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.76, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#17130f" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function DeskLamp() {
  const { scene } = useModel('desk-lamp');
  useLayoutEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.Material).name.includes('light')) {
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        mat.emissive = new THREE.Color('#ffd9a0');
        mat.emissiveIntensity = 2.5;
        m.material = mat;
        m.castShadow = false;
      }
    });
  }, [scene]);
  return <primitive object={scene} />;
}

export function Plant() {
  return <primitive object={useModel('plant').scene} />;
}
export function CameraProp() {
  return <primitive object={useModel('camera').scene} />;
}
export function Compass() {
  return <primitive object={useModel('compass').scene} />;
}
export function Spectacles() {
  return <primitive object={useModel('spectacles').scene} />;
}

export function PencilCup() {
  const cup = useNode('stationery', 'stationery_supplies_pencilcup');
  const pen = useNode('stationery', 'stationery_supplies_pen_fancy');
  const pencil = useNode('stationery', 'stationery_supplies_pencil_new_a');
  const pencil2 = useNode('stationery', 'stationery_supplies_pencil_used');
  return (
    <group>
      <primitive object={cup} />
      {/* Pens standing in the cup: the source models lie along X. */}
      <primitive object={pen} position={[0.004, 0.075, 0.003]} rotation={[0.1, 0.3, Math.PI / 2 - 0.12]} />
      <primitive object={pencil} position={[-0.006, 0.07, -0.004]} rotation={[-0.08, 0, Math.PI / 2 + 0.1]} />
      <primitive object={pencil2} position={[0.001, 0.06, 0.008]} rotation={[0.14, 0.8, Math.PI / 2 + 0.05]} />
    </group>
  );
}

export function Postcards() {
  const cards = ['postcard_03', 'postcard_07', 'postcard_14'].map((n) => useNode('postcards', n));
  return (
    <group>
      {cards.map((c, i) => (
        // The source cards stand upright; lay them flat and fan them out.
        <group key={i} position={[i * 0.05, 0.0012 + i * 0.0008, i * 0.025]} rotation={[0, 0.35 - i * 0.32, 0]}>
          <primitive object={c} rotation={[0, 0, 0]} />
        </group>
      ))}
    </group>
  );
}

export function Books() {
  const names = ['01', '02', '03', '05', '08', '13', '14'].map((n) => `book_encyclopedia_set_01_book${n}`);
  const books = names.map((n) => useNode('books', n));
  // Lay the books out in a row once (measuring each at the origin).
  const row = useMemo(() => {
    let x = 0;
    return books.map((b, i) => {
      b.position.set(0, 0, 0);
      b.rotation.set(0, 0, 0);
      b.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(b);
      const pos = x - bb.min.x;
      x += bb.max.x - bb.min.x + 0.0015;
      return { b, pos, lean: i === books.length - 1 ? -0.22 : 0 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, books);
  return (
    <group>
      {row.map(({ b, pos, lean }, i) => (
        <primitive key={i} object={b} position={[pos, 0, 0]} rotation={[0, 0, lean]} />
      ))}
    </group>
  );
}

export function Notebook() {
  const nb = useNode('notebook', 'binder_notebook_closed');
  return <primitive object={nb} />;
}

const MODELS = ['desk-lamp', 'plant', 'camera', 'compass', 'spectacles', 'stationery', 'postcards', 'books', 'notebook'];
MODELS.forEach((m) => useGLTF.preload(asset(`models/${m}.glb`)));
