import type { SectionId } from '../content';

export function scrollToSection(id: SectionId, smooth = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  history.replaceState(null, '', id === 'home' ? location.pathname : `#${id}`);
}
