# BuildWithClaude - Web UI

A modern web interface for browsing and installing Claude Code plugins, agents, commands, hooks, MCP servers, and plugin marketplaces.

## Features

- 🤖 Browse 317+ specialized AI agents across 11 categories
- 🔧 Explore 192 slash commands for automation
- 🪝 Discover 40 automation hooks
- 🔌 Browse 199+ MCP servers for database/API integrations
- 🧩 Discover 20.3k+ community plugins from 1,158 marketplaces
- ⚡ Browse 2k+ individual skills from plugins
- 🏪 Explore 1,158 community plugin marketplaces
- 🏷️ Filter by category
- 🔎 Real-time search functionality
- 📋 One-click copy to clipboard
- 💾 Direct download of markdown files
- 📱 Fully responsive design
- 🌙 Dark mode support
- 🚀 Built with Next.js 16, React 19, and shadcn/ui

## Local Development

1. Navigate to the web-ui directory:
   ```bash
   cd web-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Building for Production

```bash
npm run build
```


### Other Platforms

The site can be deployed to any platform that supports Next.js:
- Vercel
- Netlify
- AWS Amplify
- Cloudflare Pages
- Self-hosted with Node.js

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Database**: Neon Postgres + Drizzle ORM
- **Icons**: Lucide React + Radix Icons

## Environment Variables

For local development with database features:

```bash
# Required for database features (MCP servers, marketplaces, plugins, skills)
POSTGRES_URL=postgres://...
```

Without `POSTGRES_URL`, the app still works for browsing agents, commands, and hooks (read from markdown files).

## Project Structure

```
web-ui/
├── app/                    # Next.js App Router pages
│   ├── subagents/          # Browse agents page
│   ├── commands/           # Browse commands page
│   ├── hooks/              # Browse hooks page
│   ├── mcp-servers/        # Browse MCP servers (database)
│   ├── marketplaces/       # Browse community plugin marketplaces (database)
│   ├── plugins/            # Browse community plugins (database)
│   ├── skills/             # Browse skills from plugins (database)
│   └── page.tsx            # Home page
├── components/             # React components (shadcn/ui + custom)
│   ├── ui/                 # shadcn/ui base components
│   └── ...                 # Feature components
├── lib/                    # Server utilities and data fetching
│   ├── db/                 # Database schema and client
│   │   ├── client.ts       # Drizzle ORM client
│   │   └── schema.ts       # Database schema definitions
│   ├── *-server.ts         # Server-side data fetching
│   └── *-types.ts          # TypeScript type definitions
└── public/                 # Static assets
```

## Contributing

See the main repository's [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.