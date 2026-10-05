import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi load the dev server by the Mac's network address.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
