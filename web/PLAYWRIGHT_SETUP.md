# SVG Customizer Feature - Playwright E2E Tests & Screenshots

This PR adds comprehensive end-to-end testing for the SVG Icon Customizer feature using Playwright, following the latest Playwright documentation.

## What's Been Added

### 1. Playwright Setup ✅
- Installed Playwright v1.57.0 in the `web` folder
- Configured for Next.js with auto-starting dev server
- Setup for Chromium browser (Firefox and WebKit available but commented out for faster CI)

### 2. Test Scripts Added to `web/package.json` ✅
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:debug": "playwright test --debug",
"test:e2e:chromium": "playwright test --project=chromium",
"test:e2e:headed": "playwright test --headed",
"test:e2e:report": "playwright show-report",
"screenshots": "node tests/take-screenshots.mjs"
```

### 3. E2E Test Suite ✅
Created `web/tests/icon-customizer.spec.ts` with 10 comprehensive tests:

1. ✅ Display of "Customize Icon" button on icon detail pages
2. ✅ Opening the inline customizer
3. ✅ Display of color pickers for detected colors
4. ✅ Changing icon colors via color picker sliders
5. ✅ Copy and Download buttons functionality
6. ✅ Closing the customizer
7. ✅ Handling icons with no customizable colors gracefully
8. ✅ Testing with multiple random icons (github, docker, react, nextjs, typescript)
9. ✅ Info popover about color customization
10. ✅ Preview rendering with customized colors

### 4. Screenshot Script ✅
Created `web/tests/take-screenshots.mjs` to automatically capture screenshots of the feature:
- Navigates to icon pages
- Opens the customizer
- Captures various states
- Handles edge cases gracefully

### 5. Documentation ✅
Added `web/tests/README.md` with:
- Setup instructions
- How to run tests
- Test coverage details
- Screenshot documentation
- CI/CD configuration notes

## Screenshots of the Feature

The following screenshots demonstrate the SVG Customizer feature in action:

### 1. Icon Page with Customize Button
![Icon Page](screenshots/01-icon-page-with-customize-button.png)
Shows the icon detail page with the "Customize Icon" button visible.

### 2. Inline Customizer Opened
![Customizer Opened](screenshots/02-inline-customizer-opened.png)
The customizer panel expanded with color pickers displayed.

### 3. Before Color Change
![Before Change](screenshots/04-before-color-change.png)
Customizer showing the original icon colors.

### 4. Action Buttons
![Action Buttons](screenshots/06-action-buttons.png)
Copy and Download buttons for the customized SVG.

### 5. GitHub Icon Customizer
![GitHub Customizer](screenshots/07-github-customizer.png)
Customizer working with the GitHub icon.

### 6. Docker Icon Customizer
![Docker Customizer](screenshots/07-docker-customizer.png)
Customizer working with the Docker icon.

## Running the Tests

### Prerequisites
The tests are already set up. Just navigate to the `web` folder.

### Run All Tests
```bash
cd web
npm run test:e2e
```

### Run Tests Interactively
```bash
npm run test:e2e:ui
```

### Generate Screenshots
```bash
# Start dev server in one terminal
npm run dev:web

# In another terminal, run screenshot script
npm run screenshots
```

## Test Configuration Highlights

- **Auto Dev Server**: Tests automatically start the Next.js dev server
- **Base URL**: http://localhost:3000
- **Screenshot on Failure**: Automatic screenshots when tests fail
- **Trace on Retry**: Full trace recorded on first retry for debugging
- **CI Optimized**: Serial execution and retries configured for CI environments

## Files Added/Modified

### New Files
- `web/playwright.config.ts` - Playwright configuration
- `web/tests/icon-customizer.spec.ts` - E2E test suite
- `web/tests/take-screenshots.mjs` - Screenshot automation script
- `web/tests/README.md` - Test documentation
- `web/test-results/screenshots/*.png` - Feature screenshots (gitignored)

### Modified Files
- `web/package.json` - Added test scripts and Playwright dependency
- `web/.gitignore` - Added package-lock.json (project uses pnpm)

## Notes

- Tests use random popular icons (github, docker, react, nextjs, typescript)
- The customizer feature works with SVGs that have fill/stroke colors
- Some icons may not support customization (using strokes or other methods)
- Tests are resilient to such cases
- Screenshots are excluded from git (in .gitignore)

## Future Enhancements

- Add tests for modal customizer when implemented
- Add visual regression testing
- Test color picker advanced features
- Test clipboard copy functionality
- Add accessibility (a11y) tests
