import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { DemoBanner } from "@/components/demo-banner";
import "./globals.css";
import "./demo.css";

export const metadata: Metadata = { title: "Agentic Compliance Auditor (sample data demo)", description: "Auditable AI compliance operations. Static demo with recorded responses." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><DemoBanner/><Sidebar/><main className="min-h-screen pb-24 lg:pb-0 lg:pl-64"><div className="border-b border-ink/10 bg-white/60 px-5 py-3 text-center text-[11px] font-medium text-ink/55 backdrop-blur">Synthetic framework and evidence · Demonstration only · Not legal advice</div><div className="mx-auto max-w-[1500px] p-5 md:p-9">{children}</div></main></body></html>
}
