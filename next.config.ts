import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler - Temporarily disabled due to compatibility issues
  // TODO: Re-enable when stable for Next.js 16.2.x
  // reactCompiler: true,

  // App Router is enabled by default in Next.js 13+
  // No need for experimental.appDir config
};

export default nextConfig;
