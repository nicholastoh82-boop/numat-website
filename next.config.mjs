/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  // Type errors fail the build again. This was true, and it hid 21 real errors,
  // three of which were live bugs: the CRM served out of stock variants because
  // in_stock was filtered but never selected, the partner board printed $NaN for
  // unrealised revenue because the field was never computed, and quote line
  // price overrides were read off a property that was never declared.
  typescript: {
    ignoreBuildErrors: false,
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
      // NuComposite was renamed to NuHybrid; keep the old product URL working.
      { source: '/products/nucomposite', destination: '/products/nuhybrid', permanent: true },
      // Free samples were removed; testers place a minimum order instead.
      { source: '/request-samples', destination: '/request-quote', permanent: true },
    ];
  },
}

export default nextConfig
