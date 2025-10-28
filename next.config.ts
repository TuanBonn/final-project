// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xiuswadifrrbocuiiygs.supabase.co", // Hostname Supabase
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https", // <-- SỬA LỖI Ở ĐÂY (bỏ bớt chữ 's')
        hostname: "i.imgur.com", // 1. Hostname ảnh mặc định
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // 2. Hostname Google Avatar
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
