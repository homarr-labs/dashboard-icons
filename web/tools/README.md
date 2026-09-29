# Share image

From `web`, run `pnpm generate:og` to regenerate `public/og-image.png` using React and Next.js `ImageResponse`. Sharp rotates and softens the background grid; the logo and typography stay crisp. All 84 background icons are unique.

Set `OG_REFRESH_COUNT=true pnpm generate:og` to count native icons in the checked-out `metadata.json` and query each configured external collection directly through PocketBase. The default preview uses the approved 9,222 count; generating either version downloads the Hermes Agent icon from LobeHub. A failed request, empty collection, or invalid pagination response stops generation before writing the image. The tolerant search endpoint and its stale-data fallback are not used.

Main CI regenerates the image before its Docker build on pushes to `main`, manual runs, and Sundays at 06:17 UTC. The local `./web` Docker context includes the new PNG, so the image is shipped and deployed through the existing pipeline without image-only commits. No generation or external requests happen when a social crawler loads `/og-image.png`.

Edit the grid and branding in `generate-og-image.tsx`. Bundled font attribution and external-icon source is in `og-assets/README.md`. Social platforms may retain their own cached previews after deployment.

# Showreel

`showreel/index.html` is a 22-second motion piece about Dashboard Icons. Every frame is a pure function of time (`window.render(t)`), so it renders identically on every run. The published cut lives at `assets/showreel.mp4`.

From `web`, run `node tools/showreel/render.mjs` to capture 1920×1080 frames at 60 fps with Playwright and encode `showreel/out/showreel-silent.mp4` with ffmpeg. Pass `--stills 2.5,11.4` to write single PNG frames for review instead, or `--from`/`--to` to render a range. Icons come from the repository's `png` and `svg` folders; the Inter and JetBrains Mono fonts must be installed locally.

Each render also writes `out/events.json`, the cue sheet of every whoosh, tick, and impact. `uv run tools/showreel/audio.py` synthesizes the matching 120 BPM soundtrack from it into `out/soundtrack.wav`. Mux and compress the published cut from `web/tools/showreel/out`:

```bash
ffmpeg -i showreel-silent.mp4 -i soundtrack.wav -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1 -movflags +faststart -shortest ../../../../assets/showreel.mp4
```

Everything in `out/` is ignored by git.
