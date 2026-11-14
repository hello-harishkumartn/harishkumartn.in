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
  hovered: THREE.Object3D | null;
  /** Focus point for depth of field (null = focus ~where the camera looks). */
  focusTarget: THREE.Vector3 | null;
  /** Rally in progress: keep the whole court sharp. */
  playing: boolean;
}

/**
 * Arena post stack. High tier: N8AO + DoF + hover outline + bloom (LED boards, fixtures)
 * + film grain + vignette, AgX tone mapping. High tier degraded: no AO, no DoF.
 * Low tier: no AO, no DoF, no outline, a shallower bloom chain and no film grain.
 * Low tier + degraded: tone mapping and vignette only. Effects are toggled inside one
 * composer (no remount), so a downgrade rebuilds the merged effect pass instead of
 * recompiling every material.
 */
export default function Effects({ tier, degraded, hovered, focusTarget, playing }: Props) {
  const rich = tier === 'high' && !degraded;
  const bare = tier === 'low' && degraded;
  const dof = useRef<DepthOfFieldEffect>(null);
  const target = useRef(new THREE.Vector3(0, 1, 0));
  const scale = useRef(0);
  const ahead = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    const d = dof.current;
    if (!d) return;
    // Unfocused: keep the court sharp (focus at the court's distance along the view).
    const far = playing ? 6 : camera.position.length();
    const goal = focusTarget ?? camera.getWorldDirection(ahead.current).multiplyScalar(far).add(camera.position);
    target.current.lerp(goal, 1 - Math.exp(-delta * 4));
    d.target = target.current;
    scale.current = THREE.MathUtils.lerp(scale.current, playing ? 0.4 : focusTarget ? 4 : 0.9, 1 - Math.exp(-delta * 2.5));
    d.bokehScale = scale.current;
    // Wide shots keep the whole court in focus; close-ups get a shallow field.
    d.cocMaterial.worldFocusRange = THREE.MathUtils.lerp(d.cocMaterial.worldFocusRange, focusTarget ? 2.5 : 16, 1 - Math.exp(-delta * 2.5));
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false} autoClear={false}>
      <>{rich && <N8AO aoRadius={0.9} distanceFalloff={1.2} intensity={2.4} quality="medium" halfRes color="#05070a" />}</>
      <>{rich && <DepthOfField ref={dof} worldFocusDistance={9} worldFocusRange={5} bokehScale={1.6} resolutionScale={0.5} />}</>
      <>
        {tier === 'high' && (
          <Outline
            selection={hovered ? [hovered] : []}
            visibleEdgeColor={0xffb36b}
            hiddenEdgeColor={0x6b3a12}
            edgeStrength={8}
            blur
            kernelSize={KernelSize.SMALL}
            xRay={false}
          />
        )}
      </>
      <>{!bare && <Bloom mipmapBlur levels={tier === 'high' ? 8 : 5} luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={rich ? 0.9 : 0.65} radius={0.75} />}</>
      <ToneMapping mode={ToneMappingMode.AGX} />
      <>{!bare && <SMAA />}</>
      <>{tier === 'high' && <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.32} />}</>
      <Vignette offset={0.25} darkness={0.7} />
    </EffectComposer>
  );
}
