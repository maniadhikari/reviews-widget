/** @type {import('next').NextConfig} */
const nextConfig = {
  // A stray package-lock.json in the home dir makes Next guess the wrong
  // workspace root; pin it to this project.
  outputFileTracingRoot: import.meta.dirname,
  // The embed.js served from /public must be reachable cross-origin from
  // any client site, and the /api/reviews route sets its own CORS headers.
  async headers() {
    return [
      {
        source: "/embed.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
