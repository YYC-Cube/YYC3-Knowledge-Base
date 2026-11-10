import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['buildwithclaude.com', 'www.buildwithclaude.com'],
    },
  },
  async headers() {
    return [
      {
        // Never let the CDN cache HTML pages — Next.js server action IDs are
        // build-specific hashes that change on every deployment. Serving stale
        // cached HTML causes "Failed to find Server Action" errors because the
        // old action IDs no longer exist on the new server.
        // Next.js already content-hashes all JS/CSS under /_next/static/, so
        // those assets are safe to cache long-term without this header.
        source: '/(.*)',
        headers: [
          { key: 'CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
  images: {
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.docker.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hub.docker.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.githubassets.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wac-cdn.atlassian.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.contentstack.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'duckduckgo.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'grafana.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'info.arxiv.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.datastax.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.atlan.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.couchbase.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'git-scm.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'a.slack-edge.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'kubernetes.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.datocms-assets.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'webimages.mongodb.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wiki.postgresql.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'redis.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'labs.mysql.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sqlite.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'supabase.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebase.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.vercel.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.netlify.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.cloudflare.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'stripe.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.twilio.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sendgrid.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.mailgun.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'modelcontextprotocol.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.beaglesecurity.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.plugged.in',
        pathname: '/**',
      },
      {
        protocol: 'https', 
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.githubassets.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
