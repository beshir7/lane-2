/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Keep compiled routes in memory much longer so navigating back to a page
  // doesn't recompile it — the main cause of "clicking takes time" in dev.
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60, // 1h before a page is disposed
    pagesBufferLength: 25,          // keep up to 25 pages hot
  },
};

export default nextConfig;
