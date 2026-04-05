import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicit project root so Next finds src/app when parent has another package-lock.json
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
