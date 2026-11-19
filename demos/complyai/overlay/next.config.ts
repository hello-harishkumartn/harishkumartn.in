import type { NextConfig } from "next";

// Demo build: static export served under harishkumartn.in/projects/complyai/app/
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/projects/complyai/app",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
