/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8006/api/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
