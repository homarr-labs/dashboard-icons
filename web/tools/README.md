# Share image

From `web`, run `pnpm generate:og` to regenerate `public/og-image.png` using React and Next.js `ImageResponse`. Sharp rotates and softens the background grid; the logo and typography stay crisp. All 84 background icons are unique.

Set `OG_REFRESH_COUNT=true pnpm generate:og` to use the public search catalog's current total across native and external collections. The offline preview uses the approved 9,222 count. A failed or incomplete catalog response stops the refresh rather than publishing a misleading count.

Main CI regenerates the image before its Docker build on pushes to `main`, manual runs, and Sundays at 06:17 UTC. The local `./web` Docker context includes the new PNG, so the image is shipped and deployed through the existing pipeline without image-only commits. No generation or external requests happen when a social crawler loads `/og-image.png`.

Edit the grid and branding in `generate-og-image.tsx`. Bundled font and external-icon attribution is in `og-assets/README.md`. Social platforms may retain their own cached previews after deployment.
