import type { NextConfig } from "next";

// Static export for the portfolio demo. Served under /projects/forgeloop/app/.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/projects/forgeloop/app",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
