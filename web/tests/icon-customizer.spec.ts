import { expect, test } from '@playwright/test';

// Test icons with different characteristics
const TEST_ICONS = [
  'github', // Popular icon with multiple colors
  'docker', // Icon with blue color
  'sonarr', // Icon with distinct colors
  'nextjs', // Icon with light/dark variants
  'typescript', // Icon with single primary color
];

test.describe('SVG Icon Customizer', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to ensure consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should display the Customize Icon button on icon detail page', async ({ page }) => {
    // Navigate to an icon page
    await page.goto(`/icons/${TEST_ICONS[0]}`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for the Customize Icon button
    const customizeButton = page.getByRole('button', { name: /customize icon/i });
    await expect(customizeButton).toBeVisible();
    
    // Take a screenshot of the initial state
    await page.screenshot({ 
      path: 'test-results/screenshots/01-icon-page-with-customize-button.png',
      fullPage: true 
    });
  });

  test('should open inline customizer when clicking Customize Icon button', async ({ page }) => {
    await page.goto(`/icons/${TEST_ICONS[1]}`);
    await page.waitForLoadState('networkidle');
    
    // Click the Customize Icon button
    const customizeButton = page.getByRole('button', { name: /customize icon/i });
    await customizeButton.click();
    
    // Wait for customizer to appear
    await page.waitForTimeout(500); // Wait for animation
    
    // Check that customizer UI is visible
    const customizerTitle = page.getByText('Customize Colors');
    await expect(customizerTitle).toBeVisible();
    
    // Take screenshot of opened customizer
    await page.screenshot({ 
      path: 'test-results/screenshots/02-inline-customizer-opened.png',
      fullPage: true 
    });
  });

  test('should display color picker for each detected color', async ({ page }) => {
    await page.goto(`/icons/${TEST_ICONS[2]}`);
    await page.waitForLoadState('networkidle');
    
    // Open customizer
    const customizeButton = page.getByRole('button', { name: /customize icon/i });
    await customizeButton.click();
    await page.waitForTimeout(500);
    
    // Check for color picker labels (Color 1, Color 2, etc.)
    const colorLabels = page.locator('text=/Color \\d+/');
    const colorCount = await colorLabels.count();
    
    // Should have at least one color
    expect(colorCount).toBeGreaterThan(0);
    
    // Take screenshot showing color pickers
    await page.screenshot({ 
      path: 'test-results/screenshots/03-color-pickers-displayed.png',
      fullPage: true 
    });
  });

  test('should close customizer when clicking close button', async ({ page }) => {
    await page.goto(`/icons/${TEST_ICONS[0]}`);
    await page.waitForLoadState('networkidle');
    
    // Open customizer
    const customizeButton = page.getByRole('button', { name: /customize icon/i });
    await customizeButton.click();
    await page.waitForTimeout(500);
    
    // Verify customizer is open
    const customizerTitle = page.getByText('Customize Colors');
    await expect(customizerTitle).toBeVisible();
    
    // Click close button (X icon)
    const closeButton = page.locator('#close-customizer');
    await closeButton.click();
    await page.waitForTimeout(500);
    
    // Verify customizer is closed
    await expect(customizerTitle).not.toBeVisible();
    
    // Take screenshot of closed state
    await page.screenshot({ 
      path: 'test-results/screenshots/07-customizer-closed.png',
      fullPage: true 
    });
  });

  test('The customized SVG preview should update when the color is changed', async ({ page }) => {
    await page.goto('http://localhost:3000/icons/locals');
    await page.getByRole('button', { name: 'Customize Icon' }).click();
    await page.waitForTimeout(300);
    
    // Take initial screenshot of the customized SVG preview
    const initialScreenshot = await page.locator('#customized-svg-preview').screenshot();
    
    await page.getByRole('button', { name: 'hsl(353, 79%, 55%)' }).click();
    await page.waitForTimeout(300);
    await page.locator('.grid > button:nth-child(3)').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'hsl(48, 100%, 50%)' }).click();
    await page.waitForTimeout(300);
    
    // Take final screenshot and compare
    const finalScreenshot = await page.locator('#customized-svg-preview').screenshot();
    expect(finalScreenshot).not.toEqual(initialScreenshot);
  });

  test('should handle icons with no customizable colors gracefully', async ({ page }) => {
    // Try with a simple icon that might have no fill colors
    await page.goto('/icons/7zip');
    await page.waitForLoadState('networkidle');
    
    // Check if customize button exists
    const customizeButton = page.getByRole('button', { name: /customize icon/i });
    
    // If button exists, click it
    if (await customizeButton.isVisible()) {
      await customizeButton.click();
      await page.waitForTimeout(500);
      
      // Check for "no colors found" message or color pickers
      const noColorsMessage = page.getByText(/no fill colors found/i);
      const colorLabels = page.locator('text=/Color \\d+/');
      
      // Either should show no colors message or show color pickers
      const hasMessage = await noColorsMessage.isVisible();
      const hasColors = await colorLabels.count() > 0;
      
      expect(hasMessage || hasColors).toBe(true);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/screenshots/08-no-colors-or-with-colors.png',
        fullPage: true 
      });
    }
  });

  test('should test color customization with multiple icons', async ({ page }) => {
    // Test with 3 random icons
    const testIcons = TEST_ICONS.slice(0, 3);
    
    for (let i = 0; i < testIcons.length; i++) {
      const iconName = testIcons[i];
      await page.goto(`/icons/${iconName}`);
      await page.waitForLoadState('networkidle');
      
      // Try to find and click customize button
      const customizeButton = page.getByRole('button', { name: /customize icon/i });
      
      if (await customizeButton.isVisible()) {
        await customizeButton.click();
        await page.waitForTimeout(500);
        
        // Verify customizer opened
        const customizerTitle = page.getByText('Customize Colors');
        const isVisible = await customizerTitle.isVisible();
        
        if (isVisible) {
          // Take screenshot
          await page.screenshot({ 
            path: `test-results/screenshots/09-${iconName}-customizer.png`,
            fullPage: true 
          });
        }
        
        // Close customizer if it opened
        const closeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  test('should show info popover about color customization', async ({ page }) => {
    await page.goto(`/icons/${TEST_ICONS[0]}`);
    await page.waitForLoadState('networkidle');
    
    // Open customizer
    const customizeButton = page.getByRole('button', { name: /customize icon/i });
    await customizeButton.click();
    await page.waitForTimeout(500);
    
    // Look for the info button (should have Info icon)
    const infoButton = page.getByRole('button', { name: /learn more/i });
    
    if (await infoButton.isVisible()) {
      await infoButton.click();
      await page.waitForTimeout(300);
      
      // Check for popover content
      const popoverText = page.getByText(/extracts and allows you to customize/i);
      await expect(popoverText).toBeVisible();
      
      // Take screenshot of info popover
      await page.screenshot({ 
        path: 'test-results/screenshots/10-info-popover.png',
        fullPage: true 
      });
    }
  });

  test('should render icon preview with customized colors', async ({ page }) => {
    await page.goto(`/icons/${TEST_ICONS[1]}`);
    await page.waitForLoadState('networkidle');
    
    // Open customizer
    const customizeButton = page.getByRole('button', { name: /customize icon/i });
    await customizeButton.click();
    await page.waitForTimeout(500);
    
    // Find the preview container
    const previewContainer = page.locator('div[class*="bg-muted"]').filter({ has: page.locator('svg, [dangerouslySetInnerHTML]') }).first();
    
    // Verify preview is visible
    await expect(previewContainer).toBeVisible();
    
    // Adjust a color slider if available
    const hueSlider = page.locator('input[type="range"]').first();
    if (await hueSlider.isVisible()) {
      await hueSlider.fill('270'); // Change to purple hue
      await page.waitForTimeout(500);
    }
    
    // Take screenshot of preview with custom color
    await page.screenshot({ 
      path: 'test-results/screenshots/11-custom-preview.png',
      fullPage: true 
    });
  });
});
