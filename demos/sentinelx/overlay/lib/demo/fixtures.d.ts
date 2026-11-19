// Types for the recorded fixtures in fixtures.js (generated, see demos/sentinelx/tools).
export interface PackedFrame {
  incident: number;
  graph: number;
  events: number[];
  hypotheses: number[];
  toolCalls: number[];
  actions: number[];
  verifications: number[];
  services: number[];
  approvals: number[];
}

export interface PackedScenario {
  id: string;
  initial: PackedFrame;
  // Keyed by the approval decisions taken so far: "" is the first run, "a" approve, "r" reject, "ra" ...
  tracks: Record<string, PackedFrame[]>;
}

export interface PackedFixtures {
  pool: unknown[];
  scenarioList: { type: string; title: string; affected_services: string[] }[];
  scenarios: Record<string, PackedScenario>;
}

declare const data: PackedFixtures;
export default data;
