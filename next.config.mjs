/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Lint every source dir (default only covers app/components/lib/pages/src).
  eslint: {
    dirs: ["app", "components", "features", "lib", "utils", "hooks"],
  },

  // Keep compiled routes in memory much longer so navigating back to a page
  // doesn't recompile it — the main cause of "clicking takes time" in dev.
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60, // 1h before a page is disposed
    pagesBufferLength: 25,          // keep up to 25 pages hot
  },
};

export default nextConfig;
