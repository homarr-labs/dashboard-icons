# Share image

From `web`, run `pnpm generate:og` to regenerate `public/og-image.png` using React and Next.js `ImageResponse`. Sharp rotates and softens the background grid; the logo and typography stay crisp. All 84 background icons are unique.

Set `OG_REFRESH_COUNT=true pnpm generate:og` to count native icons in the checked-out `metadata.json` and query each configured external collection directly through PocketBase. The default preview uses the approved 9,222 count; generating either version downloads the Hermes Agent icon from LobeHub. A failed request, empty collection, or invalid pagination response stops generation before writing the image. The tolerant search endpoint and its stale-data fallback are not used.

Main CI regenerates the image before its Docker build on pushes to `main`, manual runs, and Sundays at 06:17 UTC. The local `./web` Docker context includes the new PNG, so the image is shipped and deployed through the existing pipeline without image-only commits. No generation or external requests happen when a social crawler loads `/og-image.png`.

Edit the grid and branding in `generate-og-image.tsx`. Bundled font attribution and external-icon source is in `og-assets/README.md`. Social platforms may retain their own cached previews after deployment.
