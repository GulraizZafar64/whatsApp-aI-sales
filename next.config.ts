import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "sequelize",
    "mysql2",
    "whatsapp-web.js",
    "puppeteer",
    "puppeteer-core",
  ],
};

export default nextConfig;
