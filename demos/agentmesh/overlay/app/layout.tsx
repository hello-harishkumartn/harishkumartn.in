import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { DemoBanner } from "@/components/DemoBanner";
import "./globals.css";
import "./demo.css";

export const metadata: Metadata = { title: "AgentPlane demo", description: "Enterprise AI agent control plane. Static demo with recorded sample data." };

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body><DemoBanner/><Nav/><main>{children}</main></body></html>;
}
