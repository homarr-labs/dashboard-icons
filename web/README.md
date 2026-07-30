# Dashboard Icons Web App

A web application to browse, search, and download icons from the
[Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) collection.

## Features

- Browse through a curated collection of beautiful dashboard icons
- Search icons by name, aliases, or categories
- View icon details including author, formats, and variants
- Download icons in different formats (SVG, PNG, WebP)
- Copy icon URLs directly to your clipboard
- Responsive design that works on mobile, tablet, and desktop
- Dark mode support
- **User authentication** - Sign in with email/password or GitHub OAuth
- **Submit icons** - Authenticated users can submit new icons to the collection
- **Admin dashboard** - Admins can approve, reject, and manage icon submissions
- **MCP server** - HTTP MCP endpoint for AI assistants to search icons, fetch metadata, and resolve CDN URLs

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript v5** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Reusable components built with Radix UI and Tailwind
- **PocketBase** - Backend for authentication and data storage
- **PostHog** - Product analytics and user tracking
- **MCP (Model Context Protocol)** - HTTP transport via `mcp-handler` for AI tool integrations

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── icons/            # Icon search API
│   │   └── mcp/              # MCP HTTP endpoint
│   ├── icons/                # Icons browsing and detail pages
│   │   ├── [icon]/           # Dynamic icon detail page
│   │   └── page.tsx          # Icons browse page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Homepage
├── components/               # Shared components
├── lib/
│   ├── api.ts                # App-level icon API helpers
│   ├── icon-url.ts           # Icon URL resolution
│   └── icons/                # Icon service, search, validation, rate limiting
├── mcp/                      # MCP handler and tool registration
└── types/                    # TypeScript type definitions
```

## MCP Server

The app exposes a native-icons MCP server over HTTP at `/api/mcp`. AI clients can search the collection, fetch icon metadata, and resolve CDN URLs without scraping the website.

| Endpoint | URL |
|----------|-----|
| Production | `https://dashboardicons.com/api/mcp` |
| Local dev | `http://localhost:3005/api/mcp` |

### Tools

| Tool | Description |
|------|-------------|
| `search_icons` | Search by name, alias, or category |
| `get_icon` | Full metadata and CDN URLs for one icon |
| `get_icon_url` | Direct CDN URL (`svg`, `png`, `webp`; `default`, `light`, `dark`) |
| `suggest_icon` | Fuzzy match from a natural service name (e.g. `"Plex media server"` → `plex`) |

v1 covers **native icons** from `metadata.json` only. External sources (selfh.st, LobeHub) are not included.

### Cursor configuration

```json
{
  "mcpServers": {
    "dashboard-icons": {
      "url": "https://dashboardicons.com/api/mcp"
    }
  }
}
```

For stdio-only clients, use [mcp-remote](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "dashboard-icons": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://dashboardicons.com/api/mcp"]
    }
  }
}
```

### MCP environment variables

| Variable | Description |
|----------|-------------|
| `MCP_RATE_LIMIT_ENABLED` | Set to `false` to disable rate limiting (local dev only) |
| `MCP_VERBOSE_LOGS` | Set to `true` for verbose MCP handler logs |
| `MCP_WARM_CACHE` | Set to `true` to preload metadata on server start |
| `DASHBOARD_ICONS_METADATA_PATH` | Local `metadata.json` path (development only; blocked in production) |

Rate limits: 60 requests/minute per IP (all MCP traffic), 30 tool calls/minute per IP (`tools/call`).

See [docs/MCP.md](./docs/MCP.md) for full tool schemas, parameters, and limits.

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env` file with the following variables:
   ```
   GITHUB_TOKEN=your_github_token
   NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
   ```
4. **Configure GitHub OAuth (Optional):**

   To enable GitHub OAuth login, you need to create a GitHub OAuth App and
   configure it in PocketBase:

   a. Create a GitHub OAuth App:
   - Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App
   - Set Application name: "Dashboard Icons" (or your preferred name)
   - Set Homepage URL: `http://localhost:3000` (for development)
   - Set Authorization callback URL: `http://localhost:8090/api/oauth2-redirect`
   - After creation, note the **Client ID** and generate a **Client Secret**

   b. Configure PocketBase OAuth:
   - Start PocketBase: `pnpm run backend:start`
   - Open PocketBase admin UI at `http://127.0.0.1:8090/_/`
   - Navigate to Settings → Auth providers
   - Enable GitHub provider and enter your Client ID and Client Secret
   - Save the settings

   c. For production deployment:
   - Update the Authorization callback URL to:
     `https://pb.dashboardicons.com/api/oauth2-redirect`
   - Configure the same OAuth settings in your production PocketBase instance

5. Start the development server:
   ```bash
   pnpm dev
   ```

### Build

```bash
pnpm build
```

## Third-party sources: selfh.st

Dashboard Icons can display external icon metadata from
[selfh.st/icons](https://selfh.st/icons/) without copying icon files into the
native collection. The `external_icons` PocketBase collection stores slugs,
names, categories, available formats, variant metadata, jsDelivr URL templates,
and license attribution.

External icon files stay on jsDelivr using this pattern:

```txt
https://cdn.jsdelivr.net/gh/selfhst/icons/<format>/<slug>.<format>
```

The imported records are public-read only. PocketBase rules are `listRule: ""`
and `viewRule: ""`, while create/update/delete are superuser-only. Every
external icon card and detail page must display
`Icons by selfh.st/icons (CC BY 4.0)`.

If the collection does not exist yet, import
`data/sources/selfhst/external_icons.collection.json` in the PocketBase admin UI
under Collections before running the importer. The JSON defines the
`external_icons` fields, public list/view rules, disabled public writes, and the
unique `(source, slug)` index.

To refresh local metadata and import it into PocketBase:

```bash
mkdir -p data/sources/selfhst
curl -fsSL https://raw.githubusercontent.com/selfhst/icons/main/index.json -o data/sources/selfhst/index.json
curl -fsSL https://raw.githubusercontent.com/selfhst/icons/main/index-consolidated.json -o data/sources/selfhst/index-consolidated.json
curl -fsSL https://raw.githubusercontent.com/selfhst/icons/main/tags.json -o data/sources/selfhst/tags.json

PB_ADMIN=admin@example.com PB_ADMIN_PASS=your-password \
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090 \
bun run scripts/import-selfhst.ts
```

### Deployment

The application is optimized for deployment on Vercel.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
