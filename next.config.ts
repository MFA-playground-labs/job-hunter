import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // The import routes read markdown straight from the repo at runtime; these
  // globs make sure the files ship inside the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/api/admin/import-playbooks": ["./Obsidian 2nd brain/Interview prep MDs/**"],
    "/api/admin/import-facts": ["./docs/**"],
  },
};

export default nextConfig;
