import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { DemoBanner } from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "RecallX demo - Acme Knowledge",
  description: "Static demo of an internal knowledge search and RAG assistant, running on sample data in the browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <DemoBanner />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
