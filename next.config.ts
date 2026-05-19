import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["drizzle-orm", "postgres"],
};

export default nextConfig;
