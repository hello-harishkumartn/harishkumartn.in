import type { Metadata } from "next";
import "./styles.css";
import "./demo.css";

export const metadata: Metadata = {
  title: "AutonomousDev Harness (sample data demo)",
  description: "Evidence, state and control for autonomous coding agents. Static demo with recorded sample data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="demoBanner" role="note">
          <strong>Sample data.</strong>
          <span>This demo runs in your browser with recorded responses. No backend or AI model is connected.</span>
          <a href="https://github.com/hello-harishkumartn/autonomous-agent-harness" target="_blank" rel="noopener noreferrer">Code on GitHub</a>
          <a href="/#projects">Back to harishkumartn.in</a>
        </div>
        {children}
      </body>
    </html>
  );
}
