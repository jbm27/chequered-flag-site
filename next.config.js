/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Stop other websites showing these pages inside a frame (protects the hire desk from clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Browsers must not guess file types (stops uploaded or served files being run as scripts).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the site's address, not full page paths, when visitors follow links to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The camera is used on our own pages for licence photos; nothing else needs device access.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
];

const nextConfig = {
  reactStrictMode: true,
  // Review highlights (src/lib/review.ts) must never show on the live site. VERCEL_ENV is always set by Vercel
  // when it builds ("production" for the live site), so this is passed to the browser code at build time.
  env: { REVIEW_HIDE: process.env.VERCEL_ENV === "production" ? "1" : "" },
  poweredByHeader: false, // don't advertise the framework version
  // Old address: staff sign in on the hire desk.
  async redirects() {
    return [{ source: "/login", destination: "/manage", permanent: false }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
module.exports = nextConfig;
