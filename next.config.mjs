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

  experimental: {
    // Client-side Router Cache: once a route (athlete/competition detail, any
    // page) has been visited or prefetched, reuse it for 5 minutes instead of
    // re-fetching the server component payload.
    //
    // This caches the ROUTE SHELL only, never the data: every screen reads its
    // athletes/competitions/entries from LaneProvider, which holds them in
    // client state and revalidates them itself (on tab focus, and when the
    // connection returns). So a long stale time here cannot show stale records
    // — it only saves the round-trip for markup the client would re-render
    // identically anyway.
    staleTimes: {
      dynamic: 300, // 5 min for dynamic routes (e.g. /athletes/[id], /competitions/[id])
      static: 300,  // 5 min for static routes
    },
  },
};

export default nextConfig;
