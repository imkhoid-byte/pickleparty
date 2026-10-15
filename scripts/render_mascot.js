// Renders assets/brand/mascot.svg to a transparent PNG with headless Chromium.
// Usage: node scripts/render_mascot.js <out.png> [size]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const out = process.argv[2];
  const size = Number(process.argv[3] || 1024);
  const svg = fs.readFileSync(path.join(__dirname, '..', 'assets', 'brand', 'mascot.svg'), 'utf8');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}</body></html>`,
  );
  await page.locator('svg').screenshot({ path: out, omitBackground: true });
  await browser.close();
})();
