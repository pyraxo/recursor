import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "lucide-react"],
  // Instrumentation is enabled by default in Next.js 15+
  // The instrumentation.ts file will be automatically loaded
};

export default nextConfig;
