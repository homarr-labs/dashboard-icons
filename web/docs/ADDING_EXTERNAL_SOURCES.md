# Adding an External Icon Source

This guide walks through every step required to integrate a new third-party icon catalogue into Dashboard Icons. The system is built on an **adapter pattern** — each external source is a configuration entry in `src/constants.ts`, backed by a PocketBase collection, an importer script, and a GitHub Actions workflow. The UI, search, sitemap, and metadata layers read from this configuration automatically.

The existing **selfh.st** and **LobeHub** integrations are the reference implementations. Every file mentioned below already has a working example you can follow.

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [Step 1 — Register the source in constants.ts](#step-1--register-the-source-in-constantsts)
3. [Step 2 — Update the PocketBase migration](#step-2--update-the-pocketbase-migration)
4. [Step 3 — Write the importer script](#step-3--write-the-importer-script)
5. [Step 4 — Create the GitHub Actions workflow](#step-4--create-the-github-actions-workflow)
6. [Step 5 — Allow remote images in next.config.ts](#step-5--allow-remote-images-in-nextconfigts)
7. [Step 6 — Add Playwright tests](#step-6--add-playwright-tests)
8. [What happens automatically](#what-happens-automatically)
9. [Full file reference](#full-file-reference)
10. [Checklist](#checklist)

---

## Architecture overview

```
constants.ts          ← Source registry (single source of truth)
       │
       ├── pb_migrations/  ← PocketBase schema (source enum)
       ├── scripts/        ← Importer (ETL: manifest → PocketBase)
       ├── .github/        ← Scheduled sync workflow
       │
       └── UI reads EXTERNAL_SOURCES automatically:
           ├── icon-card.tsx         → Badge overlay on thumbnails
           ├── icon-details.tsx      → Detail page badge, attribution, "View on" link
           ├── icon-search.tsx       → Source filter dropdown
           ├── command-menu.tsx      → CMD+K palette source badge + routing
           ├── hero.tsx              → Hover popover with per-source counts
           ├── header.tsx            → Loads external icons for CMD+K
           ├── icons/page.tsx        → Browse page copy + merged results
           ├── icons/external/[slug] → Static detail pages
           ├── sitemap.ts            → External URLs + images
           └── api.ts                → getTotalIcons() breakdown
```

All icons from all external sources are stored in a single PocketBase collection (`external_icons`), distinguished by the `source` field. The UI iterates over `EXTERNAL_SOURCE_IDS` to render filters, badges, and labels — **no component changes are needed** when adding a new source.

---

## Step 1 — Register the source in `constants.ts`

**File:** `web/src/constants.ts`

### 1a. Add to the `ExternalSourceId` union

```typescript
// Before
export type ExternalSourceId = "selfhst"

// After
export type ExternalSourceId = "selfhst" | "yoursource"
```

### 1b. Add the config entry to `EXTERNAL_SOURCES`

```typescript
export const EXTERNAL_SOURCES: Record<ExternalSourceId, ExternalSourceConfig> = {
  selfhst: { /* ... existing ... */ },
  yoursource: {
    id: "yoursource",
    label: "Your Source",                                        // Displayed in UI
    icon: "https://cdn.jsdelivr.net/gh/org/repo/icon.svg",      // Small icon for badges/dropdowns
    cdnBase: "https://cdn.jsdelivr.net/gh/org/repo",             // Base URL for asset resolution
    website: "https://yoursource.com/icons/",                    // Link in detail page
    authorName: "Your Source Icons",                              // Attribution text
    authorLogin: "yoursource",                                   // GitHub org/user
    authorUrl: "https://yoursource.com/icons/",                  // Author link
    license: "MIT",                                               // License displayed in UI + metadata
    pbFilter: "yoursource",                                       // Value stored in PocketBase `source` field
  },
}
```

### What each field controls

| Field | Used in |
|-------|---------|
| `id` | Internal identifier, matches the union type and PocketBase `source` value |
| `label` | Badge text on `IconCard`, `IconDetails`, source filter dropdown, CMD+K results, hero popover |
| `icon` | Source icon in card badges, detail page badges, filter dropdown, CMD+K results, "View on" button |
| `cdnBase` | Fallback URL pattern in `resolveExternalIconUrl()` when `url_templates` is empty |
| `website` | "View on" button href on the detail page |
| `authorName` | JSON-LD `creator.name`, author display in detail page sidebar |
| `authorLogin` | Author login used in data layer |
| `authorUrl` | JSON-LD `creator.url`, author link on detail page |
| `license` | Displayed in metadata `description`, attribution block, JSON-LD `license` |
| `pbFilter` | Value passed to PocketBase `filter("source = {:source}")` queries |

### Interface reference

```typescript
export interface ExternalSourceConfig {
  id: ExternalSourceId
  label: string
  icon: string
  cdnBase: string
  website: string
  authorName: string
  authorLogin: string
  authorUrl: string
  license: string
  pbFilter: string
}
```

---

## Step 2 — Update the PocketBase migration

**File:** `web/backend/pb_migrations/1777632695_created_external_icons.js`

The `source` field is a `select` with an allowlist of valid values. You must add your new source ID to this list.

### Create a new migration

Create a new file in `web/backend/pb_migrations/` (timestamp it to sort after the existing one):

```javascript
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("external_icons")
  const sourceField = collection.fields.find(f => f.name === "source")
  sourceField.values = ["selfhst", "yoursource"]
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("external_icons")
  const sourceField = collection.fields.find(f => f.name === "source")
  sourceField.values = ["selfhst"]
  return app.save(collection)
})
```

### Schema reference

The `external_icons` collection has these fields:

| Field | Type | Description |
|-------|------|-------------|
| `source` | `select` | Source identifier (must match `pbFilter` in constants) |
| `slug` | `text` (required) | Unique icon slug within the source |
| `name` | `text` (required) | Human-readable icon name |
| `aliases` | `json` | Array of alternate names for search |
| `categories` | `json` | Array of category strings |
| `formats` | `json` | Array of available formats (`["svg", "png", "webp"]`) |
| `variants` | `json` | `{ light?: boolean, dark?: boolean }` |
| `url_templates` | `json` | Custom URL patterns per format (overrides CDN fallback) |
| `license` | `text` | License string |
| `attribution` | `text` | Full attribution text |
| `source_url` | `url` | Link to the icon on the source website |
| `updated_at_source` | `date` | When the icon was last updated upstream |

There is a unique index on `(source, slug)`, so the same slug can exist under different sources without conflict.

---

## Step 3 — Write the importer script

**File:** `web/scripts/import-yoursource.ts`

The importer is a standalone TypeScript script that:
1. Reads the source's manifest/index (JSON, CSV, API, etc.)
2. Transforms each entry into an `external_icons` PocketBase record
3. Upserts (create or update) each record

### Reference implementations

- `scripts/import-selfhst.ts` — flat CDN structure, CSV manifest, simple slug-suffix variants
- `scripts/import-lobehub.ts` — GitHub tree API manifest, frontmatter metadata parsing, variant grouping with `-color` primary, separate light/dark directories

Use the selfh.st importer as a starting template. Key patterns:

```typescript
import PocketBase from "pocketbase"

const SOURCE = "yoursource"        // Must match pbFilter in constants.ts
const ATTRIBUTION = "Icons by Your Source (MIT)"
const LICENSE = "MIT"               // Must match license in constants.ts
const SOURCE_URL = "https://yoursource.com/icons/"
const CDN_BASE = "https://cdn.jsdelivr.net/gh/org/repo"

// 1. Read your source's manifest
const manifest = await fetchOrReadManifest()

// 2. Connect to PocketBase
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || process.env.PB_URL)
await pb.collection("_superusers").authWithPassword(process.env.PB_ADMIN!, process.env.PB_ADMIN_PASS!)

// 3. Pre-fetch existing records to avoid N+1
const existing = await pb.collection("external_icons").getFullList({
  filter: pb.filter("source = {:source}", { source: SOURCE }),
  fields: "id,slug",
  requestKey: null,
})
const existingBySlug = new Map(existing.map(r => [r.slug, r.id]))

// 4. Upsert loop
for (const entry of manifest) {
  const record = {
    source: SOURCE,
    slug: entry.slug,
    name: entry.name,
    aliases: entry.aliases ?? [],
    categories: entry.categories ?? [],
    formats: ["svg", "png", "webp"],  // derive from manifest
    variants: { light: false, dark: false },
    url_templates: buildUrlTemplates(entry),
    license: LICENSE,
    attribution: ATTRIBUTION,
    source_url: SOURCE_URL,
    updated_at_source: entry.updatedAt ?? null,
  }

  const existingId = existingBySlug.get(record.slug)
  if (existingId) {
    await pb.collection("external_icons").update(existingId, record)
  } else {
    await pb.collection("external_icons").create(record)
  }
}
```

### URL templates

The `url_templates` field lets you define custom URL patterns per format. Use `{slug}` as a placeholder:

```typescript
{
  svg: "https://cdn.jsdelivr.net/gh/org/repo/svg/{slug}.svg",
  png: "https://cdn.jsdelivr.net/gh/org/repo/png/{slug}.png",
  svg_light: "https://cdn.jsdelivr.net/gh/org/repo/svg/{slug}-light.svg",
  svg_dark: "https://cdn.jsdelivr.net/gh/org/repo/svg/{slug}-dark.svg",
  png_light: "https://cdn.jsdelivr.net/gh/org/repo/png/{slug}-light.png",
  png_dark: "https://cdn.jsdelivr.net/gh/org/repo/png/{slug}-dark.png",
}
```

**Important:** You must emit explicit templates for every format+theme combination your source supports (e.g. `svg_light`, `png_dark`, `webp_light`). The UI only renders variant cards when the exact template key exists — there is no runtime guessing of themed paths. Different sources use different CDN path conventions (e.g. selfh.st uses `{slug}-dark.png` in a flat directory, LobeHub uses `dark/{slug}.png` in separate directories), so templates must be explicit.

If `url_templates` is empty, the URL resolver falls back to `{cdnBase}/{format}/{slug}.{format}` using the `cdnBase` from your source config.

### Variant merging

If your source has multiple variants of the same icon (e.g. `openai`, `openai-color`, `openai-text`), you should group them by base name and pick one as the primary entry. The LobeHub importer demonstrates this pattern:

- Group slugs by stripping suffixes like `-color`, `-text`, `-avatar`
- Prefer the `-color` variant as the primary slug (it's shown in the browse grid)
- Store the other variants as aliases on the primary record (searchable but not separate cards)
- Clean up old non-primary records on re-import

See `scripts/import-lobehub.ts` `groupSlugs()` for the reference implementation.

### CLI flags

Both import scripts support `--purge` (delete all records for the source) and `--dry-run` (log without writing). Consider adding these to your importer for easier debugging and data management.

### .gitignore

Make sure your importer script is tracked. The `.gitignore` has a pattern to ignore `scripts/*` but allows specific files:

```gitignore
scripts/*
!scripts/import-selfhst.ts
!scripts/import-yoursource.ts
```

---

## Step 4 — Create the GitHub Actions workflow

**File:** `.github/workflows/sync-yoursource.yml`

```yaml
name: Sync yoursource icons

on:
  schedule:
    - cron: "0 5 * * *"        # Daily at 05:00 UTC (adjust as needed)
  workflow_dispatch:            # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml

      - run: cd web && pnpm install --frozen-lockfile

      - name: Fetch yoursource manifests
        run: |
          cd web
          mkdir -p data/sources/yoursource
          curl -fsSL https://example.com/manifest.json -o data/sources/yoursource/index.json

      - name: Import external icons
        env:
          NEXT_PUBLIC_POCKETBASE_URL: ${{ secrets.PB_URL }}
          PB_ADMIN: ${{ secrets.PB_ADMIN }}
          PB_ADMIN_PASS: ${{ secrets.PB_ADMIN_PASS }}
        run: cd web && pnpm exec tsx scripts/import-yoursource.ts
```

### Required repository secrets

| Secret | Description |
|--------|-------------|
| `PB_URL` | PocketBase instance URL (e.g. `https://pb.dashboardicons.com`) |
| `PB_ADMIN` | PocketBase superuser email |
| `PB_ADMIN_PASS` | PocketBase superuser password |

---

## Step 5 — Allow remote images in `next.config.ts`

**File:** `web/next.config.ts`

Add a `remotePatterns` entry for the CDN your source uses:

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "cdn.jsdelivr.net",
      pathname: "/gh/selfhst/icons/**",   // existing
    },
    {
      protocol: "https",
      hostname: "cdn.jsdelivr.net",
      pathname: "/gh/org/repo/**",         // your new source
    },
  ],
},
```

If the source uses a different hostname entirely:

```typescript
{
  protocol: "https",
  hostname: "icons.yoursource.com",
  pathname: "/**",
},
```

---

## Step 6 — Add Playwright tests

**File:** `web/tests/external-icons.spec.ts`

Add a test block for your new source. Follow the existing selfh.st pattern:

```typescript
test.describe("External yoursource icons", () => {
  test("source filter narrows browse results to yoursource", async ({ page }) => {
    await page.goto("/icons?source=yoursource")
    await expect(page.getByRole("button", { name: /your source/i })).toBeVisible()

    const firstExternalCard = page.locator('a[href^="/icons/external/"]').first()
    await expect(firstExternalCard).toBeVisible()
  })

  test("external detail page renders attribution", async ({ page }) => {
    await page.goto("/icons/external/some-known-slug")

    await expect(page.getByRole("heading", { name: /some-known-slug/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /view on your source/i })).toBeVisible()
  })
})
```

---

## What happens automatically

Once you complete steps 1–5 and the importer populates PocketBase, **every UI touchpoint picks up the new source automatically**. Here is exactly what each component does and why no changes are needed:

### Homepage hero — `src/components/hero.tsx`

The `NumberTicker` displays the total icon count (native + all external). On hover, a `HoverCard` popover iterates over `sourceCounts` (returned by `getTotalIcons()` in `src/lib/api.ts`) and renders a row for each source with its `icon`, `label`, and count.

### Source filter dropdown — `src/components/icon-search.tsx`

The dropdown renders one `DropdownMenuRadioItem` per entry in `EXTERNAL_SOURCE_IDS`, using `EXTERNAL_SOURCES[sourceId].icon` and `.label`. Selecting a source filters the icon grid to only show icons matching that `source` value. The filter button itself shows the selected source's icon instead of the generic filter icon.

### Icon card badges — `src/components/icon-card.tsx`

When an icon has `source !== "native"`, hovering the card reveals a banner above it showing the source icon and "from {label}". External previews use `getExternalIconPreviewUrl()`. Sources that need app-theme-specific behavior can add a source-specific card treatment; Simple Icons uses one black SVG and CSS inversion in dark mode so only one preview asset is loaded. Native icons similarly use `iconData.colors.dark`/`.light` for theme-aware previews.

### Detail page — `src/components/icon-details.tsx`

The unified `IconDetails` component handles external icons via the `externalIcon` prop:
- Badge overlay with source icon + label
- Attribution block with `externalIcon.attribution` and `externalIcon.license`
- "View on" button linking to `externalIcon.source_url` with the source icon
- Format/variant sections derived from `externalIcon.formats` and `externalIcon.variants`
- SVG customizer when SVG format is available

### Detail page route — `src/app/icons/external/[slug]/page.tsx`

All external icons share this single route. `generateStaticParams()` calls `getExternalIcons()` which fetches icons from **all** registered sources. Metadata (title, Open Graph, JSON-LD) uses `EXTERNAL_SOURCES[icon.source]` for labels, license, and author info.

### CMD+K palette — `src/components/command-menu.tsx`

The command menu receives all icons (native + external) from the header. For each result, it checks if `source !== "native"` and shows a source badge. Selecting an external icon navigates to `/icons/external/${slug}`.

### Header — `src/components/header.tsx`

On mount, loads both `getIconsArray()` (native) and `getExternalIcons()` (all external) and passes the merged array to `CommandMenu`.

### Browse page — `src/app/icons/page.tsx`

Merges native and external icons. The subtitle dynamically lists all registered source labels: *"Search through N icons from Dashboard Icons and selfh.st, Your Source."*

### Sitemap — `src/app/sitemap.ts`

Iterates over all external icons and generates `<url>` entries with `<image>` tags for each supported format (svg, png, webp).

### API layer — `src/lib/api.ts`

`getTotalIcons()` dynamically imports `getExternalIcons()` and returns per-source counts in `sourceCounts`, keyed by `ExternalSourceId`.

### Data layer — `src/lib/external-icons.ts`

`fetchAllExternalIcons()` calls `EXTERNAL_SOURCE_IDS.map(fetchExternalIconsForSource)` — each source gets its own PocketBase query filtered by `pbFilter`. Results are merged and cached with an in-memory TTL.

### URL resolution — `src/lib/external-icon-urls.ts`

`resolveExternalIconUrl()` first checks `url_templates[key]` for an exact match (for example `png_dark`). Sources with deterministic URL layouts can define a source-specific fallback builder; other sources use `{cdnBase}/{format}/{slug}.{format}`. `canResolveExternalIconUrl()` only reports fallback keys explicitly supported by that source, preventing invented variants such as `-auto.svg`. The detail page also checks the icon's declared formats and variants before rendering a card.

### Types — `src/types/icons.ts`

`ExternalIcon.source` and `ExternalIconRecord.source` are typed as `ExternalSourceId`. Adding a new member to the union automatically enforces type safety across the codebase.

---

## Full file reference

Files you **must** touch:

| File | What to change |
|------|----------------|
| `web/src/constants.ts` | Add to `ExternalSourceId` union + `EXTERNAL_SOURCES` object |
| `web/backend/pb_migrations/<timestamp>.js` | New migration adding the source to the `source` select field |
| `web/scripts/import-<source>.ts` | New importer script |
| `.github/workflows/sync-<source>.yml` | New scheduled workflow |
| `web/next.config.ts` | Add `remotePatterns` entry for the CDN |
| `web/.gitignore` | Add `!scripts/import-<source>.ts` exception |

Files you **should** touch:

| File | What to change |
|------|----------------|
| `web/tests/external-icons.spec.ts` | Add Playwright test block |
| `web/README.md` | Document the new source |

Files that pick up changes **automatically** (no edits needed):

| File | What it does |
|------|--------------|
| `web/src/components/hero.tsx` | Popover shows new source row |
| `web/src/components/icon-search.tsx` | Filter dropdown renders new source |
| `web/src/components/icon-card.tsx` | Badge shows new source icon + label |
| `web/src/components/icon-details.tsx` | Detail page renders source attribution |
| `web/src/components/command-menu.tsx` | CMD+K shows source badge on results |
| `web/src/components/header.tsx` | Loads all external icons for CMD+K |
| `web/src/app/icons/page.tsx` | Browse page merges new source icons |
| `web/src/app/icons/external/[slug]/page.tsx` | Static detail pages generated for all sources |
| `web/src/app/sitemap.ts` | Sitemap includes new source URLs |
| `web/src/lib/api.ts` | `getTotalIcons()` includes new source count |
| `web/src/lib/external-icons.ts` | Fetches + caches new source from PocketBase |
| `web/src/lib/external-icon-urls.ts` | Resolves URLs using new source's `cdnBase` |
| `web/src/types/icons.ts` | Type union updated via `ExternalSourceId` |

---

## Lessons from the LobeHub integration

These are pitfalls encountered during the LobeHub integration that future integrators should be aware of:

1. **Explicit templates are mandatory.** Different sources use different CDN conventions. selfh.st puts light/dark in the slug (`icon-dark.png`), LobeHub puts them in the path (`dark/icon.png`). The UI only renders variant cards when the exact template key exists — never rely on runtime URL construction.

2. **Variant merging avoids duplicate cards.** LobeHub has `openai`, `openai-color`, `openai-text` as separate SVGs. Without merging, each appears as a separate card. The `groupSlugs()` pattern picks `-color` as primary and stores the rest as aliases.

3. **`variants.light`/`dark` doesn't mean all formats have themes.** LobeHub has light/dark for PNG/WebP but not SVG. The `variants` flag is format-agnostic, so the UI must check `url_templates` for the specific format+theme key before rendering.

4. **Auth headers must be passed through.** The `fetchBrandMetadata` function initially hardcoded its fetch headers, ignoring the `GITHUB_TOKEN` passed from CI. This caused rate limiting on the GitHub raw content API.

5. **Sitemap and `generateStaticParams` need deduplication.** When multiple sources share a slug (e.g. `openai`), both sitemap and static params must deduplicate by slug to avoid build failures and duplicate URLs.

---

## Checklist

- [ ] Added source ID to `ExternalSourceId` union in `constants.ts`
- [ ] Added full config entry to `EXTERNAL_SOURCES` in `constants.ts`
- [ ] Created PocketBase migration adding source to the `source` select field
- [ ] Written importer script at `scripts/import-<source>.ts`
- [ ] Added `.gitignore` exception for the importer
- [ ] Created GitHub Actions workflow at `.github/workflows/sync-<source>.yml`
- [ ] Added `remotePatterns` entry in `next.config.ts`
- [ ] Added Playwright tests in `tests/external-icons.spec.ts`
- [ ] Updated `README.md` with source documentation
- [ ] Verified: `url_templates` has explicit keys for every format+theme combination
- [ ] Verified: variants are merged if applicable (e.g. `-color` as primary)
- [ ] Verified locally: importer runs with `--dry-run`, icons appear in browse, detail page renders
- [ ] Verified: source filter dropdown shows new source with its icon
- [ ] Verified: themed previews work in both light and dark modes
- [ ] Verified: CMD+K search returns new source icons with badge
- [ ] Verified: hero hover popover shows new source count
- [ ] Verified: `pnpm build` generates static pages for all new slugs
