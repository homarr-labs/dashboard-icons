# Icon Management Scripts

This directory contains scripts for managing the dashboard icons.

## Scripts

### `merge-icons.ts`

This script merges data from `src/lib/isvg.ts` into the metadata.json file located at the repository root. It adds wordmark information to existing icons and creates new entries for icons that don't exist yet.

#### Usage

```bash
# Using the npm script
npm run merge-icons

# Or with pnpm
pnpm merge-icons
```

### `download-icons.ts`

This script downloads icons from the [svgl](https://github.com/pheralb/svgl) repository to the `svg` folder. It skips existing icons (except for wordmark icons which are always downloaded).

#### Usage

```bash
# Using the npm script
npm run download-icons

# Or with pnpm
pnpm download-icons
```

## Notes

- The `merge-icons.ts` script will add new icons to the metadata.json file with the author set to "ajnart" and a timestamp of "2025-04-20T12:00:00Z".
- The `download-icons.ts` script will create the `svg` directory if it doesn't exist.
- Both scripts log their progress to the console. 