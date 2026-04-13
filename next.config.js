/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/lusu-lens',
  assetPrefix: '/lusu-lens/',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
