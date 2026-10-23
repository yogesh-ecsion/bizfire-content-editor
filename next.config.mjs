import path from "path";
 
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    externalDir: true,
  },
};
 
export default nextConfig;
