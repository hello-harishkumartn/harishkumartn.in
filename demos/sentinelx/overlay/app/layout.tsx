import type { Metadata } from "next";
import "./globals.css";
import { DemoBanner } from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "AIRE — Autonomous Incident Response Engineer",
  description: "Watch an agent investigate and resolve simulated production incidents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
