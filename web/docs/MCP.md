# Dashboard Icons MCP Server

Connect AI assistants to [dashboardicons.com](https://dashboardicons.com) via the Model Context Protocol (MCP).

## Endpoint

```
https://dashboardicons.com/api/mcp
```

Local development:

```
http://localhost:3005/api/mcp
```

## Cursor configuration

```json
{
  "mcpServers": {
    "dashboard-icons": {
      "url": "https://dashboardicons.com/api/mcp"
    }
  }
}
```

### Stdio-only clients

Use [mcp-remote](https://www.npmjs.com/package/mcp-remote):

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

## Tools

Every tool reads from one catalog: dashboardicons.com icons (`native`) plus the selfh.st (`selfhst`), LobeHub (`lobehub`) and Simple Icons (`simpleicons`) catalogs. Native icons win ties. All public tools are read-only and return `structuredContent` (matching their `outputSchema`) plus the same data as compact JSON text. When an external source cannot be loaded, results carry `degraded_sources`.

Typical flow: `match_icons` for a list of services (or `search_icons` for one vague name), then `get_icon` for every URL and the license, or `get_icon_svg` for inline SVG markup.

### `match_icons`

Best icon for each of up to 50 service names in one call. Names, slugs and aliases match ignoring case, spaces and punctuation (`Pi-hole` = `pihole`); otherwise it falls back to fuzzy search, then to typo distance.

| Parameter  | Type     | Default     | Max                 |
| ---------- | -------- | ----------- | ------------------- |
| `services` | string[] | required    | 50 items, 100 chars |
| `sources`  | source[] | all sources |                     |

Returns `matches: [{ service, best, alternatives }]`; `best` is `null` when nothing matched.

### `search_icons`

Fuzzy search by name, alias or category.

| Parameter  | Type     | Default     | Max       |
| ---------- | -------- | ----------- | --------- |
| `query`    | string   | required    | 100 chars |
| `sources`  | source[] | all sources |           |
| `category` | string   | optional    | 50 chars  |
| `limit`    | number   | 10          | 50        |

### `get_icon`

Full details for one icon: CDN URLs for every available format (`svg`, `png`, `webp`) and theme (`default`, `light`, `dark`), aliases, categories, and license/attribution for external icons. Loose names resolve (`lm-studio` → `lmstudio`, reported as `resolved_from`). Unknown names return `found: false` with `did_you_mean`, not an error.

| Parameter | Type   | Default                         |
| --------- | ------ | ------------------------------- |
| `name`    | string | required (80 chars)             |
| `source`  | source | native, then the external order |

### `get_icon_svg`

Raw SVG markup for one icon; the text result is the markup itself. When no SVG exists, `reason` is `no_svg`, `no_variant` or `fetch_failed`.

| Parameter | Type                           | Default   |
| --------- | ------------------------------ | --------- |
| `name`    | string                         | required  |
| `source`  | source                         | optional  |
| `theme`   | `default` \| `light` \| `dark` | `default` |

### `browse_icons`

Page through icons without a query.

| Parameter  | Type                       | Default        | Max      |
| ---------- | -------------------------- | -------------- | -------- |
| `category` | string                     | optional       | 50 chars |
| `source`   | source                     | all sources    |          |
| `sort`     | `alphabetical` \| `newest` | `alphabetical` |          |
| `limit`    | number                     | 50             | 100      |
| `cursor`   | string (`next_cursor`)     | first page     |          |

### `list_categories`

Categories with icon counts, largest first. Optional `source`.

### Account tools

These act on your dashboardicons.com account. They are listed for every client; calling one without signing in returns HTTP `401` with a `WWW-Authenticate` challenge, which makes Claude Code, Cursor and VS Code open the sign-in page. Sign-in is documented in [MCP-AUTH.md](./MCP-AUTH.md). Each call re-checks the PocketBase session, so signing out everywhere or changing the password stops them immediately. An expired session returns a tool error asking to reconnect.

#### `submit_icon`

Submits a new icon as the signed-in user. It becomes a pending community submission in the normal review queue, with the same record the website's submit form creates (`status: pending`, the SVG as the base asset, `extras.base: "svg"`, aliases, categories). Not read-only and not idempotent: calling it twice creates two submissions.

| Parameter     | Type     | Default  | Max                                                     |
| ------------- | -------- | -------- | ------------------------------------------------------- |
| `name`        | string   | required | 80 chars, kebab-case slug (`my-app`)                    |
| `svg`         | string   | required | 48 KB, one SVG document with the SVG `xmlns`            |
| `aliases`     | string[] | `[]`     | 20 items                                                |
| `categories`  | enum[]   | `[]`     | the website's submission categories (`media`, `tools`…) |
| `description` | string   | `""`     | 2000 chars                                              |

Rejected before anything is stored: names that already exist on dashboardicons.com (the error points to `/submit`, where picking an existing icon files an update proposal), and SVGs with `<script>`, `<foreignObject>`, embedded documents, `on*=` handlers, `javascript:` URLs, DOCTYPE/entities, CSS escapes or `@import`, attribute animations, foreign namespaces, or references other than `#ids` and inline base64 PNG/JPEG/GIF/WebP. Submission pauses if the native catalog cannot be checked for duplicates. Returns `id`, `status`, `url` (the public submission page) and `dashboard_url`.

#### `list_my_submissions`

Your submissions, newest first: `id`, `name`, `status` (`pending`, `approved`, `rejected`, `added_to_collection`), `admin_comment`, `created`, `updated`, `url`, plus `total`.

| Parameter | Type   | Default    | Max |
| --------- | ------ | ---------- | --- |
| `status`  | enum   | all states |     |
| `limit`   | number | 20         | 50  |

## Resources and prompts

- Resource template `dashboard-icons://icons/{name}` returns the icon's SVG (`image/svg+xml`), with name completion.
- Prompt `icons_for_dashboard` (`services`, `dashboard`: `homarr` | `homepage` | `dashy` | `generic`) asks the model to call `match_icons` once and write a config snippet with the CDN URLs.

## Rate limits

| Scope                     | Limit                |
| ------------------------- | -------------------- |
| All MCP requests          | 60 per minute per IP |
| Tool calls (`tools/call`) | 30 per minute per IP |

When exceeded, the server returns HTTP `429` with a `Retry-After` header.

## Environment variables

| Variable                        | Description                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `MCP_RATE_LIMIT_ENABLED`        | Set to `false` to disable rate limiting (local dev only)                                         |
| `MCP_VERBOSE_LOGS`              | Set to `true` for verbose MCP handler logs                                                       |
| `MCP_WARM_CACHE`                | Set to `true` to preload metadata on server start                                                |
| `DASHBOARD_ICONS_METADATA_PATH` | Local `metadata.json` path (development only; blocked in production)                             |
| `NEXT_PUBLIC_POSTHOG_KEY`       | Enables PostHog MCP analytics using the existing project key                                     |
| `NEXT_PUBLIC_POSTHOG_HOST`      | Client-side PostHog ingestion host (e.g. `https://hog.homarr.dev`)                               |
| `NEXT_PUBLIC_DISABLE_POSTHOG`   | Set to `true` to disable all PostHog capture                                                     |
| `MCP_OAUTH_SECRET`              | Enables sign-in and account tools; at least 32 bytes (`openssl rand -hex 48`). Set in production |
| `MCP_OAUTH_ISSUER`              | Public origin, e.g. `https://dashboardicons.com`. Set in production                              |

When enabled, the official `@posthog/mcp` SDK captures MCP lifecycle events, tool calls, latency, responses, and errors. Analytics are flushed after each serverless invocation.

## Scope

Native icons come from `metadata.json`; selfh.st, LobeHub and Simple Icons come from PocketBase. When PocketBase is unreachable, the tools still answer from native icons and report the missing sources in `degraded_sources`.
