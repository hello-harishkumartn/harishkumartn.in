import { useEffect, useState } from 'react';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export type Tier = 'high' | 'low';

export interface DeviceProfile {
  /** User prefers reduced motion → no idle animation, no scroll camera path. */
  reducedMotion: boolean;
  /** `low` on phones / touch / weak CPUs or little RAM: fewer post effects, smaller textures. `?tier=low|high` overrides. */
  tier: Tier;
}

/** Hardware hints that don't change while the page is open. */
const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }) : undefined;
const weakCpu = (nav?.hardwareConcurrency ?? 8) <= 4;
const lowMemory = (nav?.deviceMemory ?? 8) <= 4;
/** Data saver on: skip prefetching optional chunks. */
export const saveData = !!nav?.connection?.saveData;

export function useDeviceProfile(): DeviceProfile {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const small = useMediaQuery('(max-width: 720px)');
  const coarse = useMediaQuery('(pointer: coarse)');
  const forced = new URLSearchParams(window.location.search).get('tier');
  const tier: Tier = forced === 'low' || forced === 'high' ? forced : small || coarse || weakCpu || lowMemory ? 'low' : 'high';
  return { reducedMotion, tier };
}
