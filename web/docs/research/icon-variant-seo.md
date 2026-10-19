# Icon variant SEO: making every Variant findable in site search and image search

Researched 2026-10-19 against the worktree at `6d313459` and the live site `https://dashboardicons.com` (fetched with a Googlebot user agent the same day). Every claim cites a file:line, a live URL, or a primary source. **Inference** marks a conclusion that is not directly in a source.

Path convention: paths are relative to `web/` unless they start with `metadata.json`, `svg/`, `png/` or `webp/` (repo root).

| Tag    | Source                                                                                                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GI`   | Google, "Google image SEO best practices", https://developers.google.com/search/docs/appearance/google-images (updated 2026-03-02)                                                                            |
| `GIS`  | Google, "Image sitemaps", https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps (updated 2025-12-10)                                                                            |
| `GIM`  | Google, "Image metadata in Google Images", https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata                                                                        |
| `GSM`  | Google, "Build and submit a sitemap", https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap (updated 2026-07-08)                                                                 |
| `GCAN` | Google, "How to specify a canonical URL", https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls (updated 2026-07-10)                                                         |
| `GURL` | Google, "URL structure", https://developers.google.com/search/docs/crawling-indexing/url-structure                                                                                                            |
| `GRB`  | Google, "How Google interprets the robots.txt specification", https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec                                                                          |
| `GFT`  | Google, "File types Google can index", https://developers.google.com/search/docs/crawling-indexing/indexable-file-types                                                                                       |
| `GTL`  | Google, "Title links", https://developers.google.com/search/docs/appearance/title-link                                                                                                                        |
| `BWG`  | Bing Webmaster Guidelines, https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a                                                                                                                 |
| `BSM`  | Bing Webmaster Blog, "Keeping Content Discoverable with Sitemaps in AI Powered Search" (2025-07-31), https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/ |
| `INOW` | IndexNow docs, https://www.indexnow.org/documentation and https://www.indexnow.org/faq                                                                                                                        |
| `NXS`  | Next.js 16 `sitemap.ts` / `generateSitemaps` docs, https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap, https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps         |
| `SIO`  | schema.org `ImageObject`, https://schema.org/ImageObject                                                                                                                                                      |

## TL;DR

- **Variants are crawlable today, but labelled wrong and half-missing from signals.** Icon pages are server-rendered with real `<img src>` tags on the CDN, which Google can index. But only the base file reaches the sitemap and JSON-LD. Alt text uses raw stems (`github-light in png format (light theme)`), wordmark alt text never says "wordmark", and the light/dark section copy is **inverted** (the white `github-light` file sits under "Light mode — optimized for light backgrounds").
- **Things that are broken now:** `acquireLicensePage` points to `/license`, which returns 404. The JSON-LD declares CC BY 4.0, but the repo `LICENSE` is Apache 2.0. The sitemap lists `https://dashboardicons.com/icons/icon.png`, which returns 404. `robots.txt` disallows `/og/`, which is where every page's primary `og:image` lives. `/icons` server-renders **zero** links to icon pages, and 1,732 of 3,424 icons have no categories, so they get no "Related icons" links either.
- **Custom variants already have their own URLs.** `sonarr-4k` and `sonarr-dv` are separate `metadata.json` entries with pages and sitemap entries today. The planned `variants` map must not silently delete those URLs.
- **Recommendation:** one canonical page per icon. Give each Variant its own heading, caption, descriptive alt text and `ImageObject`, and list every variant file in the image sitemap. Keep standalone URLs only for custom forms that already have them (or that match distinct queries, such as "4k"). Never give tone variants (light/dark) their own URLs. Index variant names and tone synonyms ("white", "black", "wordmark", "4k") in site search and MCP search.

---

## 1. Audit of the current implementation

### 1.1 Icon page `/icons/[icon]`

**Rendering.** The page is `force-static` with `revalidate = 900` and pre-rendered for every icon (`src/app/icons/[icon]/page.tsx:7-17`). The live HTML for `/icons/github` and `/icons/sonarr` contains every variant `<img>` with an absolute CDN `src` (verified with curl). Images use `next/image` with `unoptimized` (`src/components/unoptimized-image.tsx:20-33`), so the `src` is the raw CDN URL and there is no `/_next/image` proxy. The hero image is `priority` (no `loading=lazy`). The variant tiles are native `loading="lazy"`, which Google supports ("Browser built-in lazy-loading for images", https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading). **Nothing hides images from crawlers:** no CSS backgrounds and no canvas (canvas is only `canvas-confetti`, `src/components/icon-details.tsx:3`). Google indexes `<img src>` and not CSS images (`GI`, "Use HTML image elements").

**Metadata** (`page.tsx:24-117`):

| Field              | Current value (live, `/icons/sonarr`)                                                                      | Notes                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `<title>`          | `Sonarr Icon & Logo \| Dashboard Icons & Logos`                                                            | Name comes from title-casing the slug (`page.tsx:39-42`), so brands get the wrong case: `Github`, `Sonarr 4k`. No format or variant terms. |
| description        | `Download the Sonarr icon and logo in SVG, PNG, and WEBP formats for FREE. Part of a collection of 3424 …` | Same template on every page except the name. Never mentions variants.                                                                      |
| canonical          | self, `https://dashboardicons.com/icons/sonarr` (`page.tsx:108-109`)                                       | Correct.                                                                                                                                   |
| `og:image`         | `/og/sonarr` (1200×630), then CDN `png/sonarr.png` (`page.tsx:85-100`)                                     | `/og/` is disallowed in robots.txt (`src/app/robots.ts:10`).                                                                               |
| `alternates.media` | `{png, svg, webp}` → CDN (`page.tsx:110-114`)                                                              | `media` is meant for media-query alternates such as mobile pages, not file formats. **Inference:** it is ignored at best.                  |
| `keywords`         | slug-based list (`page.tsx:47-61`)                                                                         | Google does not use the keywords meta tag. Harmless.                                                                                       |
| robots             | `index, follow, max-image-preview:large` (`page.tsx:65-76`)                                                | Good.                                                                                                                                      |

**Headings.** The live HTML has `<h1>github</h1>`, lowercase, because capitalisation is done in CSS (`icon-details.tsx:801`). Then come `<h2>Icon variants</h2>` and `<h3>` "Base Icon" / "Light mode" / "Dark mode" / "Wordmark Variants" (`icon-details.tsx:61-64, 85-88, 937-990`). Google uses the `<title>`, the main visual title and `<h1>` for title links (`GTL`).

**Alt text** (live):

- Hero: `sonarr icon and logo in SVG format` (`icon-details.tsx:794`)
- Variant tiles: `${iconName} in ${format} format (${theme} theme)` (`icon-details.tsx:531`), so the alt is the stem: `github-light in png format (light theme)`, `sonarr-dark in svg format (dark theme)`.
- Wordmarks reuse the same renderer (`icon-details.tsx:99-100, 113-114`), so `/icons/helix` renders `helix-light in svg format (light theme)` with **no "wordmark"** in the alt.
- Related icons: `woodpecker-ci icon and logo`.

**Light/dark copy is inverted.** In `metadata.json`, `colors.light` is the light-coloured file for dark backgrounds (`docs/research/variant-metadata-schema.md:40`). `svg/github-light.svg` is `fill:#fff` and `svg/github.svg` is `fill:#1b1f23` (checked in the repo). The page renders `colors.light` under the title "Light mode" with the description "Icon variants optimized for light backgrounds" (`icon-details.tsx:958-968`), and its alt says "(light theme)". For sonarr (`colors.light = "sonarr"`), the "Light mode" section duplicates the base images, so the same three URLs appear twice (live HTML). **Inference:** queries like "github logo white png" have no text on the page that matches the white file.

**Structured data** (`page.tsx:140-173`, live):

```json
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "contentUrl": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/github.png",
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "acquireLicensePage": "https://dashboardicons.com/license",
  "creditText": "Icon by Fabricio",
  "copyrightNotice": "© Homarr Labs",
  "creator": { "@type": "Person", "name": "Fabricio" }
}
```

There is a `BreadcrumbList` plus a site-wide `WebSite` + `SearchAction` (`src/app/layout.tsx:135-139`). Problems:

- One `ImageObject`, for the base PNG only. Variant, SVG and WebP files carry no metadata. `GIM` says to "add structured data … to each image on each page that it appears" and shows an array of `ImageObject`s for pages with several images.
- `acquireLicensePage` → `https://dashboardicons.com/license` returns **HTTP 404** (curl). `src/app/(legal)/` contains only `privacy` and `terms`.
- `license` claims CC BY 4.0, but the repo `LICENSE` is Apache 2.0 (`LICENSE:1-2`), and the site-wide notice links to that file (`src/components/license-notice.tsx:49`). The site also states that product names and trademarks belong to their owners (`license-notice.tsx:42-44`). **Inference:** advertising a Licensable badge for third-party brand logos, with `© Homarr Labs`, is a legal and positioning decision for the maintainer. The current values are inconsistent whichever way it goes.
- No `name`, `caption`, `encodingFormat` or `representativeOfPage`. All are valid `ImageObject` properties (`SIO`). Google's required set is `contentUrl` + one of `creator`/`creditText`/`copyrightNotice`/`license`, and `license` is needed for the Licensable badge (`GIM`, "Structured data type definitions").

**Internal linking.** "Related icons" comes from shared categories (`page.tsx:131`). 1,732 of 3,424 metadata entries have `categories: []` (counted in `metadata.json`). `sonarr`, for example, has none, so `/icons/sonarr` renders no Related section and does not link to `/icons/sonarr-4k` or `/icons/sonarr-dv` (live HTML: no `href="/icons/sonarr-*"`). The `/icons` browser is a client component inside `<Suspense>` (`src/app/icons/page.tsx:50-52`, `src/components/icons-browser.tsx:1`), and its server HTML contains **0** `href="/icons/…"` links (curl). The home page has 20 (recently added). **Inference:** about half of the icon pages are reachable only through the sitemap.

### 1.2 Sitemap and robots

`src/app/sitemap.ts` emits a single `/sitemap.xml`. Live: 11,071 `<url>` entries (9,461 under `/icons`, 1,605 under `/community`), 40,928 `<image:image>` entries, 6.75 MB. That is within the 50 MB / 50,000-URL limit (`GSM`).

- For native icons it lists only `png|svg|webp/<slug>.*` (`sitemap.ts:48-52`). **No `colors.*`, `wordmark.*` or variant files.** `/icons/sonarr` lists only the three `sonarr.*` files, not `sonarr-dark.*` (live).
- External icon pages do list their light/dark files (`sitemap.ts:55-74`), so third-party variants get better sitemap coverage than native ones.
- Community submission pages have no `images` (`sitemap.ts:75-80`).
- `/icons` lists `https://dashboardicons.com/icons/icon.png` (`sitemap.ts:33`), which returns **404** (curl). Bing asks for clean sitemaps; its 2011 guidance says under 1% errors (https://blogs.bing.com/webmaster/April-2011/Collection-of-SEO-related-documents-from-the-Bing/).
- `lastmod` for `/`, `/icons` and `/community` is "today" on every request (`sitemap.ts:24,30,37`). Google uses `lastmod` only if it is "consistently and verifiably accurate" and ignores `priority`/`changefreq` (`GSM`). Bing says not to set lastmod to the generation time and also ignores `changefreq`/`priority` (`BSM`).

`robots.txt` (live) disallows `/api/`, `/dashboard/`, `/submit/` and `/og/` (`src/app/robots.ts:10`). `/og/<icon>` returns 200 `image/png`. It is each page's first `og:image` and the only Twitter image (`page.tsx:87,106`). Google lists `og:image` as a preferred-image source (`GI`, "Specify a preferred image with metadata"), and Googlebot obeys robots.txt (`GRB`). **Inference:** Google cannot fetch the preferred preview image, so it falls back to the second `og:image` (the CDN PNG). Unverified: whether X/Twitterbot, which historically respects robots.txt, also skips it. The X docs page could not be read without JS.

### 1.3 Image hosting

All native files are served from `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/{format}/{stem}.{format}` (`src/constants.ts:1`, `src/lib/icons/urls.ts:12-14`), with `content-type: image/svg+xml` and `cache-control: public, max-age=604800, s-maxage=43200` (curl). `https://cdn.jsdelivr.net/robots.txt` returns **400**. Google treats any 4xx except 429 as "no robots.txt, no restrictions" (`GRB`), so crawling is allowed. Image-sitemap `<image:loc>` may be on another domain: "This is fine, as long as you verify both domains in Search Console" (`GIS`). `GI` softens this to "we encourage you to verify ownership of the CDN's domain". `cdn.jsdelivr.net` cannot be verified by this project. SVG, PNG and WebP are all indexable (`GFT`; `GI`, "Use supported image formats"). Filenames are short and descriptive (`sonarr-4k.svg`, `github-light.png`), which matches `GI`'s "short, but descriptive" guidance. `-light`/`-dark` is an inverted tone hint, not a colour word.

**Inference:** the same jsDelivr URLs are hot-linked by Homarr, Homepage and others (`docs/research/variant-metadata-schema.md` §2.2). Google may therefore see the same image on many landing pages. That favours strong on-page text on dashboardicons.com, because Google ties image results to the landing page (`GI`, "Optimize the image landing pages").

### 1.4 Custom variants today

Custom forms are **separate metadata entries with their own pages**: `metadata.json` has keys `sonarr`, `sonarr-4k` (categories `["Media"]`, aliases `["sonarr-4k","sonarr4k"]`) and `sonarr-dv`. Each has its own sitemap `<url>` and images (live). The live `/icons/sonarr-4k` has the title `Sonarr 4k Icon & Logo` and `<h1>sonarr 4k`. The planned additive `variants` map (`docs/research/variant-metadata-schema.md`, TL;DR and §5) would fold these into `sonarr`. That URL migration is an SEO decision (§3.3).

### 1.5 Site search and MCP search

- Site search scores only `icon.name` and `data.aliases` (`src/lib/icons/search.ts:118-123`). `normalizeForSearch` strips spaces and dashes (`search.ts:8-10`), so "sonarr 4k" matches the `sonarr-4k` entry by name. **But** any variant that is _not_ a top-level entry (every `colors.*` and `wordmark.*` file) is unsearchable. "github white", "github light" and "helix wordmark" score nothing beyond the base name. For multi-word queries, `fuzzySearch` multiplies the score by 0.4 when not all words match (`search.ts:110`).
- The MCP catalog builds URLs only for `default | light | dark` from `colors` (`src/lib/icons/catalog.ts:269-284`). The `search_icons` description promises "every format and light/dark variant" (`src/mcp/tools/search-icons.ts:31`). Wordmarks and custom forms are invisible to MCP (also noted in `docs/research/variant-metadata-schema.md` §2.1).

### 1.6 Other pages

- `/icons/external/[slug]` pages are indexable and self-canonical, titled e.g. `Sonarr Icon & Logo (selfh.st)` (`src/app/icons/external/[slug]/page.tsx:56,72-79,115`; live). **Inference:** `/icons/sonarr` and `/icons/external/sonarr` compete for the same queries. They are not duplicates (different files), so `GCAN` canonicalisation does not apply. It is a cannibalisation risk to watch in Search Console.
- `/community/[icon]` permanently redirects to `/icons/<icon>` or `/community/submissions/<id>` (`src/app/community/[icon]/page.tsx:11-12`). That is the strongest canonical signal (`GCAN`).
- `/community/submissions/[id]` is indexable with its own `ImageObject` (`src/app/community/submissions/[id]/page.tsx:70-77,239-244`) but has no sitemap images.
- The home page's `Organization.logo` is `/og-image.png` (`src/app/page.tsx:28-37`; 200).

---

## 2. What Google and Bing require and reward

| Topic           | Rule                                                                                                                                                                                                                                                                                                                                         | Source          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Discovery       | `<img src>` (also inside `<picture>`) is indexed. CSS background images are not. Always give `srcset`/`<picture>` a `src` fallback.                                                                                                                                                                                                          | `GI`            |
| Formats         | BMP, GIF, JPEG, PNG, WebP, SVG, AVIF. The extension should match the file type.                                                                                                                                                                                                                                                              | `GI`, `GFT`     |
| Image sitemap   | `<image:image>`/`<image:loc>` only. Up to 1,000 images per `<url>`. Other domains (CDNs) are allowed; verify both in Search Console. `caption`, `title`, `license` and `geo_location` were removed in 2022.                                                                                                                                  | `GIS`           |
| Sitemap limits  | 50 MB uncompressed or 50,000 URLs per file. Split with an index. Next.js does this with `generateSitemaps` → `/…/sitemap/[id].xml`. `images: string[]` is supported.                                                                                                                                                                         | `GSM`, `NXS`    |
| lastmod         | Used only if accurate. `priority`/`changefreq` are ignored (Google and Bing). Bing wants full ISO 8601 date-time.                                                                                                                                                                                                                            | `GSM`, `BSM`    |
| Alt text        | "The most important attribute" for image metadata. Descriptive, in context, no keyword stuffing. Use `<title>` for inline `<svg>`.                                                                                                                                                                                                           | `GI`            |
| Context         | Google uses captions, image titles and nearby text. Place images near relevant text. The filename gives "very light clues".                                                                                                                                                                                                                  | `GI`            |
| URL stability   | "Consistently reference the image with the same URL" across pages.                                                                                                                                                                                                                                                                           | `GI`            |
| Preferred image | `primaryImageOfPage`, `mainEntity`'s `image`, or `og:image`. Avoid generic or site-logo images, extreme aspect ratios and text-heavy images.                                                                                                                                                                                                 | `GI`            |
| Licensing badge | `ImageObject` with `contentUrl` + (`creator` \| `creditText` \| `copyrightNotice` \| `license`). `license` is required for the Licensable badge. `acquireLicensePage` is recommended. Mark up each image on each page. For several images, use an array.                                                                                     | `GIM`           |
| Fragments       | Google "generally doesn't support URL fragments". Don't use fragments to change content, and don't make a fragment URL canonical.                                                                                                                                                                                                            | `GURL`, `GCAN`  |
| Canonicals      | Strength: redirect > `rel=canonical` > sitemap inclusion. Don't contradict signals. Use self-referential canonicals.                                                                                                                                                                                                                         | `GCAN`          |
| Title links     | Built from `<title>`, the main visual title, `<h1>`, `og:title`, and so on. Make the main title prominent and distinct.                                                                                                                                                                                                                      | `GTL`           |
| Bing images     | Descriptive file names, alt text, and "captions, transcripts, or structured data". Images should reinforce the text, not replace it. Use crawlable links with anchor or alt text.                                                                                                                                                            | `BWG` §5, §12   |
| Bing discovery  | Discovery by IndexNow + XML sitemaps + internal links. Sitemaps should list only canonical URLs and drop deleted or redirected ones. Notify IndexNow on add/update/delete.                                                                                                                                                                   | `BWG` §2-4, §19 |
| IndexNow        | `POST /indexnow` with `{host, key, keyLocation?, urlList}`, up to 10,000 URLs per post. The key is 8-128 hex characters, hosted at `/<key>.txt`. A submission to one endpoint (Bing, `api.indexnow.org`, …) is shared with all participating engines. Use alongside sitemaps, not instead of them. Google is not a participant (not listed). | `INOW`          |

**Inference on one page vs. many URLs.** Google's model is image → landing page. A tone variant (same mark, different fill) on its own URL would carry near-identical text and could be treated as duplicate or thin (`GCAN` lists such variants as typical duplicate causes). One page with a distinct, well-labelled section and alt text per variant gives each image its own context, and that is what `GI` rewards. Fragment links (`#wordmark`) are fine for UX but are not separate indexable URLs (`GURL`).

---

## 3. Recommendations (prioritised)

### P0: broken today, low effort

1. **Fix `acquireLicensePage`.** Add a real `/license` page (in `src/app/(legal)/`) that explains reuse terms and the trademark notice, or point to the `LICENSE` URL on GitHub. A 404 target undermines the badge (`GIM` wants a page "where the user can find information on how to license that image").
2. **Make `license` truthful.** Pick one licence statement and use it everywhere (JSON-LD, `/license`, README). Today the JSON-LD says CC BY 4.0 (`page.tsx:148`) and the repo says Apache 2.0 (`LICENSE:1`). The maintainer must decide whether to claim a licence on third-party marks at all. If not, keep `creditText`/`creator` (they are enough for metadata, `GIM`) and drop `license`, which removes badge eligibility.
3. **Fix the light/dark copy and alt text.** `colors.light` = "Light (for dark backgrounds)" and `colors.dark` = "Dark (for light backgrounds)". Fix the inverted text at `icon-details.tsx:958-980`.
4. **Remove the 404 from the sitemap** (`sitemap.ts:33`). Stop emitting "today" as `lastmod` for static pages (`sitemap.ts:24,30,37`).
5. **Unblock `/og/` for crawlers.** Remove it from `robots.ts:10`, or drop `/og/` from `og:image`. Either way, the first `og:image` should be fetchable.

### P1: variant-level signals on the icon page (core of the goal)

6. **One section per Variant, server-rendered.** Use `<h2>Icon variants</h2>`, then one `<h3>` per Variant group ("Sonarr icon", "Sonarr light icon (for dark backgrounds)", "Sonarr wordmark", "Sonarr 4K icon"). Put a one-line text caption under each group, ideally a `<figure><figcaption>` that names the file: `sonarr-4k.svg · SVG · light version`. Show each image once. Dedupe when a tone resolves to the base stem, such as sonarr `colors.light = "sonarr"`.
7. **Alt text template.** Build it from the display name and the variant, never the raw stem:
   - base: `Sonarr logo (SVG)`
   - tone: `Sonarr logo, white version for dark backgrounds (PNG)` / `GitHub logo, black version for light backgrounds (WebP)`
   - wordmark: `Helix wordmark logo, light version (SVG)`
   - custom: `Sonarr 4K logo (SVG)`, `Sonarr 4K logo, dark version (PNG)`

   This is descriptive and in context, not stuffed (`GI`). Use "white/black" only when the file really is monochrome. Otherwise use "light/dark version".

8. **JSON-LD: one `ImageObject` per variant file**, plus a page node pointing to the primary image (`GI` `primaryImageOfPage`; `GIM` array form). Example for sonarr with base, light, dark and 4K. The URLs follow today's files, where `colors.light` is `sonarr`, so "light" is the base file and is not repeated:

   ```json
   [
     {
       "@context": "https://schema.org",
       "@type": "WebPage",
       "@id": "https://dashboardicons.com/icons/sonarr",
       "url": "https://dashboardicons.com/icons/sonarr",
       "name": "Sonarr Icon & Logo (SVG, PNG, WebP)",
       "primaryImageOfPage": {
         "@id": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/sonarr.png"
       },
       "breadcrumb": {
         "@id": "https://dashboardicons.com/icons/sonarr#breadcrumb"
       }
     },
     {
       "@context": "https://schema.org",
       "@type": "ImageObject",
       "@id": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/sonarr.png",
       "contentUrl": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/sonarr.png",
       "name": "Sonarr logo",
       "caption": "Sonarr logo (PNG), also available as SVG and WebP",
       "encodingFormat": "image/png",
       "representativeOfPage": true,
       "creditText": "Icon by Bjorn Lammers / Dashboard Icons",
       "creator": { "@type": "Person", "name": "Bjorn Lammers" },
       "license": "<chosen licence URL, see P0.2>",
       "acquireLicensePage": "https://dashboardicons.com/license"
     },
     {
       "@context": "https://schema.org",
       "@type": "ImageObject",
       "contentUrl": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr.svg",
       "name": "Sonarr logo (SVG)",
       "encodingFormat": "image/svg+xml",
       "creditText": "Icon by Bjorn Lammers / Dashboard Icons",
       "license": "<chosen licence URL>",
       "acquireLicensePage": "https://dashboardicons.com/license"
     },
     {
       "@context": "https://schema.org",
       "@type": "ImageObject",
       "contentUrl": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr-dark.svg",
       "name": "Sonarr logo, dark version for light backgrounds (SVG)",
       "encodingFormat": "image/svg+xml",
       "creditText": "Icon by Bjorn Lammers / Dashboard Icons",
       "license": "<chosen licence URL>",
       "acquireLicensePage": "https://dashboardicons.com/license"
     },
     {
       "@context": "https://schema.org",
       "@type": "ImageObject",
       "contentUrl": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr-4k.svg",
       "name": "Sonarr 4K logo (SVG)",
       "encodingFormat": "image/svg+xml",
       "creditText": "Icon by Bjorn Lammers / Dashboard Icons",
       "license": "<chosen licence URL>",
       "acquireLicensePage": "https://dashboardicons.com/license"
     }
   ]
   ```

   Emit one node per file × format: PNG and WebP nodes as well, each with its own `contentUrl` and `encodingFormat`. Fold the `BreadcrumbList` in with `@id`. `name`, `caption`, `encodingFormat` and `representativeOfPage` are valid schema.org properties (`SIO`). **Inference:** Google documents only the licence fields for Images, so the others help understanding but have no documented rich result.

9. **Image sitemap lists every variant file.** For each native icon `<url>`, add every resolved stem from `colors`, `wordmark` and (later) `variants`, × the formats that exist. Share one resolver with the page and MCP: the `nativeFile` pattern at `catalog.ts:269-284`, extended. sonarr goes from 3 to about 9 `<image:loc>`s. Roughly 3,424 icons × ≤ 12 files stays far under 1,000 images per `<url>` (`GIS`). With about 41k images today and growth, split by type with `generateSitemaps` (`NXS`), e.g. `icons/sitemap/[id].xml`, external and community, so the file stays well under 50 MB (`GSM`). Add images for community submission pages.
10. **Title and description mention variants when they exist.** For example: title `Sonarr Icon & Logo – SVG, PNG, WebP (Light, Dark, 4K)`, description `Download the Sonarr logo in SVG, PNG and WebP, including light and dark versions and the Sonarr 4K and DV variants.` **Inference:** a variant-aware `<title>` targets "sonarr logo dark png"-style queries without separate URLs (`GTL`).
11. **Use real brand casing in `<h1>` and `<title>`.** Server-render the display name instead of the lowercase slug styled with CSS `capitalize` (`icon-details.tsx:801`). Title-casing the slug gives `Github`. Add a display-name field in metadata (e.g. `name: "GitHub"`) or derive it from the first alias. **Inference:** this is a small change that makes titles match brand queries.

### P1: URL strategy for Variants

12. **Tone variants (light/dark, wordmark-light/dark): no own URLs.** They stay as sections on the icon page. Own URLs would be near-duplicates (`GCAN`). Fragment links for in-page navigation are fine but not indexed (`GURL`).
13. **Custom forms that already have URLs (`sonarr-4k`, `sonarr-dv`, …): keep the URL working.** When folding them into `variants`, either:
    - (a) keep `/icons/sonarr-4k` as a real page that renders the variant first and links to the parent, with a self-canonical, or
    - (b) 301 it to `/icons/sonarr`, which merges signals (`GCAN`: redirects are strongest) and loses the dedicated "sonarr 4k" landing page.

    **Recommendation: (a) for forms with distinct search demand (4k, animated, named editions), (b) for trivial ones.** Never leave them 404 or `noindex`. Remove redirected URLs from the sitemap (`BWG` §3).

14. **Cross-link parent and variants.** The parent links to each custom-variant page, and the variant page links back with a breadcrumb `Sonarr › 4K`. This fixes the missing link between `/icons/sonarr` and `/icons/sonarr-4k` today (§1.1).

### P1: site search and MCP

15. **Index variants as searchable rows or tokens.** Expand each icon into `{iconName, variantKey, stem, label}` entries. Index synonyms per tone: `light → "light", "white", "for dark background"` and `dark → "dark", "black", "for light background"`. Add `"wordmark", "logo text", "text logo"` for wordmarks and the free-form name for custom variants (`4k`, `dv`, `animated`). Score `name + variant tokens` so "github white" ranks `github` first and preselects the light file, and "sonarr 4k" ranks the 4K variant. Today, scoring reads only name and aliases (`search.ts:118-123`).
16. **MCP:** expose `wordmark.*` and `variants.*` in `catalog.ts` URLs (e.g. `urls.svg["wordmark-light"]`, `urls.svg["4k"]`). Let `search_icons` match variant tokens. Fix the tool description to match (`search-icons.ts:31`). This was already planned in `docs/research/variant-metadata-schema.md` §2.1.

### P2: crawlability and discovery (independent of variants)

17. **Server-render links on `/icons`.** Render at least a paginated, crawlable list of `<a href="/icons/<slug>">` (with `?page=` or letter pages) in the server HTML. Today it has 0 links (§1.1), and 1,732 icons without categories have no inbound internal links. `BWG` §5 asks for crawlable internal links. Alternatively, fall back to "related by name prefix", so sonarr ↔ sonarr-4k, when categories are empty.
18. **IndexNow for Bing** (and Yandex, Naver, …). After each icon publish or deploy, POST the changed `/icons/<slug>` URLs, up to 10,000 per post, with a key file at `https://dashboardicons.com/<key>.txt` (`INOW`, `BWG` §4). The CI deploy step that already runs after icon publication (commit `2ade7af6`) is the natural hook. Google does not consume IndexNow. Keep the sitemap.
19. **Own the image host (medium/high effort).** Serve files from a domain you can verify in Search Console, such as `icons.dashboardicons.com` proxied to jsDelivr or object storage. `GIS` asks to verify the image domain, which jsDelivr cannot be. **Weigh this against URL stability.** Every consumer hot-links jsDelivr URLs (`docs/research/variant-metadata-schema.md` §2.2), and `GI` asks for one consistent URL per image. **Inference:** do this only if Search Console shows image-crawl problems. Otherwise jsDelivr URLs are crawlable (robots 4xx = allow, `GRB`) and already indexed.
20. **Drop `alternates.media`** for formats (`page.tsx:110-114`). Expose download links as plain `<a href>` to each file instead. They are crawlable and give anchor text such as "Download Sonarr 4K SVG" (`BWG` §5).
21. **Watch `/icons/<slug>` vs `/icons/external/<slug>` cannibalisation** in Search Console. **Inference:** if both rank for the same brand, consider linking the native page prominently from the external one and keeping the external title clearly secondary.

## Verified vs inferred, at a glance

- **Verified (curl, file:line):** SSR `<img>` of all `colors`/`wordmark` files; alt templates; inverted light/dark copy; single base-PNG `ImageObject`; `/license` 404; CC BY vs Apache mismatch; sitemap with base files only and the `/icons/icon.png` 404; `/og/` disallowed but used as `og:image`; jsDelivr robots 400; `/icons` server HTML with 0 icon links; 1,732 entries without categories; `sonarr-4k`/`sonarr-dv` as separate entries and pages; search limited to name and aliases; MCP limited to `colors`.
- **Inferred:** ranking benefit of variant-aware titles and alt text; duplicate risk of per-tone URLs; Google falling back from the blocked `/og/` image; cannibalisation between native and external pages; the value of moving off jsDelivr.
