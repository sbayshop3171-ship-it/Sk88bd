/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // game tiles ask for quality 72; Next 16 only serves listed qualities
  images: { qualities: [72, 75] },
};

export default nextConfig;
