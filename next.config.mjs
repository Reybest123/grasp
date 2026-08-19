/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dev-only floating badge is pinned to the bottom-left, which is exactly
  // where the sidebar rail keeps Settings and Log out — it covers them outright
  // and makes those controls untestable in development.
  devIndicators: false,
};

export default nextConfig;
