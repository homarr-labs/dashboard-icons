# Custom variants live in a flat, additive `variants` map in metadata.json

`metadata.json` is read by many tools we can't migrate, so Variant support grows additively. The icon's tones stay in `colors`, the colour Wordmark is added as `wordmark.default` beside `wordmark.light`/`wordmark.dark`, and Custom variants go into a new flat map from name to file stem, e.g. `"variants": { "4k": "sonarr-4k" }`, with files named `<slug>-<name>`. We rejected a form × tone grid and a unified `variants` map that would replace `colors`/`wordmark`: the first was more model than contributors need, and the second would mean rewriting every entry and keeping mirrored keys in sync for old readers.

## Consequences

- A Custom variant name can't be a well-known Variant name, and `<slug>-<name>` can't collide with an existing Icon slug, because filenames alone can't tell a Variant from a separate product (`proton-mail`).
- Tone suffixes stay last in filenames, since some consumers strip a trailing `-light`/`-dark`.
- Existing separate entries for versions of the same product (`sonarr-4k`, `radarr-3d`) stay as they are, with their pages and URLs.

See `web/docs/research/variant-metadata-schema.md` for the consumer survey behind this.
