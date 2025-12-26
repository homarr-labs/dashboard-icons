import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-results', 'screenshots');
const BASE_URL = 'http://localhost:3000';

// Test icons with different characteristics
const TEST_ICONS = [
  'github',
  'docker', 
  'react',
  'nextjs',
  'typescript',
];

async function takeScreenshots() {
  console.log('Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    console.log('Taking screenshots of SVG Customizer feature...\n');

    // Screenshot 1: Icon page with customize button
    console.log('1. Navigating to icon page...');
    await page.goto(`${BASE_URL}/icons/${TEST_ICONS[0]}`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '01-icon-page-with-customize-button.png'),
      fullPage: true 
    });
    console.log('✓ Saved: 01-icon-page-with-customize-button.png');

    // Screenshot 2: Opened inline customizer
    console.log('\n2. Opening inline customizer...');
    const customizeButton = page.getByRole('button', { name: /customize icon/i });
    await customizeButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '02-inline-customizer-opened.png'),
      fullPage: true 
    });
    console.log('✓ Saved: 02-inline-customizer-opened.png');

    // Screenshot 3: Color pickers displayed
    console.log('\n3. Showing color pickers...');
    await page.goto(`${BASE_URL}/icons/${TEST_ICONS[2]}`);
    await page.waitForLoadState('networkidle');
    const customizeButton2 = page.getByRole('button', { name: /customize icon/i });
    if (await customizeButton2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await customizeButton2.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '03-color-pickers-displayed.png'),
        fullPage: true 
      });
      console.log('✓ Saved: 03-color-pickers-displayed.png');
    } else {
      console.log('⚠ Skipped: Customize button not found for', TEST_ICONS[2]);
    }

    // Screenshot 4: Before color change
    console.log('\n4. Taking before color change screenshot...');
    await page.goto(`${BASE_URL}/icons/${TEST_ICONS[1]}`);
    await page.waitForLoadState('networkidle');
    const customizeButton3 = page.getByRole('button', { name: /customize icon/i });
    if (await customizeButton3.isVisible({ timeout: 5000 }).catch(() => false)) {
      await customizeButton3.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '04-before-color-change.png'),
        fullPage: true 
      });
      console.log('✓ Saved: 04-before-color-change.png');
    } else {
      console.log('⚠ Skipped: Customize button not found for', TEST_ICONS[1]);
    }

    // Screenshot 5: After color change
    console.log('\n5. Changing color and taking after screenshot...');
    const hueSlider = page.locator('input[type="range"]').first();
    if (await hueSlider.isVisible({ timeout: 5000 }).catch(() => false)) {
      await hueSlider.fill('180');
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '05-after-color-change.png'),
        fullPage: true 
      });
      console.log('✓ Saved: 05-after-color-change.png');
    } else {
      console.log('⚠ Skipped: Color slider not found');
    }

    // Screenshot 6: Action buttons (copy/download)
    console.log('\n6. Showing action buttons...');
    await page.goto(`${BASE_URL}/icons/${TEST_ICONS[4]}`);
    await page.waitForLoadState('networkidle');
    const customizeButton4 = page.getByRole('button', { name: /customize icon/i });
    if (await customizeButton4.isVisible({ timeout: 5000 }).catch(() => false)) {
      await customizeButton4.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '06-action-buttons.png'),
        fullPage: true 
      });
      console.log('✓ Saved: 06-action-buttons.png');
    } else {
      console.log('⚠ Skipped: Customize button not found for', TEST_ICONS[4]);
    }

    // Screenshot 7: Multiple icons with customizer
    console.log('\n7. Testing with multiple icons...');
    for (let i = 0; i < 3; i++) {
      const iconName = TEST_ICONS[i];
      await page.goto(`${BASE_URL}/icons/${iconName}`);
      await page.waitForLoadState('networkidle');
      
      const btn = page.getByRole('button', { name: /customize icon/i });
      if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: path.join(SCREENSHOTS_DIR, `07-${iconName}-customizer.png`),
          fullPage: true 
        });
        console.log(`✓ Saved: 07-${iconName}-customizer.png`);
      } else {
        console.log(`⚠ Skipped: Customize button not found for ${iconName}`);
      }
    }

    // Screenshot 8: Info popover
    console.log('\n8. Showing info popover...');
    await page.goto(`${BASE_URL}/icons/${TEST_ICONS[0]}`);
    await page.waitForLoadState('networkidle');
    const customizeButton5 = page.getByRole('button', { name: /customize icon/i });
    if (await customizeButton5.isVisible({ timeout: 5000 }).catch(() => false)) {
      await customizeButton5.click();
      await page.waitForTimeout(500);
      
      const infoButton = page.getByRole('button', { name: /learn more/i });
      if (await infoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await infoButton.click();
        await page.waitForTimeout(300);
        await page.screenshot({ 
          path: path.join(SCREENSHOTS_DIR, '08-info-popover.png'),
          fullPage: true 
        });
        console.log('✓ Saved: 08-info-popover.png');
      } else {
        console.log('⚠ Skipped: Info button not found');
      }
    } else {
      console.log('⚠ Skipped: Customize button not found for', TEST_ICONS[0]);
    }

    console.log('\n✅ All screenshots taken successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Error taking screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the screenshot script
takeScreenshots().catch(console.error);
