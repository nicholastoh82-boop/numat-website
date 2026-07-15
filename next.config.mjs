/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'peuwxnrojlfybdymkazj.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // News became Blog. Redirects run before filesystem routes, so these
      // shadow app/news until that directory is deleted.
      //
      // The negative lookahead keeps /news/archive and everything under it out
      // of the article redirect. The archive tree is orphaned (nothing links to
      // it) and still needs its own move.
      { source: '/news', destination: '/blog', permanent: true },
      { source: '/news/:slug((?!archive$).*)', destination: '/blog/:slug', permanent: true },
    ];
  },
}

export default nextConfig
