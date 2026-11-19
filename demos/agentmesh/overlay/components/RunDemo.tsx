"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRun } from "@/lib/demoStore";

// Starts a simulated run in the browser and opens its live trace.
export function RunDemo() {
  const [state, setState] = useState("Run demo");
  const router = useRouter();
  function run() {
    setState("Starting…");
    const id = createRun();
    setState("Started");
    router.push(`/runs/live/?id=${encodeURIComponent(id)}`);
  }
  return <button className="primary" onClick={run}>{state} <span>→</span></button>;
}
