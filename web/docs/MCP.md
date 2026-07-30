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

### `search_icons`

Search icons by name, alias, or category.

| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `query` | string | required | 100 chars |
| `limit` | number | 20 | 50 |
| `category` | string | optional | 50 chars |

### `get_icon`

Full metadata and CDN URLs for one icon.

| Parameter | Type |
|-----------|------|
| `name` | kebab-case slug |

### `get_icon_url`

Direct CDN URL for one icon.

| Parameter | Type | Default |
|-----------|------|---------|
| `name` | string | required |
| `format` | `svg` \| `png` \| `webp` | `svg` |
| `theme` | `default` \| `light` \| `dark` | `default` |

### `suggest_icon`

Fuzzy match from a natural service name (e.g. `"Plex media server"` → `plex`).

| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `service_name` | string | required | 100 chars |
| `limit` | number | 5 | 20 |

## Rate limits

| Scope | Limit |
|-------|-------|
| All MCP requests | 60 per minute per IP |
| Tool calls (`tools/call`) | 30 per minute per IP |

When exceeded, the server returns HTTP `429` with a `Retry-After` header.

## Environment variables

| Variable | Description |
|----------|-------------|
| `MCP_RATE_LIMIT_ENABLED` | Set to `false` to disable rate limiting (local dev only) |
| `MCP_VERBOSE_LOGS` | Set to `true` for verbose MCP handler logs |
| `MCP_WARM_CACHE` | Set to `true` to preload metadata on server start |
| `DASHBOARD_ICONS_METADATA_PATH` | Local `metadata.json` path (development only; blocked in production) |

## Scope

v1 covers **native icons** from `metadata.json` only. External sources (selfh.st, LobeHub) are not included.
