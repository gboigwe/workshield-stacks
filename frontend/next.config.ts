// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;


// next.config.js - Add API proxy to avoid CORS issues

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/stacks/:path*',
        destination: 'https://api.testnet.hiro.so/:path*',
      },
    ];
  },
  
  async headers() {
    return [
      {
        source: '/api/stacks/:path*',
        headers: [
          {
            key: 'X-API-Key',
            value: process.env.NEXT_PUBLIC_HIRO_API_KEY || '',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
