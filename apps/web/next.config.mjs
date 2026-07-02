/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet, StrictMode çift-mount'ında "Map container already initialized"
  // hatası veriyor (yalnız dev). Harita için kapatıldı.
  reactStrictMode: false,
  // workspace paketi TS kaynağından derlenir
  transpilePackages: ["@satiyo/shared"],
  webpack: (config) => {
    // shared içindeki .js uzantılı importları .ts'e çöz (verbatimModuleSyntax)
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
