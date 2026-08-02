/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/404',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
