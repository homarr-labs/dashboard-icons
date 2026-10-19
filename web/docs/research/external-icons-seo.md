# External icon pages: SEO audit

Researched 2026-10-19 against the live site (`https://dashboardicons.com`) and this worktree. Every claim cites a file, a live response or a primary source. **Verified** = observed in code or live HTML. **Inference** = reasoning from those facts, not observed.

Path convention: paths are relative to `web/` unless noted.

| Tag       | Source                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------- |
| `LIVE`    | `curl` of `https://dashboardicons.com/...` on 2026-10-19 (sitemap, robots.txt, pages listed below) |
| `GSpam`   | https://developers.google.com/search/docs/essentials/spam-policies                                 |
| `GCanon`  | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls             |
| `GSm`     | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap                 |
| `GImgSm`  | https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps                |
| `GImgLic` | https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata        |
| `GImg`    | https://developers.google.com/search/docs/appearance/google-images                                 |
| `GLinks`  | https://developers.google.com/search/docs/crawling-indexing/links-crawlable                        |
| `GJs`     | https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics       |
| `GRobots` | https://developers.google.com/search/docs/crawling-indexing/robots/intro                           |
| `GHelp`   | https://developers.google.com/search/docs/fundamentals/creating-helpful-content                    |
| `NSm`     | https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps                              |

Pages fetched (`LIVE`): `/icons/external/{1password,dev-push,claude,alibaba-color,alibaba-brand-color,alibaba-text-cn,alpinelinux,this-does-not-exist-xyz}`, `/icons/1password`, `/icons`, `/`, `/og/external/{1password,nope-xyz}`, `/api/icons/external/simpleicons/alpinelinux/brand.png`.

## TL;DR: what is broken

1. **127 Simple Icons and an unknown number of LobeHub icons have no page at all.** The URL is `/icons/external/[slug]` with no source segment, and lookup returns the first source that has the slug (`src/lib/external-icons.ts:140-148`, sources iterated selfhst → lobehub → simpleicons, `src/constants.ts:28-67`). The sitemap and `generateStaticParams` dedupe by slug too (`src/app/sitemap.ts:55`, `src/app/icons/external/[slug]/page.tsx:16-23`). Of 2,838 Simple Icons slugs not already native, 127 are shadowed (114 by selfh.st, 13 by LobeHub), e.g. `claude`, `cursor`, `debian`, `digitalocean`, `etsy`, `fedex`, `freebsd` (`LIVE` sitemap vs `https://cdn.jsdelivr.net/npm/simple-icons@latest/data/simple-icons.json`). `/icons/external/claude` serves the selfh.st icon (`LIVE` title "Claude Icon & Logo (selfh.st)"). The slug `lobehub` itself resolves to selfh.st.
2. **The `/icons` browse page shows Google no icons.** It renders an empty `<Suspense>` shell and loads the catalogue client-side from `/api/icons/search` (`src/app/icons/page.tsx:50-52`, `src/components/icons-browser.tsx:13`, `src/hooks/use-icon-catalog.ts:10`). `robots.txt` disallows `/api/` (`src/app/robots.ts:10`, `LIVE`). The served HTML has 0 links to any icon page (`LIVE`). Google: "if the absence of these resources make the page harder for Google's crawler to understand the page, don't block them" (`GRobots`).
3. **External icon pages are orphans.** They contain 0 links to other icon pages (`LIVE` 1password, alpinelinux, alibaba-color). The home page links to 20 native icons only (`LIVE`). Discovery of all 6,036 external URLs depends on the sitemap alone. Google only follows `<a href>` links (`GLinks`).
4. **Every external `<lastmod>` is the day the sitemap was generated.** All 6,036 external entries read `2026-10-19` (`LIVE`). The sitemap reads `icon.external.updated_at_source || updated || created` (`src/app/sitemap.ts:67-69`). The "lite" list record drops those three fields (`src/lib/external-icons.ts:41-56`), so it always falls through to `Date.now()`. Google uses `lastmod` only "if it's consistently and verifiably … accurate" (`GSm`).
5. **1,334 brands have two indexable, self-canonical pages that don't link to each other**: `/icons/<slug>` (native) and `/icons/external/<slug>` (1,324 selfh.st, 9 LobeHub, 1 Simple Icons) (`LIVE` sitemap intersection). For example, `/icons/1password` and `/icons/external/1password` each set a self canonical, and neither links to the other (`LIVE`). Simple Icons already skips native slugs at import (`scripts/import-simple-icons.ts:130-137`); selfh.st and LobeHub do not.
6. **LobeHub pages show "Updated on: 1 January 1970".** `updated_at_source` is set to `null` (`scripts/import-lobehub.ts:257`). The `external_icons` collection has no `created`/`updated` autodate fields (`backend/pb_migrations/1777632695_created_external_icons.js`, no `autodate` in any of its 3 migrations), so the timestamp falls back to `new Date(0)` (`src/lib/external-icons.ts:29`). It is rendered in `src/components/icon-details.tsx:811` (`LIVE` alibaba-color).
7. **The licence is wrong or missing in the visible text and in JSON-LD.**
   - Simple Icons pages say "License: Not specified by Simple Icons" (`src/components/icon-details.tsx:917`, `LIVE` alpinelinux), but the project is CC0-1.0 (https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Only 224 of 3,466 upstream entries carry a per-icon `license` (`simple-icons.json`), and the importer only stores that per-icon value (`scripts/import-simple-icons.ts:139`).
   - No source sets `license_url` for selfh.st or LobeHub (`scripts/import-selfhst.ts:113-115`, `scripts/import-lobehub.ts:254-256`), so the `ImageObject.license` property is absent (`LIVE` 1password JSON-LD).
   - On Simple Icons pages, `acquireLicensePage` points at the brand's website (for example `https://alpinelinux.org`) because it falls back to `source_url` (`page.tsx:153`, `LIVE`).

## 1. Current state, end to end (verified)

### Routes, status codes, caching

- One route, `src/app/icons/external/[slug]/page.tsx`: `dynamicParams = true`, `dynamic = "force-static"`, `revalidate = 900` (`:9-11`). Pages are prerendered at build unless `PRERENDER_ICON_PAGES=false` (`:14`).
- `LIVE` headers on hits and misses: `cache-control: s-maxage=900, stale-while-revalidate=31535100`, `x-nextjs-prerender: 1`.
- Unknown slug → **404** (`LIVE` `this-does-not-exist-xyz`), via `notFound()` (`page.tsx:35-37,124-126`). This is not a soft 404.
- `/og/external/<unknown>` → **200** image (`LIVE`). Minor: `/og/` is disallowed in robots, so this does not affect indexing.
- The Simple Icons PNG proxy `/api/icons/external/simpleicons/<slug>/<variant>.png` → 200 `image/png`, `cache-control: public, max-age=86400, s-maxage=604800` (`LIVE`). It is explicitly allowed in robots (`src/app/robots.ts:9`).

### Metadata (`page.tsx:31-118`)

| Field         | Value                                                                                                              | Notes                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `${name} Icon & Logo (${sourceLabel})` + layout template `%s \| Dashboard Icons & Logos` (`src/app/layout.tsx:39`) | Unique per slug. On LobeHub, names derived from slugs produce titles like "Alibaba Text Cn Icon & Logo" (`LIVE`). Native titles use the raw slug, e.g. "1password Icon & Logo" vs external "1Password" (`LIVE`). |
| `description` | "Download the X icon and logo from {source} via Dashboard Icons. Licensed under {licence}."                        | Templated. Missing the licence sentence on Simple Icons (empty per-icon licence, `LIVE`).                                                                                                                        |
| canonical     | self, `https://dashboardicons.com/icons/external/<slug>` (`:114-116`)                                              | Correct for unique pages. Duplicates are covered in TL;DR 5.                                                                                                                                                     |
| robots        | `index, follow`, `max-image-preview: large` (`:72-83`)                                                             | No noindex mistakes found.                                                                                                                                                                                       |
| OG/Twitter    | `/og/external/<slug>` 1200×630 PNG + source-CDN preview (`:91-112`)                                                | `/og/` is disallowed in robots (`src/app/robots.ts:10`). _Inference:_ this is harmless for Google, but robots-respecting social crawlers may refuse the card image. Not verified per crawler.                    |
| `keywords`    | 8 templated phrases (`:59-68`)                                                                                     | Google does not use meta keywords. Harmless.                                                                                                                                                                     |

### Structured data (`page.tsx:144-182`, `LIVE`)

- The root layout adds a `WebSite` with a `SearchAction`.
- `ImageObject` has `contentUrl` (third-party CDN URL), `acquireLicensePage`, `creditText` and `creator`. `license` is empty for all selfh.st/LobeHub icons and most Simple Icons icons (see TL;DR 7).
- `BreadcrumbList` is Home → Browse Icons → "<name> Icon". Position 2 is `/icons`, which has no crawlable icon content (TL;DR 2).
- Google requires `contentUrl` plus one of `creator`, `creditText`, `copyrightNotice`, `license` (`GImgLic`), so the current markup is eligible. Adding `license` and `copyrightNotice` fills the remaining recommended properties.

### On-page content (`LIVE`)

- Each page has 1 `<h1>` (the name) and 1 `<h2>` ("Icon variants"), about 190–210 visible words.
- Unique text per page: the name, formats, categories and aliases. Everything else comes from the template ("Available in 3 formats… Perfect for adding to dashboards, app directories…").
- _Inference:_ thousands of pages with about 20 unique words each sit close to `GSpam`'s scaled-content abuse definition: "Scraping feeds… to generate many pages… where little value is provided to users", "Stitching or combining content from different web pages without adding value". They also fail the `GHelp` checks "original information" and "mainly summarizing what others have to say". The value we do add is cross-source search, consistent formats, a PNG proxy, light/dark variants and the customiser. It needs to be visible in the page content.

### Images

- All `<img>` tags hotlink the source CDNs: `cdn.jsdelivr.net/gh/selfhst/icons`, `cdn.jsdelivr.net/npm/@lobehub/...`, `cdn.simpleicons.org`. The exception is Simple Icons PNG, served through our domain (`LIVE`, `src/lib/external-icon-urls.ts:11-17`). `next.config.ts:26` sets `images.unoptimized: true`.
- Alt text: the hero image has "1Password icon and logo in SVG format" (good). The variant grid uses the slug: "1password in svg format", "alpinelinux-light in png format (light theme)" (`src/components/icon-details.tsx:531`). It should use the display name.
- The sitemap holds 40,928 `<image:loc>` entries (`LIVE`). For external icons they point at third-party domains. Google: images on another domain are "fine, as long as you verify both domains in Search Console" (`GImgSm`). We cannot verify `cdn.jsdelivr.net` or `cdn.simpleicons.org`. _Inference:_ those entries add sitemap weight for little benefit, and Google Images will associate those image URLs with whichever page Google picks, possibly the source's own page (for example `lobehub.com/icons/alibaba` exists and embeds the same assets, `LIVE`).

### Attribution and licence display (`src/components/icon-details.tsx:898-920,1072-1080`)

| Source       | Actual licence (GitHub API `/license`)                                                               | What the page shows                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| selfh.st     | CC-BY-4.0 (https://github.com/selfhst/icons/blob/main/LICENSE)                                       | "Icons by selfh.st/icons (CC BY 4.0)". No licence link (no `license_url`).                                      |
| LobeHub      | MIT (https://github.com/lobehub/lobe-icons/blob/master/LICENSE)                                      | "Icons by LobeHub (MIT)". No licence link.                                                                      |
| Simple Icons | CC0-1.0 (https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md) plus brand trademarks | "Not specified by Simple Icons" plus a trademark disclaimer. The disclaimer is good; the licence line is wrong. |

### Internal linking

- External → native and native → external: none (`LIVE` `/icons/1password`, `/icons/external/1password`). `src/app/icons/[icon]/page.tsx` has no reference to external icons.
- External → other icons (same source, category, alias): none.
- The only HTML entry points into icon pages are the 20 recent native icons on `/`. The `/icons` hub is client-only (TL;DR 2).

### Sitemap (`src/app/sitemap.ts`, `LIVE`)

- One file: 11,071 URLs (3,424 native, 6,036 external, 1,605 community, plus statics), 6.75 MB uncompressed, `force-dynamic` (`:9`). The protocol caps a file at 50,000 URLs / 50 MB uncompressed (`GSm`). Today it is under both; the image entries make up most of the size.
- External split: 2,969 selfh.st, 2,711 Simple Icons, 357 LobeHub (`LIVE`, classified by image host). The selfh.st upstream `index.json` has 2,968 entries, so selfh.st coverage is complete.
- `changefreq`/`priority` are set but "Google ignores `<priority>` and `<changefreq>` values" (`GSm`).
- `lastmod` is broken for external icons (TL;DR 4).

### LobeHub page granularity

- LobeHub variants of one brand each become a page: `alibaba-color`, `alibaba-brand-color`, `alibaba-text-cn` (`LIVE` sitemap). 245 of 357 LobeHub slugs end in `-color` (`LIVE`).
- The import groups some variants as aliases of a primary slug (`scripts/import-lobehub.ts:225-230`), but `-brand-color` and `-text-cn` survive as separate pages with near-identical content and titles like "Alibaba Text Cn Icon & Logo".
- The URL slug carries the `-color` suffix (for example `/icons/external/alibaba-color`) instead of the brand name.

## 2. What Google expects for a large aggregated page set

- **Duplicate URLs:** for "duplicate or very similar pages", signal the preferred URL with redirects (strongest), then `rel="canonical"`, then sitemap inclusion (`GCanon`). Google: "Don't use the robots.txt file for canonicalization purposes" (`GCanon`).
- **Scaled content:** this is judged on value to users, "no matter how it's created" (`GSpam`). _Inference:_ the defence is pages that do something the source does not: compare sources, offer formats and variants the source lacks, link alternatives. A page that restates the source's catalogue with a template does not qualify.
- **Image licence metadata:** `contentUrl` plus at least one of `creator`/`creditText`/`copyrightNotice`/`license`. `acquireLicensePage` is recommended (`GImgLic`).
- **Images:** "Google extracts information about the subject matter of the image from the content of the page… make sure images are placed near relevant text" (`GImg`). CDN-hosted images are supported; Google encourages verifying the CDN domain in Search Console (`GImg`).
- **Discovery:** links must be `<a href>` (`GLinks`). JS-injected links work when they follow that rule (`GJs`), but only if the rendering resources are not blocked (`GRobots`).
- **Large sitemaps:** split at 50k URLs / 50 MB and optionally use an index (`GSm`). In Next.js, `generateSitemaps()` returns `[{ id }]` and serves `/sitemap/<id>.xml` (`NSm`).

## 3. Recommendations (impact ÷ effort)

| #   | Impact | Effort | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High   | M      | **Make `/icons` crawlable.** Server-render a paginated, plain-`<a href>` list of icons (native and external) on `/icons`, or add `/icons/source/<source>?page=N` hub pages in a server component reading `getExternalIcons()`/`getAllIcons()`. Alternatively, at minimum, remove `/api/icons/search` from the disallow list in `src/app/robots.ts` (add it to `allow`, as done for the Simple Icons proxy). The robots change alone still leaves 9k+ links rendered by client JS from one response.                                                                                                        |
| 2   | High   | M      | **Fix slug collisions.** Move external pages to `/icons/external/<source>/<slug>`. Keep `/icons/external/<slug>` as a 308 redirect to the current winner, so existing indexed URLs keep their signals. Touch points: `page.tsx` (params, `getExternalIconBySourceAndSlug`), `src/app/sitemap.ts:55` (dedupe on `source+slug`), `generateStaticParams`, `src/app/og/external/[slug]`, `icon-card.tsx`/`command-menu.tsx` link builders. This recovers 127+ Simple Icons pages and the shadowed LobeHub ones.                                                                                                |
| 3   | High   | S      | **Fix sitemap `lastmod`.** In `src/app/sitemap.ts:67-69`, use `icon.data.update.timestamp`, which keeps the source date. Also add `created`/`updated` autodate fields to `external_icons` (new PB migration), and stop the importers rewriting unchanged rows if they currently do. Omit `lastmod` rather than emit a fake one.                                                                                                                                                                                                                                                                            |
| 4   | High   | S      | **Native ↔ external duplicates (1,334 brands).** When a native icon exists, add a prominent "Also available in Dashboard Icons" link on the external page and an "Other versions: selfh.st, …" block on the native page. Then either keep both indexable (they are genuinely different artwork) or set the external page's canonical to the native page. _Inference:_ the artwork differs, so cross-linking with self canonicals is the safer default. Long term, apply the native-slug exclusion `import-simple-icons.ts` already uses (`:130-137`) as a page-level decision, not an import filter.       |
| 5   | Medium | S      | **Licence correctness.** For each source in `src/constants.ts`, add a `licenseUrl`: CC BY 4.0 → `https://creativecommons.org/licenses/by/4.0/`, MIT → the LobeHub LICENSE, CC0 → `https://creativecommons.org/publicdomain/zero/1.0/`. Use it as a fallback for `license_url` in JSON-LD (`page.tsx:152-153`) and in `icon-details.tsx:898-920`. For Simple Icons, show "CC0-1.0 (Simple Icons); brand marks belong to their owners" instead of "Not specified". Set `acquireLicensePage` to the source licence page, not the brand site. Add `copyrightNotice` for selfh.st (CC BY requires attribution). |
| 6   | Medium | S      | **Fix the 1970 date.** In `icon-details.tsx:811`, hide "Updated on" when the timestamp is epoch 0, or give LobeHub a real date (`updated_at_source` from the npm package publish time, as the Simple Icons importer does).                                                                                                                                                                                                                                                                                                                                                                                 |
| 7   | Medium | M      | **Add unique, useful content per page.** Link "Same brand in other sources" (match by normalized name/aliases across sources and native). Link "More from <category>" (selfh.st and LobeHub have categories). Show the brand hex (Simple Icons). Add usage snippets (Homarr/Dashy/HTML URL, which already exist in the customiser). These are all internal `<a href>` links, which also fixes the orphan problem.                                                                                                                                                                                          |
| 8   | Medium | S      | **LobeHub granularity.** Fold `-brand-color`, `-text`, `-text-cn` and `-combine` variants into the base brand page as variants. Use the base brand slug (`alibaba`) as the URL with `-color` as the default asset (`scripts/import-lobehub.ts:225-257`). Redirect old variant slugs. Fix name derivation (`slugToName`, `:64`) so "Text Cn" never reaches a title.                                                                                                                                                                                                                                         |
| 9   | Low    | S      | **Alt text.** In `icon-details.tsx:531`, use the display name, e.g. "1Password icon, PNG, dark theme".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 10  | Low    | S      | **Sitemap hygiene.** Drop external `<image:image>` entries for third-party CDN URLs (we can't verify those hosts, `GImgSm`), except our own `/api/icons/external/simpleicons/...` PNGs. Split with `generateSitemaps()` by type (native / external per source / community) for per-segment coverage in Search Console, and headroom before the 50k cap.                                                                                                                                                                                                                                                    |
| 11  | Low    | S      | **Robots for OG.** Allow `/og/` (or at least `/og/external/`) in `src/app/robots.ts` so social crawlers that respect robots can fetch card images. Return 404 for unknown slugs in `src/app/og/external/[slug]/route.tsx`.                                                                                                                                                                                                                                                                                                                                                                                 |
| 12  | Low    | S      | **Native titles.** Native pages use the raw slug ("1password Icon & Logo"); use a formatted display name. This is outside external scope but affects the 1,334 overlapping brands' SERP titles.                                                                                                                                                                                                                                                                                                                                                                                                            |

### Not broken (verified)

- Unknown slugs return a real 404.
- Canonicals are absolute and self-referencing; no wrong-host canonical.
- No accidental `noindex`.
- The sitemap is under the protocol limits.
- The Simple Icons PNG proxy is crawlable and cached.
- Titles are unique per slug except the LobeHub naming artefacts.

## Open questions

- The exact number of LobeHub slugs shadowed by selfh.st needs a PocketBase query (`source = "lobehub"` count vs 357 in the sitemap). The jsDelivr flat listing for `@lobehub/icons-static-svg` returned an error.
- Search Console data (indexed vs "Crawled/Discovered – currently not indexed" for `/icons/external/`) would confirm whether Google is already treating these pages as low value. It was not accessible from here.
