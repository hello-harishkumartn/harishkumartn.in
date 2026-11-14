import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { hotspotIcons } from '@/lib/icons';

interface HotspotProps {
  id: string;
  label: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Where the hover label floats, relative to the group. */
  labelOffset?: [number, number, number];
  active?: boolean;
  /** Hide the hover label (e.g. while the camera is focused elsewhere). */
  quiet?: boolean;
  /** How far the object rises on hover (metres; scale it to the scene). */
  lift?: number;
  onSelect: () => void;
  /** Reports hover so the scene can outline the object. */
  onHover: (obj: THREE.Object3D | null) => void;
  children: ReactNode;
}

/**
 * Wraps a clickable 3D object: pointer cursor, a gentle lift on hover, a floating
 * label, and hover reporting (the scene draws a post-processed outline around it).
 */
export function Hotspot({
  id,
  label,
  position,
  rotation,
  labelOffset = [0, 0.25, 0],
  active = false,
  quiet = false,
  lift = 0.012,
  onSelect,
  onHover,
  children,
}: HotspotProps) {
  const [hovered, setHovered] = useState(false);
  const group = useRef<THREE.Group>(null);
  const hit = useRef<THREE.Mesh>(null);
  const Icon = hotspotIcons[id];

  // Pointer picking against one invisible box around the object instead of every
  // triangle inside it (the props are tens of thousands of triangles; R3F raycasts on
  // every pointer move).
  useLayoutEffect(() => {
    const g = group.current;
    const h = hit.current;
    if (!g || !h) return;
    g.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const m = new THREE.Matrix4();
    const box = new THREE.Box3();
    const part = new THREE.Box3();
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(part.copy(mesh.geometry.boundingBox!).applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld)));
      mesh.raycast = () => {};
    });
    if (box.isEmpty()) return;
    box.getCenter(h.position);
    box.getSize(h.scale).max(new THREE.Vector3(0.05, 0.05, 0.05));
  }, []);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const k = 1 - Math.exp(-delta * 8);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, hovered && !active ? lift : 0, k);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover(group.current);
  };
  const out = () => {
    setHovered(false);
    onHover(null);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group position={position} rotation={rotation}>
      <group ref={group} name={`hotspot-${id}`}>
        {children}
      </group>
      <mesh ref={hit} onPointerOver={over} onPointerOut={out} onClick={click}>
        <boxGeometry />
        <meshBasicMaterial visible={false} />
      </mesh>
      {hovered && !quiet && !active && (
        <Html position={labelOffset} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="scene-tooltip">
            {Icon && <Icon aria-hidden className="size-3.5" />}
            {label}
            <span className="opacity-60">· click</span>
          </div>
        </Html>
      )}
    </group>
  );
}
