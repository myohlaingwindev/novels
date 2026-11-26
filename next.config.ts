import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev({ remoteBindings: true });
}

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
