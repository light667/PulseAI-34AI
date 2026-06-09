/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oodmfyesvusvuphycfrh.supabase.co",
      },
    ],
  },

  // Expose backend URL to client-side code
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || "",
  },

  // Proxy /api/backend/* → Render backend (alternative to NEXT_PUBLIC_BACKEND_URL)
  // Uncomment if you prefer server-side proxy rewrites instead of direct client calls
  // async rewrites() {
  //   const backendUrl = process.env.BACKEND_URL;
  //   if (!backendUrl) return [];
  //   return [
  //     {
  //       source: "/api/backend/:path*",
  //       destination: `${backendUrl}/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
