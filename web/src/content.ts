/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ALL SITE CONTENT LIVES HERE.
 *
 *  Edit text, add photos/videos, add or remove entries — the components render
 *  purely from this file. Anything marked `placeholder: true` shows a visible
 *  "Placeholder" badge on the site; delete that flag once you put real content in.
 *
 *  Media paths are relative to /public, e.g. "media/travel/goa.jpg" means the
 *  file lives at public/media/travel/goa.jpg.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ───────────────────────────── Types ─────────────────────────────

export type SectionId =
  | 'home'
  | 'about'
  | 'work'
  | 'education'
  | 'ideas'
  | 'markets'
  | 'badminton'
  | 'travel'
  | 'social'
  | 'contact';

/** Mix-in for anything that can be a stand-in until real content arrives. */
export interface MaybePlaceholder {
  placeholder?: boolean;
}

export interface NavItem {
  id: SectionId;
  label: string;
}

/** A clickable object in the 3D hero. `id` must match an object the active scene knows about. */
export interface Hotspot {
  id: string;
  label: string;
  section: SectionId;
  emoji: string;
}

export interface Photo extends MaybePlaceholder {
  /** Path under /public, e.g. "media/about/me.jpg". Leave empty to show a generated placeholder. */
  src?: string;
  alt: string;
}

export interface WorkItem {
  org: string;
  role: string;
  period: string;
  current?: boolean;
  summary: string;
  highlights: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  period: string;
  current?: boolean;
  note?: string;
}

export interface Entry extends MaybePlaceholder {
  title: string;
  date?: string;
  body: string;
  tags?: string[];
  link?: string;
}

export interface Video extends MaybePlaceholder {
  title: string;
  caption: string;
  /** YouTube video id (the part after watch?v=). Takes priority over mp4. */
  youtubeId?: string;
  /** Path under /public, e.g. "media/badminton/smash.mp4". */
  mp4?: string;
  /** Optional poster image for mp4, path under /public. */
  poster?: string;
}

export interface TravelStory extends MaybePlaceholder {
  title: string;
  place: string;
  date?: string;
  caption: string;
  /** Path under /public, e.g. "media/travel/trip-1.jpg". Empty = generated gradient art. */
  image?: string;
  /** Two colours used for the generated placeholder art. */
  palette: [string, string];
}

export type SocialPlatform = 'instagram' | 'linkedin' | 'x';

export interface SocialPost extends MaybePlaceholder {
  platform: SocialPlatform;
  /** Public link to the post (opens in a new tab). */
  url?: string;
  /**
   * Optional iframe embed URL. See README.md → "Social highlights" for how to get one.
   * e.g. Instagram: https://www.instagram.com/p/<id>/embed
   *      LinkedIn:  https://www.linkedin.com/embed/feed/update/urn:li:share:<id>
   */
  embedUrl?: string;
  caption: string;
}

export interface ContactLink {
  label: string;
  href: string;
  display: string;
}

// ──────────────────────────── Content ────────────────────────────

/** Typed list helper: checks entries against T but keeps the full T type. */
const list = <T>(items: T[]): T[] => items;

export const site = {
  name: 'Harish Kumar T N',
  shortName: 'Harish',
  monogram: 'HK',
  domain: 'harishkumartn.in',
  url: 'https://harishkumartn.in',
  title: 'Harish Kumar T N · code, markets, badminton & trips',
  description:
    "Hi, I'm Harish. This is my little corner of the internet: what I'm building, what I'm learning about markets, badminton clips and trips with friends.",
  /** Which 3D hero scene to show. See src/scenes/index.ts for the options. */
  scene: 'court' as 'court' | 'study-desk',
};

export const nav: NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'education', label: 'Education' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'markets', label: 'Markets' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'travel', label: 'Travel' },
  { id: 'social', label: 'Highlights' },
  { id: 'contact', label: 'Contact' },
];

/** Hero copy and clickable objects for each 3D scene (see src/scenes/index.ts). */
const heroScenes = {
  court: {
    /** What the visitor is looking at ("Back to the court"). */
    place: 'court',
    intro:
      'Welcome to my court. Everything I care about is somewhere around it. Click on something to poke around, scroll for the tour, or grab a racket and play a rally.',
    hint: 'Hover over things around the court and click to jump in.',
    hintTouch: 'Tap things around the court to jump in.',
    hintOff: 'Pick a spot on the court',
    /** Words that cycle under the greeting. */
    words: ['on court', 'building', 'learning markets', 'travelling', 'studying'],
    hotspots: list<Hotspot>([
      { id: 'scoreboard', label: 'Work', section: 'work', emoji: '💼' },
      { id: 'bench', label: 'About', section: 'about', emoji: '👋' },
      { id: 'screen', label: 'Badminton', section: 'badminton', emoji: '🏸' },
      { id: 'ticker', label: 'Markets', section: 'markets', emoji: '📈' },
      { id: 'chalkboard', label: 'Ideas', section: 'ideas', emoji: '💡' },
      { id: 'bookshelf', label: 'Education', section: 'education', emoji: '🎓' },
      { id: 'globe', label: 'Travel', section: 'travel', emoji: '🌍' },
    ]),
  },
  'study-desk': {
    place: 'desk',
    intro:
      'Welcome to my desk. Everything I care about is lying around on it somewhere. Click on something to poke around, or just scroll.',
    hint: 'Hover over things on the desk and click to jump in.',
    hintTouch: 'Tap things on the desk to jump in.',
    hintOff: 'Pick a corner of the desk',
    words: ['work', 'markets', 'badminton', 'travel', 'education'],
    hotspots: list<Hotspot>([
      { id: 'laptop', label: 'Work', section: 'work', emoji: '💻' },
      { id: 'chart', label: 'Markets', section: 'markets', emoji: '📈' },
      { id: 'racket', label: 'Badminton', section: 'badminton', emoji: '🏸' },
      { id: 'globe', label: 'Travel', section: 'travel', emoji: '🌍' },
      { id: 'books', label: 'Education', section: 'education', emoji: '🎓' },
    ]),
  },
};

export const hero = {
  greeting: "Hey, I'm Harish 👋",
  ...heroScenes[site.scene],
};

export const about = {
  kicker: 'About',
  title: 'A bit about me',
  paragraphs: [
    "I'm Harish Kumar T N. I used to write data pipelines for a living, and these days I'm at IIT Madras doing an MS in Entrepreneurship and heading pre-incubation at CIFIL.",
    "Outside of that, you'll usually find me on a badminton court (pretty much every day), planning the next trip with friends, or reading about how markets work.",
    'Somewhere down the line I want to do a PhD in fintech at UCL. This site is where I keep track of it all.',
  ],
  photo: {
    src: '',
    alt: 'Photo of Harish',
    placeholder: true,
  } satisfies Photo,
  quickFacts: [
    { label: 'Currently', value: 'IIT Madras · CIFIL' },
    { label: 'Daily ritual', value: 'Badminton 🏸' },
    { label: 'Dream', value: 'PhD in fintech, UCL' },
  ],
};

export const work = {
  kicker: 'Work',
  title: 'Things I spend my weekdays on',
  items: list<WorkItem>([
    {
      org: 'CIFIL, IIT Madras',
      role: 'Pre-Incubation Head',
      period: 'Now',
      current: true,
      summary: 'Heading pre-incubation at CIFIL, IIT Madras.',
      highlights: [],
    },
    {
      org: 'LeadSquared',
      role: 'SWE Intern → Associate Software Engineer',
      period: 'Mar 2022 – Jul 2024',
      summary:
        'Started as an intern and stayed on as an Associate Software Engineer, mostly on the data side.',
      highlights: [
        'Built data engineering ETL pipelines with Spark, Airflow, Kafka and AWS.',
        'Built an internal DevOps portal in React and Go.',
      ],
    },
  ]),
};

export const education = {
  kicker: 'Education',
  title: 'Where I learnt (and am learning)',
  items: list<EducationItem>([
    {
      school: 'Department of Management Studies (DoMS), IIT Madras',
      degree: 'MS, Entrepreneurship',
      period: '2024 – 2027',
      current: true,
    },
    {
      school: "St. Joseph's",
      degree: 'B.E., Computer Science & Engineering',
      period: '2018 – 2022',
    },
  ]),
  dream: {
    title: 'The dream 🎯',
    body: 'A PhD in fintech at the UCL Institute of Finance & Technology (IFT).',
  },
};

export const ideas = {
  kicker: 'Ideas',
  title: "Things I've been thinking about",
  intro: 'Half-baked thoughts, notes and the occasional longer piece.',
  entries: list<Entry>([
    {
      title: 'Coming soon: my first idea note',
      body: 'Coming soon: a short write-up on something I have been mulling over.',
      tags: ['startups'],
      placeholder: true,
    },
    {
      title: 'Coming soon: notes from pre-incubation',
      body: 'Coming soon: things I am noticing while working with early-stage founders.',
      tags: ['entrepreneurship'],
      placeholder: true,
    },
    {
      title: 'Coming soon: a fintech rabbit hole',
      body: 'Coming soon: a question in fintech I keep coming back to.',
      tags: ['fintech'],
      placeholder: true,
    },
  ]),
};

export const markets = {
  kicker: 'Markets',
  title: "What markets are teaching me",
  intro: 'Learnings only: concepts, mistakes and mental models I pick up along the way.',
  disclaimer:
    'Not financial advice. These are personal learning notes, not recommendations, tips or a record of any positions.',
  learnings: list<Entry>([
    {
      title: 'Coming soon: learning #1',
      body: 'Coming soon: a lesson I learnt about how markets behave.',
      tags: ['basics'],
      placeholder: true,
    },
    {
      title: 'Coming soon: learning #2',
      body: 'Coming soon: a mental model I find useful.',
      tags: ['mental models'],
      placeholder: true,
    },
    {
      title: 'Coming soon: learning #3',
      body: 'Coming soon: a book or paper that changed how I think.',
      tags: ['reading'],
      placeholder: true,
    },
  ]),
};

export const badminton = {
  kicker: 'Badminton',
  title: 'On court, every day',
  intro: "Badminton is my daily reset. Here are a few clips. Don't judge the footwork.",
  videos: list<Video>([
    {
      title: 'Coming soon: rally clip',
      caption: 'Coming soon: a rally I am proud of.',
      youtubeId: '',
      mp4: '',
      placeholder: true,
    },
    {
      title: 'Coming soon: doubles game',
      caption: 'Coming soon: a doubles game with friends.',
      youtubeId: '',
      mp4: '',
      placeholder: true,
    },
    {
      title: 'Coming soon: smash practice',
      caption: 'Coming soon: a practice session.',
      youtubeId: '',
      mp4: '',
      placeholder: true,
    },
  ]),
};

export const travel = {
  kicker: 'Travel',
  title: 'Trips with friends',
  intro: 'Photo stories from the road. The best ones are always the unplanned ones.',
  stories: list<TravelStory>([
    {
      title: 'Coming soon: trip #1',
      place: 'Somewhere',
      caption: 'Coming soon: the story behind this trip.',
      image: '',
      palette: ['#ff9a8b', '#ff6a88'],
      placeholder: true,
    },
    {
      title: 'Coming soon: trip #2',
      place: 'Somewhere else',
      caption: 'Coming soon: the story behind this trip.',
      image: '',
      palette: ['#7ee8fa', '#3b82f6'],
      placeholder: true,
    },
    {
      title: 'Coming soon: trip #3',
      place: 'The mountains?',
      caption: 'Coming soon: the story behind this trip.',
      image: '',
      palette: ['#a8e063', '#2bb3a3'],
      placeholder: true,
    },
    {
      title: 'Coming soon: trip #4',
      place: 'The beach?',
      caption: 'Coming soon: the story behind this trip.',
      image: '',
      palette: ['#ffc857', '#ff7a59'],
      placeholder: true,
    },
  ]),
};

export const social = {
  kicker: 'Highlights',
  title: 'Social highlights',
  intro: 'A few hand-picked posts from around the internet.',
  posts: list<SocialPost>([
    {
      platform: 'linkedin',
      url: '',
      embedUrl: '',
      caption: 'Coming soon: a LinkedIn post.',
      placeholder: true,
    },
    {
      platform: 'instagram',
      url: '',
      embedUrl: '',
      caption: 'Coming soon: an Instagram post.',
      placeholder: true,
    },
    {
      platform: 'x',
      url: '',
      embedUrl: '',
      caption: 'Coming soon: a post on X.',
      placeholder: true,
    },
  ]),
};

export const contact = {
  kicker: 'Contact',
  title: 'Say hi 👋',
  intro: 'Want to catch up, play a game or plan a trip? Drop me a line.',
  links: list<ContactLink>([
    {
      label: 'Email',
      href: 'mailto:hello.harishkumartn@gmail.com',
      display: 'hello.harishkumartn@gmail.com',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/harish-kumar-tn',
      display: 'in/harish-kumar-tn',
    },
  ]),
};
