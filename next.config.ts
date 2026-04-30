import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/reports/\\[id\\]/pdf": ["./src/lib/pdf/SF-425_template.pdf"],
  },
};

export default nextConfig;
