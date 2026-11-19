// Server wrapper so the client incident page can be statically exported.
// Prebuilt pages: one per seeded demo incident, plus the "view" slot that reads ?id= for incidents
// created in the browser at runtime.
import { Suspense } from "react";
import { SEED_INCIDENTS, VIEW_SLOT } from "@/lib/demo/seeds";
import IncidentDetailClient from "./IncidentDetailClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...SEED_INCIDENTS.map((s) => ({ id: s.id })), { id: VIEW_SLOT }];
}

export default function IncidentPage() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <IncidentDetailClient />
    </Suspense>
  );
}
