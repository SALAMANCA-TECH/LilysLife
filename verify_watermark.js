const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the local server
    await page.goto('http://localhost:8000');

    // Give the page a moment to load
    await page.waitForTimeout(1000);

    // 1. Verify watermark on the main menu
    console.log('Taking screenshot of the main menu...');
    await page.screenshot({ path: '/home/jules/verification/watermark_main_menu.png' });

    // 2. Navigate to the narrative screen by making wardrobe selections
    console.log('Navigating to the narrative screen...');
    await page.click('#wardrobe-button');
    await page.waitForTimeout(500);

    // Select Top
    console.log('Selecting a top...');
    await page.click('button:has-text("Baggy Sweater")');
    await page.waitForTimeout(500);

    // Select Bottom
    console.log('Selecting a bottom...');
    await page.click('button:has-text("Plaid Skirt")');
    await page.waitForTimeout(500);

    // Select Shoes
    console.log('Selecting shoes...');
    await page.click('button:has-text("White Converse")');

    // Wait for the narrative to start
    await page.waitForSelector('#narrative-container p', { timeout: 10000 });
    await page.waitForTimeout(1000); // Allow narrative text to fade in
    console.log('Narrative screen loaded.');

    // 3. Verify watermark on the narrative screen
    console.log('Taking screenshot of the narrative screen...');
    await page.screenshot({ path: '/home/jules/verification/watermark_narrative.png' });

    console.log('Verification screenshots saved successfully.');

  } catch (error) {
    console.error('An error occurred during verification:', error);
  } finally {
    await browser.close();
  }
})();
