import type { NextConfig } from "next";

// Built as a static site (no server): `npm run build` writes plain files to ./out.
// On GitHub Pages the site lives under /<repo>, which the deploy workflow passes in.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
};

export default nextConfig;
