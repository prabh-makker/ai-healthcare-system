/** @type {import('next').NextConfig} */
const API_BACKEND = process.env.API_BACKEND_URL || 'http://localhost:8006';

const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${API_BACKEND}/api/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
