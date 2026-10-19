# Variant metadata schema: colour wordmarks and custom variants

Researched 2026-10-19 against `metadata.json` at `23533fe7` and the upstream repos listed below. Every claim cites a primary source. **Inference** marks a conclusion that is not directly in a source.

Path convention: repo-root paths unless prefixed with `web/`. External repos were shallow-cloned at the commit shown.

| Tag   | Location                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HM`  | `github.com/homarr-labs/homarr` @ `43cac6ee`                                                                                                     |
| `HP`  | `github.com/gethomepage/homepage` @ `51cc168`                                                                                                    |
| `GL`  | `github.com/glanceapp/glance` @ `698db71`                                                                                                        |
| `DY`  | `github.com/Lissy93/dashy` @ `a0005e8`                                                                                                           |
| `GHT` | `https://docs.github.com/en/rest/git/trees` ("Get a tree")                                                                                       |
| `CDN` | `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/{format}/{stem}.{format}` (`web/src/constants.ts:1`, `web/src/lib/icons/urls.ts:12-14`) |

## TL;DR

- Metadata values are **file stems, not tones**. They break the `<slug>-<tone>` pattern often enough that consumers must read them, not derive them: 278 entries have `colors.dark === <slug>`, `apple` maps `colors.dark` to `apple-light`, `helix` maps wordmarks to `helix-light` and `helix-dark`, and `issabel-pbx` stores its colour wordmark as `wordmark.light`.
- **Every external consumer found tolerates added keys.** None validates strictly. Most of the ecosystem (Homarr, Homepage, Glance, Dashy, godoxy, Wallos) never reads `metadata.json`. They build CDN URLs from a stem or list files. A new file is therefore usable everywhere by name as soon as it exists on the CDN.
- **What must change is in this repo.** `scripts/convert_svg_assets.py` hard-codes `colors`/`wordmark` × `light`/`dark` in three places, so a new variant SVG never gets PNG/WebP outputs. A WebP-only animated variant gets deleted. The web catalog and MCP never expose wordmarks at all. `tree.json` and `meta/` are stale because CI no longer regenerates them.
- **Recommendation: Option A (additive).** Keep `colors`. Add `wordmark.default` for the colour wordmark. Add a top-level `variants` map, `{ <form>: { default?, light?, dark?, base? } }`, for custom forms. Keep values as stems. Use filenames `<slug>[-<form>][-light|-dark]`.

---

## 1. Current schema of `metadata.json`

**Shape** (types: `web/src/types/icons.ts:15-36`, `scripts/import-icon.ts:7-8,55-65`)

```jsonc
"<slug>": {
  "base": "svg" | "png",                   // source format for every file of the icon
  "aliases": string[],
  "categories": string[],
  "update": { "timestamp": string, "author": { "id": number|string, "name"?: string, ... } },
  "colors"?:   { "light"?: "<stem>", "dark"?: "<stem>" },
  "wordmark"?: { "light"?: "<stem>", "dark"?: "<stem>" }
}
```

`light` means the light-coloured file for dark backgrounds. `dark` means the dark file for light backgrounds. Values are stems, without a folder or extension. The writer derives them from the destination filename (`scripts/import-icon.ts:366`). Readers pass them straight to `buildIconUrl(stem, format)` (`web/src/lib/icons/catalog.ts:269-284`).

**Counts** (computed from `metadata.json`)

| Field                                       | Count                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| entries                                     | 3,424 (`base: svg` 2,687, `base: png` 737)                                            |
| `colors` present                            | 672 (`light` 562, `dark` 637)                                                         |
| `wordmark` present                          | 150 (`light` 146, `dark` 128)                                                         |
| other top-level keys                        | none                                                                                  |
| `colors.dark === <slug>` (legacy)           | 278, e.g. `serviio`, `shell`, `discourse`, `hbo`                                      |
| `colors.light === <slug>` (legacy)          | 136, e.g. `control-d`, `ollama`, `todoist`                                            |
| `colors.*` not `<slug>` or `<slug>-<tone>`  | 1: `apple.colors.dark = "apple-light"`                                                |
| `wordmark.*` not `<slug>-wordmark[-<tone>]` | 3: `helix` → `helix-light` / `helix-dark`; `broadcom.wordmark.dark = "broadcom-dark"` |

The legacy pattern: when an icon was already coloured for one background, `colors.<tone>` points at the base stem rather than at a separate file.

**Orphan toneless wordmarks** (`svg|png|webp/*-wordmark.*`): two stems, both with all three formats.

- `issabel-pbx-wordmark`: referenced as `issabel-pbx.wordmark.light`, next to `wordmark.dark = "issabel-pbx-wordmark-dark"`. This is the de facto colour wordmark, filed under the `light` key.
- `ml-flow-wordmark`: its own metadata **entry** (there is no `ml-flow` entry). It has `colors: { light: "ml-flow-wordmark", dark: "ml-flow-wordmark-dark" }`, so the wordmark is modelled as a separate icon.

**Custom variants today are separate icons.** Examples: `radarr-3d` (`base: png`), `radarr-4k`, `radarr-dv`, `hermes-agent-alt` (with `colors.light = "hermes-agent-alt-light"`). Of the 3,424 slugs, **440 begin with another slug plus `-`**. Common suffixes: `alt` (16), `kawaii` (16), `full` (9), `calendar` (6), `mail` (4), `3d` (2), `4k` (2). Many of these are distinct products, not variants, e.g. `<vendor>-mail`. **A filename alone cannot tell a variant from a product.** Metadata must stay authoritative, and a new variant stem must not collide with an existing slug.

**Unreferenced files.** 8 SVG stems are not referenced by metadata: `atuin-light`, `cloud9-light`, `immich-frame-light`, `music-assistant-light`, `navidrome-light`, `watcharr-light`, `x-light`, `icon`. Seven of them also have PNG and WebP files, which shows that PNGs survive cleanup (see §2.3).

## 2. In-repo consumers

### 2.1 Web catalog and MCP (`web/src/lib/icons/*`, `web/src/mcp/tools/*`)

- `service.ts` fetches `metadata.json` from `raw.githubusercontent.com/.../main/metadata.json` (`web/src/constants.ts:4`, `service.ts:28-53`). It casts with `as IconFile` and does no runtime validation, so unknown keys are carried through.
- `urls.ts:4` defines `IconTheme = "default" | "light" | "dark"`. `buildIconUrl` (`:12-14`) returns `${BASE_URL}/${format}/${stem}.${format}`. Its `theme` argument derives `-light`/`-dark` by convention (`:6-10`). The catalog does not use that path: it passes metadata stems (`catalog.ts:283`).
- `catalog.ts:269-271`: `nativeFile(entry, theme)` returns `entry.name` for `default`, otherwise `entry.data.colors?.[theme]`. `nativeUrls` (`:273-284`) emits URLs only for `colors`. **`wordmark` is never exposed by the catalog or MCP.** `nativeUrls` also skips SVG when `base !== "svg"` (`:276`): format availability is per icon, not per variant.
- MCP output schemas fix the theme set. `get-icon.ts:13` uses `themedUrlsSchema = z.object({ default, light, dark })`, and `schemas.ts:7` uses `themeSchema = z.enum(["default","light","dark"])`. These are output and input schemas of our own tools. They do not read metadata, but exposing variants needs new fields there.
- UI: `web/src/components/icon-details.tsx` reads `colors.light/dark` and `wordmark.light/dark` explicitly (`:58,81-114,597-689,958-1061`). It also renders **every** key of `colors` via `Object.entries(iconData.colors)` (`:1035`). **Inference:** new tone keys put inside `colors` would show up as raw labels. Keep `colors` to `light`/`dark`.
- Submissions: PocketBase `extras` is an untyped JSON field (`web/backend/pb_migrations/1759319167_updated_submissions.js:12-17`), mirrored as `extras.colors` / `extras.wordmark` (`web/src/lib/pb.ts:33-45`). The audit hook loops over `["colors","wordmark"] × ["light","dark"]` (`web/backend/pb_hooks/dashboard.js:83-84`), and so does `web/src/lib/community.ts:56-77`.

### 2.2 `scripts/import-icon.ts` (the current publish path, run by `.github/workflows/add-icon.yml:99`)

- `VariantKey = "base" | "light" | "dark" | "wordmark-light" | "wordmark-dark"` (`:67`).
- `buildTargets` (`:181-220`) maps each key to a destination file: `<id>.<ext>`, `<id>-light`, `<id>-dark`, `<id>-wordmark-light`, `<id>-wordmark-dark`. **Every variant shares the base asset's extension** (`ext`, `:185`).
- `buildMetadataVariants` (`:356-381`) writes only `colors.{light,dark}` and `wordmark.{light,dark}`. `upsertMetadata` (`:384-415`) rebuilds the entry from those fields. **Inference:** any new key (`wordmark.default`, `variants`) is dropped on re-import unless this function carries it forward or produces it.

### 2.3 `scripts/convert_svg_assets.py` (run by `update_icons_and_resources.yml:45-51` and `validate_and_preview_icons.yml:27`)

Variant discovery is hard-coded to `colors|wordmark × light|dark` in three places:

- `get_all_variant_names` (`:312-336`), used for conversion and cleanup
- the `--force-retry` expansion (`:393-405`)
- `get_all_icon_variants` (`:284-310`), defined but unused

Behaviour verified in the code:

1. **SVG → PNG/WebP runs only for stems listed in metadata** (`:527-534`). A variant SVG whose stem is not in the set above is silently never rasterised.
2. **The cleanup is narrower than "delete unreferenced".** `valid_basenames` holds the converted SVG stems (`:575`), every PNG stem not already valid (the PNG-only loop adds it, `:620-636`), and all metadata stems (`:689-693`). `clean_up_files` then deletes PNG/WebP files outside that set (`:258-267,699-700`). In practice, **PNGs are never deleted** (except the excluded `icon`). A **WebP is deleted** when no PNG shares its stem and metadata does not list it.
3. **WebP is always regenerated from PNG** with PIL `Image.open(...).convert("RGBA").save(..., "WEBP")` (`:245-246`) whenever the PNG is newer (`:234-243`). **Inference:** an animated WebP stored next to a same-stem PNG would be overwritten by a static frame. A WebP-only animated file is deleted unless metadata lists it. Inkscape PNG export (`:190-202`) of an animated SVG yields a static frame.

**What a new variant needs in order to survive:** its stem must be returned by `get_all_variant_names` (and the force-retry block). An animated raster variant also needs to be excluded from PNG→WebP regeneration, or kept in a source format the script does not touch.

### 2.4 `tree.json` and `meta/*.json`

- `scripts/generate_file_tree.py:7-22,38-40` lists every file in the given folders, so it is variant-agnostic. But the `generate_file_tree` job in `update_icons_and_resources.yml:63-86` only runs `git add tree.json`. **It never runs the script.** `tree.json` was last changed by hand in `bb5749ad` (2026-09-19). It lists 2,799 PNGs, against 4,459 on disk.
- `meta/` holds 2,363 files against 3,424 metadata entries, and was last touched in `bb5749ad`. Nothing in the current `add-icon.yml` path writes it.
- The legacy, issue-label workflows `on_icon_addition_approved.yml` and `on_icon_update_approved.yml` used to run `generate_file_tree.py` and `generate_metadata.py`, and `generate_metadata.py` rebuilt `metadata.json` from `meta/*.json`. Had either workflow run, it would have dropped the roughly 1,061 entries that `meta/` lacks. Both workflows and `generate_metadata.py` were deleted with #2971, so that risk no longer applies. `generate_file_tree.py` is kept for the `tree.json` fix.

## 3. External consumers

### 3.1 Homarr (`HM`): file-tree based, ignores metadata

- `HM/packages/icons/src/icons-fetcher.ts:7-14` indexes dashboard-icons through the **GitHub git-trees API** (`/git/trees/main?recursive=true`), with URL template `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/{0}`, where `{0}` is the repo path.
- `HM/packages/icons/src/repositories/github.icon-repository.ts:51-70` keeps every tree entry whose extension is allowed. The allowed list is `[".png", ".svg", ".jpeg"]` (`icon-repository.ts:10`), so **WebP and GIF are ignored**. If `truncated` is true, the whole repository is dropped (`:47-49`). The API limit is 100,000 entries / 7 MB (`GHT`). The repo has 15,439 entries today (`gh api .../git/trees/main?recursive=true`).
- `HM/packages/cron-jobs/src/jobs/icons-updater.ts:80` stores `name: icon.fileNameWithExtension`. App icon auto-match is `LIKE %name%` on that column (`HM/packages/icons/src/auto-icon-searcher.ts:5-8`, used at `HM/packages/api/src/router/app.ts:234`).
- Docker label discovery builds `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/${ext}/${name}.${ext}` (`HM/packages/docker/src/discovery/parse-container-labels.ts:36-40`).
- Repo-wide grep: no reference to `metadata.json`, `tree.json`, `colors` or `wordmark` for dashboard-icons.
- **Effect of a schema change: none.** Any new file appears as its own pickable icon. **Inference:** animated variants shipped only as WebP or GIF would be invisible in Homarr's picker. An SVG (SMIL/CSS) animated variant would appear.

### 3.2 Other consumers (verified at the cited blob)

| Consumer                                                                                                                                                                            | Reads                                                                                                                                                                                     | Effect of new keys or files                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Homepage (`HP/src/components/resolvedicon.jsx:99-141`)                                                                                                                              | User stem + extension → `CDN`                                                                                                                                                             | None. New stems work by name.                                                                                                |
| Glance (`GL/internal/glance/config-fields.go:152-167`)                                                                                                                              | `di:<stem>[.ext]` → `CDN`; ext limited to svg/png/webp                                                                                                                                    | None.                                                                                                                        |
| Dashy (`DY/src/utils/config/defaults.js:207-210`)                                                                                                                                   | `hl-<icon>` → `CDN` svg, png fallback                                                                                                                                                     | None.                                                                                                                        |
| godoxy ([`list_icons.go`](https://github.com/yusing/godoxy/blob/9105c6e0f70065ce904b12518637e89e42696f6e/internal/homepage/icons/list/list_icons.go))                               | `tree.json` (`:44`); strips a trailing `-light`, then `-dark`, from each filename and folds the result into the key (`:380-401`)                                                          | None. Tone-last names fold correctly (`x-wordmark-dark` → key `x-wordmark`, `Dark`). Sees only what stale `tree.json` lists. |
| Wallos ([`icon_search.php`](https://github.com/ellite/Wallos/blob/c98f30305632cf040785cdddff47617e212e4ca6/endpoints/logos/icon_search.php))                                        | `tree.json` `png` list; skips `-(light\|dark)$` (`:88-99`)                                                                                                                                | None. `x-wordmark`, `x-animated` show as standalone results.                                                                 |
| iconic ([`dashboard-icons.ts`](https://github.com/daniel-mader/iconic/blob/90fa6151451e7a14c6e53334bc800aa9df9e010c/src/lib/dashboard-icons/dashboard-icons.ts))                    | `metadata.json`; type-guards `colors`/`wordmark` and picks only `.light`/`.dark` (`:33-61`); drops `colors` values equal to the slug; notes "`tree.json` is not kept up to date" (`:7-8`) | Ignores `wordmark.default` / `variants` (invisible, not broken).                                                             |
| homerun ([`dashboard-icons.service.ts`](https://github.com/orochibraru/homerun/blob/fc06c5b265ad71e860b2b3a068349b564f7bffb6/src/lib/services/dashboard-icons.service.ts))          | `metadata.json` `colors` as `Record<string, unknown>` (`:61-71`); builds `${name}-light/-dark` by convention (`:92-104`)                                                                  | None (unknown keys ignored). It already mis-resolves `apple`.                                                                |
| nextdash ([`icon_sets_index.go`](https://github.com/jordibrouwer/nextdash/blob/f4603f6db31862dbb406a82da625c0aab38c3739/internal/app/icon_sets_index.go))                           | Go struct `{base, aliases, colors{light,dark}}` (`:70-75`)                                                                                                                                | None. `encoding/json` ignores unknown fields by default.                                                                     |
| omega-tab ([`dashboard_icons.rs`](https://github.com/evanbrobertson/omega-tab/blob/15b46c0ccb532c843cdd16856de945833cadd84f/server/src/dashboard_icons.rs))                         | serde `{aliases, categories}` with `#[serde(default)]`, no `deny_unknown_fields` (`:39-45`)                                                                                               | None.                                                                                                                        |
| ctrlcenter ([`icon-cache.ts`](https://github.com/boostctrl/ctrlcenter/blob/dabf36f2471218526ec9de77a001c7714fc4d47f/lib/icon-cache.ts))                                             | `metadata.json`; keeps only string `colors.light/dark` (`:392-400`)                                                                                                                       | None.                                                                                                                        |
| vicinae extension ([`dashboard-icons.ts`](https://github.com/vicinaehq/extensions/blob/0e3953058fb787d2a96e5ac0cec462440c07cd07/extensions/dashboard-icons/src/dashboard-icons.ts)) | TS type with optional `colors.{dark,light}` (`:26-28`)                                                                                                                                    | None.                                                                                                                        |

GitHub code search finds 94 files referencing `dashboard-icons` together with `metadata.json`, and 70 with `tree.json`. The table samples the most-used ones. **No sampled consumer validates `metadata.json` strictly** (no zod, `deny_unknown_fields` or JSON Schema). **Inference:** additive keys are safe, and so are new `-<tone>`-suffixed files. What would break consumers: renaming or removing `colors`/`wordmark`, changing `light`/`dark` semantics, renaming existing stems, or turning values from strings into objects.

## 4. Schema options

The shared filename convention, used by all options:

| Variant                   | Stem                              | CDN (`svg` shown; also `png/`, `webp/`) |
| ------------------------- | --------------------------------- | --------------------------------------- |
| icon, colour              | `<slug>`                          | `…/svg/<slug>.svg`                      |
| icon, light (dark bg)     | `<slug>-light`                    | `…/svg/<slug>-light.svg`                |
| icon, dark (light bg)     | `<slug>-dark`                     | `…/svg/<slug>-dark.svg`                 |
| wordmark, colour          | `<slug>-wordmark`                 | `…/svg/<slug>-wordmark.svg`             |
| wordmark, light / dark    | `<slug>-wordmark-light` / `-dark` | `…/svg/<slug>-wordmark-light.svg`       |
| custom form, colour       | `<slug>-<form>`                   | `…/svg/<slug>-animated.svg`             |
| custom form, light / dark | `<slug>-<form>-light` / `-dark`   | `…/svg/<slug>-animated-dark.svg`        |

Rules: `<form>` is kebab-case and not in `{light, dark, wordmark}`. The tone always comes last, which keeps godoxy and Wallos suffix parsing correct. The resulting stem must not equal an existing slug (440 slugs already look like `<slug>-<word>`). New files follow the convention. **Legacy stems stay as they are**, because metadata values remain the source of truth. The base URL is `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons` (`web/src/constants.ts:1`).

### Option A: additive (`wordmark.default` + `variants` map). **Recommended**

```jsonc
"selfh-st": {
  "base": "svg", "aliases": [], "categories": [], "update": { ... },
  "colors":   { "light": "selfh-st-light", "dark": "selfh-st-dark" },
  "variants": {
    "animated": { "default": "selfh-st-animated", "dark": "selfh-st-animated-dark" }
  }
},
"issabel-pbx": {
  "base": "svg", ...,
  "colors":   { "light": "issabel-pbx", "dark": "issabel-pbx-dark" },
  "wordmark": { "default": "issabel-pbx-wordmark", "light": "issabel-pbx-wordmark-light", "dark": "issabel-pbx-wordmark-dark" }
}
```

- `default` matches the existing `IconTheme` vocabulary (`web/src/lib/icons/urls.ts:4`; MCP `themeSchema`). Avoid the name `base`, which already means the source format.
- A custom variant may carry an optional `"base": "png"|"svg"|"webp"` to override the icon's format. This covers raster-only animations, since today every file of an icon shares `base` (`import-icon.ts:185`, `catalog.ts:276`).
- The icon form stays in `colors`. The base `default` is implicit as `<slug>`, as today.
- **Backward compatibility:** fully additive. Old readers of `wordmark.light/dark` keep working. Old readers ignore `wordmark.default` and `variants` (§3.2).
- **Migration cost:** low.
  - Data: `issabel-pbx` can move `wordmark-light → default` once a real light wordmark exists, or stay as is. `ml-flow-wordmark` can optionally fold into a new `ml-flow` entry, keeping the old key as an alias or redirect. `radarr-3d` and `hermes-agent-alt` can fold in later, one by one.
  - Code: extend the variant set in `convert_svg_assets.py` (`:312-336,393-405`) and `import-icon.ts` (`:67,181-220,356-381`); `types/icons.ts`, `pb.ts`, `community.ts` and `dashboard.js:83`; plus `catalog.ts` and the MCP schemas to expose the new URLs.

### Option B: unified `variants` map, keeping `colors`/`wordmark` as derived mirrors

```jsonc
"selfh-st": {
  "base": "svg", ...,
  "variants": {
    "icon":     { "default": "selfh-st", "light": "selfh-st-light", "dark": "selfh-st-dark" },
    "animated": { "default": "selfh-st-animated", "dark": "selfh-st-animated-dark" }
  },
  "colors": { "light": "selfh-st-light", "dark": "selfh-st-dark" }          // generated mirror
}
```

- One code path for all forms (`form × tone`), with `wordmark` as just another form.
- **Backward compatibility:** preserved only if `colors`/`wordmark` keep being written. Dual-writing means two sources of truth. **Inference:** drift is likely, given that the existing derived artefacts (`tree.json`, `meta/`) have already drifted (§2.4).
- **Migration cost:** medium. All 3,424 entries are rewritten, and every in-repo reader moves to `variants`. External readers stay on the mirrors indefinitely, because they cannot be migrated.

### Option C: flat list of variant records

```jsonc
"selfh-st": {
  "base": "svg", ...,
  "colors": { "light": "selfh-st-light", "dark": "selfh-st-dark" },
  "variants": [
    { "form": "animated", "tone": "default", "file": "selfh-st-animated",      "formats": ["svg"] },
    { "form": "animated", "tone": "dark",    "file": "selfh-st-animated-dark", "formats": ["svg"] },
    { "form": "wordmark", "tone": "default", "file": "selfh-st-wordmark",      "formats": ["svg","png","webp"] }
  ]
}
```

- The most explicit. It records formats per file, which suits mixed raster/vector animated variants, and leaves room for future attributes (`label`, `animated: true`).
- **Backward compatibility:** additive, like A, if `colors`/`wordmark` stay.
- **Migration cost:** medium to high. It duplicates what `wordmark` already says, and lookups need a scan instead of `variants[form][tone]`. Every tool needs a validator for (form, tone) uniqueness.

### Recommendation

**Option A.** It is the only option that is purely additive for the 150 existing wordmark entries and the 672 `colors` entries. It needs no dual-write. It fits the `form × tone` model directly: `colors` is the icon form, `wordmark` is the wordmark form, and `variants[form]` covers custom forms, each with `default | light | dark`. The optional per-variant `base` covers the one gap Option C solves (format per variant) without its cost.

Prerequisites, whichever option is chosen:

1. A single `variant_stems(entry)` helper in `convert_svg_assets.py`, used by conversion, cleanup and force-retry. Exclude animated raster variants from PNG→WebP regeneration.
2. Fix the `generate_file_tree` job so it runs `generate_file_tree.py` (`update_icons_and_resources.yml:63-86`). godoxy and Wallos only see what `tree.json` lists.
3. Enforce the stem collision rule at import time: the variant stem must not be an existing slug.
4. Ship animated variants as SVG where possible. **Inference:** Homarr (`.png/.svg/.jpeg` only) and the PNG pipeline (static frame) cannot show WebP or GIF animation.
