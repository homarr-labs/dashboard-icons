# Dashboard Icons

<img width="1200" height="630" alt="image" src="https://github.com/user-attachments/assets/957a2fbc-beee-4bd6-b04c-4286be66ddd8" />

[![jsDelivr hits](https://img.shields.io/jsdelivr/gh/hy/walkxcode/dashboard-icons?style=flat-square&color=%23A020F0)](https://www.jsdelivr.com/package/gh/walkxcode/dashboard-icons)
[![jsDelivr hits](https://img.shields.io/jsdelivr/gh/hy/homarr-labs/dashboard-icons?style=flat-square&color=%23A020F0)](https://www.jsdelivr.com/package/gh/homarr-labs/dashboard-icons)
[![GitHub Stars](https://img.shields.io/github/stars/homarr-labs/dashboard-icons?style=flat-square&color=yellow)](https://github.com/homarr-labs/dashboard-icons/stargazers)
[![Contributors](https://img.shields.io/github/contributors/homarr-labs/dashboard-icons?style=flat-square&color=blue)](https://github.com/homarr-labs/dashboard-icons/graphs/contributors)

> **Your definitive source for dashboard icons, for you and your AI agent.**

A collection of over 3,400 curated icons and logos for services, applications and tools, designed for dashboards and app directories. Your agent can use them too: the [MCP server](#use-it-from-your-ai-agent-mcp) lets Claude Code, Codex, ChatGPT, Cursor, Hermes, OpenClaw and other agents find the right icon and its CDN link.

**[→ Browse the collection at dashboardicons.com](https://dashboardicons.com)**

## Why Dashboard Icons?

- **Comprehensive Collection**: 3,400+ icons for all popular services and tools
- **Consistent Style**: Uniform visual language across different services
- **Multiple Formats**: Available in SVG, PNG, and WEBP to suit your needs
- **Light & Dark Variants**: Icons optimized for both light and dark themes
- **Agent-Ready**: An MCP server that matches a whole `docker-compose.yml` to icons in one call and also searches the selfh.st, LobeHub and Simple Icons catalogs
- **Community-Driven**: Submit missing icons on [dashboardicons.com/submit](https://dashboardicons.com/submit), or let your agent do it

https://github.com/user-attachments/assets/65d61e2c-c80d-4174-8d1a-4117336909e4

## Using the Icons

### Website

Find and download icons at [dashboardicons.com](https://dashboardicons.com):

1. Search for the icon you need
2. Click on an icon to view details
3. Choose your preferred format
4. Download or copy the direct link

### Use it from your AI agent (MCP)

Give your coding agent or assistant direct access to the collection through the Model Context Protocol. It can then:

- Match every service in a `docker-compose.yml` or dashboard config to an icon in one call
- Return CDN links for SVG, PNG and WEBP in light and dark, or the raw SVG to inline
- Search the selfh.st, LobeHub and Simple Icons catalogs as well, with their licenses
- Submit a missing icon or propose an update for you, once you sign in

The server is free and needs no API key: `https://dashboardicons.com/api/mcp`

| Agent             | Setup                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code**   | `claude mcp add --transport http dashboard-icons https://dashboardicons.com/api/mcp`                                                     |
| **Codex**         | `codex mcp add dashboard-icons --url https://dashboardicons.com/api/mcp`                                                                 |
| **ChatGPT**       | On ChatGPT web: **Plugins** → **+** → **Add custom MCP server**, then paste the URL above. Workspace plans may need an admin to allow it |
| **Cursor**        | Add `"dashboard-icons": { "url": "https://dashboardicons.com/api/mcp" }` under `mcpServers` in `.cursor/mcp.json`                        |
| **VS Code**       | Add `"dashboard-icons": { "type": "http", "url": "https://dashboardicons.com/api/mcp" }` under `servers` in `.vscode/mcp.json`           |
| **Hermes Agent**  | Add `dashboard-icons: { url: "https://dashboardicons.com/api/mcp" }` under `mcp_servers` in `~/.hermes/config.yaml`                      |
| **OpenClaw**      | `openclaw mcp add dashboard-icons --url https://dashboardicons.com/api/mcp --transport streamable-http`                                  |
| **Other clients** | Any client with Streamable HTTP support takes the URL. Stdio-only clients can use `npx -y mcp-remote https://dashboardicons.com/api/mcp` |

Then ask something like _"Add icons for every service in my docker-compose.yml"_. You can also open **Add to MCP client** on [dashboardicons.com](https://dashboardicons.com) for copy-paste setup. Tools, limits and sign-in are covered in the [MCP documentation](web/docs/MCP.md).

### Direct Links

Use icons from CDN with this pattern:

```
<Base URL>/<Format>/<Icon Name>.<Format>
```

**Base URL options:**

- jsDelivr (recommended): `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons`
- GitHub Direct: `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main`

**Example:**

```html
<img
  src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg"
  alt="Plex"
/>
```

### Technical Details

- **Naming Convention**: Kebab-case (lowercase with hyphens)
  - Example: "Nextcloud Calendar" → `nextcloud-calendar`

- **Available Formats**:
  - SVG: Vector format (original source)
  - PNG: 512px height (auto-generated)
  - WEBP: 512px height (auto-generated)

- **Variants**:
  - `-light` suffix for dark backgrounds (e.g., `github-light.svg`)
  - `-dark` suffix for light backgrounds (e.g., `github-dark.svg`)

- **Command Line**:
  ```bash
  # Download with curl
  curl -O https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/nextcloud.svg

  # Download with wget
  wget https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/nextcloud.svg
  ```

## Dashboard Integration

These icons integrate seamlessly with popular dashboard applications:

- [Homarr](https://github.com/ajnart/homarr)
- [Homepage](https://github.com/gethomepage/homepage)
- [Dashy](https://github.com/Lissy93/dashy)

...and many others!

## Contributing

### Request Icons

Need an icon that's not in our collection?

> [!NOTE]
> Submit new icons and updates to existing ones with the form at [dashboardicons.com/submit](https://dashboardicons.com/submit). GitHub issues are no longer used for icon submissions.

> [!IMPORTANT]
> If you would like to help review, approve, or reject icon submissions, contact us:
>
> - **Discord:** https://discord.com/invite/aCsmEV5RgA
> - **Email:** homarr-labs@proton.me
>
> If you want to be an admin for dashboardicons.com, tell us (via Discord or email) why you'd like to help and what you bring to the project!

1. Check the [Contribution Guidelines](CONTRIBUTING.md) for specifications
2. Open [dashboardicons.com/submit](https://dashboardicons.com/submit) to add a new icon or propose an update to an existing one
3. Admins review your submission. Approved submissions go live once a maintainer publishes them.

### Improve the Repository

Want to help with the repository itself?

- Review our [Contribution Guidelines](CONTRIBUTING.md)
- Fork the repository, make your changes, and submit a pull request
- We welcome help with documentation, website improvements, and maintenance

## Support

- **Icon submissions**: [dashboardicons.com/submit](https://dashboardicons.com/submit)
- **GitHub Issues**: Report bugs
- **Email**: [homarr-labs@proton.me](mailto:homarr-labs@proton.me)

## Legal

**Disclaimer**: All product names, trademarks, and registered trademarks are the property of their respective owners. Icons are used for identification purposes only and do not imply endorsement.

The website also indexes externally hosted icons from [Simple Icons](https://simpleicons.org/), served through its
[colorable CDN](https://cdn.simpleicons.org/). Simple Icons source links, guidelines, and license details are credited on
each external icon page. Brand-color, black, and white variants are available as SVG and PNG,
and catalogue previews automatically use black or white to match the website theme. Its CC0-1.0 collection license does
not waive third-party trademark, patent, or brand-guideline restrictions.

**License**: This project is available under the terms of the [LICENSE](LICENSE) file.

---

<p align="center">
  Made with ♥ by the <a href="https://github.com/homarr-labs">Homarr Labs</a> team and contributors
</p>
