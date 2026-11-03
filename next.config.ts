import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the dev server be opened through GitHub Codespaces' forwarded address
  allowedDevOrigins: ["*.app.github.dev"],
};

export default nextConfig;
