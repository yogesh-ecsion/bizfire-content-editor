import path from "path";
 
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    instrumentationHook: true,
    externalDir: true,
  },
};
 
export default nextConfig;
