/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Everything the browser loads comes from Grasp's own origin: fonts are
// self-hosted by next/font, every fetch goes to our own /api routes, and
// Stripe Checkout is reached by navigating away (which CSP does not govern).
// 'unsafe-inline' scripts are needed by Next's inline bootstrap without a
// nonce; the note sanitiser remains the primary XSS defence. data: images
// cover the checklist tick and square-root mask drawn as data-URI SVGs.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Dev lets the app frame itself: phone layouts are checked by loading a page
  // in a same-origin iframe of phone size, since a desktop Chrome window cannot
  // be made narrower than about 500px. Production allows no framing at all.
  isDev ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Older browsers that ignore frame-ancestors.
  { key: "X-Frame-Options", value: isDev ? "SAMEORIGIN" : "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Keeps the token in a password-reset link from leaking to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The Record tab needs the microphone; nothing needs the camera or location.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

const nextConfig = {
  reactStrictMode: true,
  // The dev-only floating badge is pinned to the bottom-left, which is exactly
  // where the sidebar rail keeps Settings and Log out — it covers them outright
  // and makes those controls untestable in development.
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
