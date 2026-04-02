import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Compiler for automatic memoization
  reactCompiler: true,

  // App Router is enabled by default in Next.js 13+
  // No need for experimental.appDir config
};

export default nextConfig;
