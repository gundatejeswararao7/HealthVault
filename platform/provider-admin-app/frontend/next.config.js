/** @type {import('next').NextConfig} */
const nextConfig = {
  // Provider-admin app runs on port 3002; backend API on 4002
  experimental: {
    serverComponentsExternalPackages: ["@supabase/ssr"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
