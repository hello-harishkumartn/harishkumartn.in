// Incidents that exist when the demo opens. Their ids are the recorded ids, so each one
// gets a prebuilt page under /incidents/<id>/. Incidents created at runtime use /incidents/view/?id=<id>.
export interface SeedIncident {
  id: string;
  scenario: string;
  minutesAgo: number;
  // Decisions already taken: null means never started, "" means the first run finished.
  path: string | null;
}

export const SEED_INCIDENTS: SeedIncident[] = [
  { id: "3519bbfd-f999-42fb-92ea-e26beda03248", scenario: "redis_failure", minutesAgo: 42, path: "a" },
  { id: "62fe9df7-8961-4e93-9aa0-9028e4b52119", scenario: "db_connection_exhaustion", minutesAgo: 18, path: "" },
  { id: "8433d9ce-e80d-4b62-8eaf-a283f12ffc73", scenario: "bad_deployment", minutesAgo: 4, path: "" },
];

export const VIEW_SLOT = "view";

export function incidentHref(id: string): string {
  return SEED_INCIDENTS.some((s) => s.id === id) ? `/incidents/${id}/` : `/incidents/${VIEW_SLOT}/?id=${encodeURIComponent(id)}`;
}
