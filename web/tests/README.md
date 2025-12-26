# E2E Tests with Playwright

This directory contains end-to-end tests for the Dashboard Icons web application using Playwright.

## Setup

Playwright is already installed. The configuration is in `playwright.config.ts`.

## Running Tests

Run all e2e tests:
```bash
npm run test:e2e
```

Run tests in UI mode (interactive):
```bash
npm run test:e2e:ui
```

Run tests in debug mode:
```bash
npm run test:e2e:debug
```

Run tests only on Chromium:
```bash
npm run test:e2e:chromium
```

Run tests in headed mode (see the browser):
```bash
npm run test:e2e:headed
```

View test report:
```bash
npm run test:e2e:report
```

## Taking Screenshots

To take screenshots of the SVG Customizer feature:

1. Start the dev server (in a separate terminal):
   ```bash
   npm run dev:web
   ```

2. Run the screenshot script:
   ```bash
   npm run screenshots
   ```

Screenshots will be saved to `test-results/screenshots/`.

## Test Coverage

### SVG Icon Customizer Tests (`icon-customizer.spec.ts`)

Tests for the inline SVG color customizer feature:

- ✅ Display of "Customize Icon" button on icon detail pages
- ✅ Opening the inline customizer
- ✅ Display of color pickers for detected colors
- ✅ Changing icon colors via color picker
- ✅ Copy and Download buttons functionality
- ✅ Closing the customizer
- ✅ Handling icons with no customizable colors
- ✅ Testing with multiple random icons
- ✅ Info popover about color customization
- ✅ Preview rendering with customized colors

## Screenshots

The following screenshots document the SVG Customizer feature:

1. **01-icon-page-with-customize-button.png** - Icon detail page with "Customize Icon" button
2. **02-inline-customizer-opened.png** - Inline customizer opened with color pickers
3. **04-before-color-change.png** - Customizer state before color changes
4. **06-action-buttons.png** - Copy and Download action buttons
5. **07-github-customizer.png** - Customizer with GitHub icon
6. **07-docker-customizer.png** - Customizer with Docker icon

## Configuration

The Playwright configuration (`playwright.config.ts`) includes:

- **Base URL**: `http://localhost:3000`
- **Test directory**: `./tests`
- **Projects**: Chromium (Firefox and WebKit commented out for faster CI runs)
- **Web server**: Automatically starts Next.js dev server before tests
- **Screenshots**: Taken only on failure
- **Trace**: Recorded on first retry

## CI/CD

Tests are configured to run in CI environments with:
- Retries: 2 on CI, 0 locally
- Workers: 1 on CI (serial execution)
- Parallel tests disabled on CI for stability

## Notes

- Some icons may not have customizable colors (those using strokes or other styling methods)
- The customizer feature extracts fill and stroke colors from SVG files
- Tests are resilient to icons without the customize feature
- Screenshots are excluded from git (see `.gitignore`)
