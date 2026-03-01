import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export static HTML for hosting as static files
  output: "export",
  // Ensure trailing slash so routes map to directories (helps static hosting)
  trailingSlash: true,
};

export default nextConfig;
