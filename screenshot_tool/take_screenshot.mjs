import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  try {
    console.log('Navigating to app on port 3699...');
    await page.goto('http://localhost:3699/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Page loaded, waiting for rendering...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const outPath = join(__dirname, 'marketing_screenshot.png');
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Screenshot saved to ${outPath}`);

  } catch (err) {
    console.error('Error taking screenshot:', err);
  } finally {
    await browser.close();
  }
})();
