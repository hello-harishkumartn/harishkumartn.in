/** @type {import('next').NextConfig} */
// Demo build: static export served from harishkumartn.in/projects/sentinelx/app/.
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  output: "export",
  basePath: "/projects/sentinelx/app",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
