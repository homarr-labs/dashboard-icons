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
See [docs/MCP.md](./docs/MCP.md) for endpoints, client setup, tool schemas, environment variables, analytics, and rate limits.

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

## Third-party source: Simple Icons

The external catalogue also includes unique brands from
[Simple Icons](https://simpleicons.org/). A weekly Monday sync resolves the
latest published npm release, imports its version-pinned metadata, and skips
slugs already owned by Dashboard Icons or another external source.

Every imported record preserves the official slug, brand color, source,
guidelines, per-icon license metadata, and all searchable alias classes. The
detail page lists SVG and PNG cards side by side for the brand-color, black
(light-mode), and white (dark-mode) variants. SVGs remain hosted by the official
colorable CDN:

```txt
https://cdn.simpleicons.org/<slug>/<brand-color>
```

PNG downloads are generated on demand as transparent 640 x 640 images from the
corresponding official SVG. Browse and main detail previews follow the website
theme directly, using black in light mode and white in dark mode. The source
details page links back to the original brand source and guidelines and feeds
the colored SVG into the existing customizer. The Simple Icons collection is
released under CC0-1.0, but brand
names and marks remain subject to their owners' licenses, trademarks, and usage
guidelines. See the [Simple Icons disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md).

To run the pinned importer locally after downloading the published metadata:

```bash
PB_ADMIN=admin@example.com PB_ADMIN_PASS=your-password \
PB_URL=http://127.0.0.1:8090 SIMPLE_ICONS_VERSION=16.28.0 \
bun run scripts/import-simple-icons.ts
```

### Deployment

The application is optimized for deployment on Vercel.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
