import type { NextConfig } from "next";

// Built as a static site (no server): `npm run build` writes plain files to ./out.
// Set NEXT_PUBLIC_BASE_PATH only when the site is served from a sub-path (e.g. /app).
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
};

export default nextConfig;
