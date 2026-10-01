import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react", "recharts"],
  },
};

export default nextConfig;
