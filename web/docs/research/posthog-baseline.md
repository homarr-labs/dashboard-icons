# MCP analytics baseline (PostHog project `dashboard-icons`, id 60749, EU) — 2026-10-15

Source: HogQL on `events`, `$lib = posthog-node-mcp` 0.11.0.

## Volume (last 30 days)

| event             | count                                                      |
| ----------------- | ---------------------------------------------------------- |
| `$mcp_tools_list` | 37,896 (dropped by `beforeSend` today, so these are older) |
| `$mcp_initialize` | 26,940                                                     |
| `$mcp_tool_call`  | 2,108                                                      |

## Fragmentation (last 14 days)

| event             | events | distinct_id | `$session_id` |
| ----------------- | ------ | ----------- | ------------- |
| `$mcp_initialize` | 2,534  | 2,534       | 2,534         |
| `$mcp_tool_call`  | 799    | 799         | 799           |

- Every event has its own `distinct_id` = `$session_id` = `ses_<uuidv7>`, so there are no sessions, funnels or retention.
- `$mcp_client_name` is null on ~85% of tool calls. The client name only exists on the `initialize` request, which is served by a different stateless server instance.
- No `$mcp_intent`, `$mcp_conversation_id`, model or person properties are captured (`context: false`).
- `$ip` is the server's own IP, and `$geoip_disable: true` is set.
- Clients already send correlation data in `params._meta`. For example, Codex sends `sessionId`, `threadId`, `windowId` and `x-codex-turn-metadata.model`.

## Tool usage and errors (last 30 days)

| tool         | calls | errors                           |
| ------------ | ----- | -------------------------------- |
| search_icons | ~966  | 2                                |
| suggest_icon | ~467  | 2                                |
| get_icon     | ~342  | 79 (23%, almost all `not_found`) |
| get_icon_url | ~332  | 36                               |

- `get_icon` misses are slugs that don't exist natively, e.g. `digarr`, `qbitrr`, `watchstate`/`watch-state`, `iventoy`/`i-ventoy`, `lmstudio`/`lm-studio`, `litellm`, `smartthings`, `volkswagen`. Possible fixes: fuzzy "did you mean" suggestions, a fallback to external sources (selfh.st, LobeHub, simple-icons), and a "request this icon" flow.
- Top `search_icons` queries are brand names: openai, claude, github, google, codex, gemini, anthropic, microsoft, aws, azure.
- Clients seen: claude-code, antigravity-client, Anthropic/ClaudeAI, Cherry Studio, openai-mcp (Codex), gomodel.
