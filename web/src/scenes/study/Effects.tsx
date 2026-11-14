import { useFrame } from '@react-three/fiber';
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  N8AO,
  Noise,
  Outline,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize, ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Tier } from '../types';

interface Props {
  tier: Tier;
  degraded: boolean;
  /** Object under the pointer → soft warm outline. */
  hovered: THREE.Object3D | null;
  /** Focus point for depth of field (null = gentle background-only blur). */
  focusTarget: THREE.Vector3 | null;
}

/**
 * Post stack. High tier: N8AO + DoF + outline + bloom + grain + vignette, AgX tone mapping.
 * Low tier (phones) or runtime-degraded: no AO, no DoF.
 */
export default function Effects({ tier, degraded, hovered, focusTarget }: Props) {
  const rich = tier === 'high' && !degraded;
  const dof = useRef<DepthOfFieldEffect>(null);
  const target = useRef(new THREE.Vector3(0, 0.15, -0.1));
  const scale = useRef(0);

  useFrame(({ camera }, delta) => {
    const d = dof.current;
    if (!d) return;
    const goal = focusTarget ?? camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.4).add(camera.position);
    target.current.lerp(goal, 1 - Math.exp(-delta * 4));
    d.target = target.current;
    scale.current = THREE.MathUtils.lerp(scale.current, focusTarget ? 4.5 : 1.2, 1 - Math.exp(-delta * 2.5));
    d.bokehScale = scale.current;
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false} autoClear={false}>
      <>{rich && <N8AO aoRadius={0.12} distanceFalloff={0.6} intensity={2.2} quality="medium" halfRes color="#120a04" />}</>
      <>{rich && <DepthOfField ref={dof} worldFocusRange={0.35} bokehScale={1.2} resolutionScale={0.5} />}</>
      <>
        {tier === 'high' && (
          <Outline
            selection={hovered ? [hovered] : []}
            visibleEdgeColor={0xffb36b}
            hiddenEdgeColor={0x6b3a12}
            edgeStrength={9}
            blur
            kernelSize={KernelSize.SMALL}
            xRay={false}
          />
        )}
      </>
      <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={rich ? 0.7 : 0.5} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.28} />
      <Vignette offset={0.28} darkness={0.62} />
    </EffectComposer>
  );
}
