/**
 * Projects shown in the Projects section and on the /projects/<slug>/ pages.
 *
 * Kept out of content.ts so the cards load with the lazy Projects chunk instead of the
 * initial bundle. This file has no imports and only erasable TypeScript, because
 * scripts/project-pages.mjs and the tests load it directly with Node.
 * Only public repos of hello-harishkumartn are listed.
 */

export interface ProjectLink {
  label: string;
  href: string;
  /** Short note shown next to the link, e.g. "Sample data". */
  note?: string;
}

export interface Project {
  slug: string;
  title: string;
  /** One line, shown on the card and under the page title. */
  description: string;
  tags: string[];
  /** GitHub repo name under github.com/hello-harishkumartn. */
  repo: string;
  /** Open link, always /projects/<slug>/. */
  href: string;
  /** GitHub link. */
  codeUrl: string;
  /** Extra links on the project page, e.g. an app that is already live. */
  links?: ProjectLink[];
}

type ProjectInput = Omit<Project, 'href' | 'codeUrl'>;

const GITHUB = 'https://github.com/hello-harishkumartn';

const define = (p: ProjectInput): Project => ({
  ...p,
  href: `/projects/${p.slug}/`,
  codeUrl: `${GITHUB}/${p.repo}`,
});

export const projectsSection = {
  kicker: 'Projects',
  title: "Things I've built",
  intro: 'Agent systems and 3D dashboards I have built. All of them are open source on GitHub.',
};

export const projects: Project[] = [
  define({
    slug: 'forgeloop',
    title: 'ForgeLoop',
    description: 'A control plane that runs coding agents in a Docker sandbox through a bounded modify, test and repair loop.',
    tags: ['Python', 'Docker', 'Next.js', 'Gemini', 'Ollama'],
    repo: 'autonomous-agent-harness',
  }),
  define({
    slug: 'recallx',
    title: 'RecallX',
    description: 'Enterprise knowledge search and RAG with hybrid retrieval, cited answers and role based access control.',
    tags: ['Python', 'FastAPI', 'pgvector', 'Next.js', 'Gemini'],
    repo: 'enterprise-knowledge-ai',
  }),
  define({
    slug: 'complyai',
    title: 'ComplyAI',
    description: 'Seven schema bound specialist agents in a state machine audit a fictional fintech with human approval gates.',
    tags: ['Python', 'FastAPI', 'Pydantic', 'Next.js', 'Gemini'],
    repo: 'agentic-compliance-auditor',
  }),
  define({
    slug: 'sentinelx',
    title: 'SentinelX',
    description: 'An autonomous incident response engineer that investigates a simulated microservice fleet and asks before risky fixes.',
    tags: ['Python', 'FastAPI', 'Next.js', 'Gemini', 'Ollama'],
    repo: 'autonomous-incident-response',
  }),
  define({
    slug: 'agentmesh',
    title: 'AgentMesh',
    description: 'An enterprise control plane for governed agents with a durable DAG runner, approvals and full traces.',
    tags: ['Python', 'FastAPI', 'PostgreSQL', 'pgvector', 'Next.js'],
    repo: 'multi-agent-control',
  }),
  define({
    slug: 'harish-agents-map',
    title: 'Harish Agents Map',
    description: 'A live 3D map of my AI agents as animated robots on floating hex islands, fed by a status file.',
    tags: ['Three.js', 'JavaScript', 'GitHub Pages'],
    repo: 'harish-agents-map',
    links: [{ label: 'Open the live app', href: 'https://hello-harishkumartn.github.io/harish-agents-map/' }],
  }),
  define({
    slug: 'harish-ops-colony',
    title: 'Harish Ops Colony',
    description: 'An RTS style 3D ops board for an agent fleet with robots, routines and a live activity feed.',
    tags: ['Three.js', 'JavaScript', 'Static site'],
    repo: 'harish-ops-colony',
    links: [{ label: 'Open the app sample', href: 'app/', note: 'Sample data: the agents, routines and activity shown are made up.' }],
  }),
];
