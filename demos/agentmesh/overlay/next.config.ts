import type { NextConfig } from "next";

// Static export for the portfolio demo. The original config used output: "standalone".
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/projects/agentmesh/app",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
