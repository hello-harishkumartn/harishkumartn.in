import {
  Armchair,
  BookOpen,
  Briefcase,
  CandlestickChart,
  Clapperboard,
  Feather,
  Globe2,
  GraduationCap,
  Laptop,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

/** SVG icons for each scene hotspot (content.ts keeps its emoji for plain-text use). */
export const hotspotIcons: Record<string, LucideIcon> = {
  // The Court
  scoreboard: Briefcase,
  bench: Armchair,
  screen: Clapperboard,
  ticker: CandlestickChart,
  chalkboard: Lightbulb,
  bookshelf: BookOpen,
  // Study Desk
  laptop: Laptop,
  chart: CandlestickChart,
  racket: Feather,
  books: GraduationCap,
  // Both
  globe: Globe2,
};
