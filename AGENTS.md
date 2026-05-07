# AGENTS.md — Dashboard Icons

## Repo structure

- `/svg/`, `/png/`, `/webp/` — icon assets at root level (not in `web/`)
- `/metadata.json` — icon metadata (names, aliases, categories, colors, authors); root-level 38K+ line JSON
- `/tree.json` — file tree index, auto-generated
- `/web/` — Next.js 16 app (App Router, standalone output), the only npm workspace
- `/scripts/` — Python scripts (icon conversion, metadata generation, etc.)

## Root-level commands (Python scripts)

SVG → PNG/WEBP conversion requires **Inkscape** and `pillow`:
```bash
pip install pillow
python scripts/convert_svg_assets.py
```

Icon generation (GitHub issue driven):
```bash
pip install pillow requests cairosvg
python scripts/generate_icons.py
```

## Web app commands

Run from `/web/`. Package manager is **pnpm** (v10.18.2 per `mise.toml`).

```bash
pnpm install
pnpm dev              # starts PocketBase backend + Next.js on port 3005 via Turbo
pnpm dev:web          # Next.js only (turbopack, port 3005)
pnpm build            # standalone output (Next.js only)
pnpm lint             # biome lint --write
pnpm format           # biome check --write
pnpm ci               # biome check --write (CI equivalent)
pnpm backend:start    # start PocketBase from ./backend/
pnpm backend:download # download PocketBase v0.30.0 for darwin-arm64
pnpm seed             # seed PocketBase via seed-db.ts (requires bun)
```

## Required env vars

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | GitHub API access for icon submissions |
| `NEXT_PUBLIC_POCKETBASE_URL` | PocketBase server URL |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics (optional, has default) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host (optional, has default) |

E2E tests use `.env.test` for test credentials.

## Formatting & linting

- **Biome** (v2.3.7) — formatter + linter, config in `web/biome.jsonc`
- Tabs for indentation, 140 line width, double quotes, no semicolons
- Biome uses `.gitignore`, so `node_modules`, `png/`, `webp/` are excluded
- Biome excludes `src/components/ui` from linting (shadcn/ui components)
- `organizeImports` runs on save (assist action)

## Testing

- **Playwright** (Chromium + mobile-chrome), config in `web/playwright.config.ts`
- Dev server auto-managed on port 3005
- Commands: `pnpm test:e2e` / `test:e2e:ui` / `test:e2e:debug` / `test:e2e:chromium` / `test:e2e:headed`
- 2 retries on CI, 0 locally
- E2E tests live in `web/tests/`

## Architecture notes

- **PocketBase** handles auth + submissions + community gallery. Typed client at `web/src/lib/pb.ts`.
- **Icons metadata** is loaded from root `metadata.json` (not PocketBase). Icons are static files in `svg/`, `png/`, `webp/`.
- **Next.js `output: "standalone"`** — images are unoptimized (static file serving).
- **shadcn/ui** (New York style, Zinc base, RSC enabled) — do not edit `src/components/ui/` directly.
- **TanStack Query** used for data fetching. **TanStack Form** for the submission form.
- **PostHog** analytics (can be disabled with `NEXT_PUBLIC_DISABLE_POSTHOG=true`).
- Path alias `@/*` → `./src/*`, `@/metadata` → `../metadata.json`.

## Icon conventions

- Kebab-case names: `nextcloud-calendar.svg`
- `-light` suffix for dark backgrounds, `-dark` for light backgrounds
- SVG is source of truth; PNG/WEBP are auto-generated at 512px height
- CDN base: `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons`

## Workflows (CI)

- Icon addition/update is GitHub issue-driven via issue forms
- SVG conversion runs on PRs (`validate_and_preview_icons.yml`) and on merge to main (`update_icons_and_resources.yml`)
- Daily Cloudflare Pages deploy trigger via `daily_release.yml`
- Compression available manually via `compress_icons.yml`
