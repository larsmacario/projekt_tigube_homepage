/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: '/Start/:path*',
        destination: '/',
        permanent: true,
      },
      // Hundepension / Katzenbetreuung / Kundenstimmen: siehe proxy.ts
      // (next.config-Redirects matchen auf Vercel case-insensitiv → 308-Schleife auf /hundepension etc.)
      {
        source: '/Unsere-Leistungen/:path*',
        destination: '/#leistungen',
        permanent: true,
      },
      {
        source: '/SeminareWorkshops/:path*',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
