// The five deck stills from the running build: node deckshots.cjs <url> <outDir>
const { chromium } = require('D:/npm-cache/_npx/86170c4cd1c5da32/node_modules/playwright-core');
const [url, out] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const storyPage = async (n, file) => {
    await page.goto(url, { waitUntil: 'networkidle' });
    const top = await page.evaluate((label) => {
      const el = [...document.querySelectorAll('#story .step')].find((s) => s.textContent.includes(label));
      return el ? el.getBoundingClientRect().top + scrollY : -1;
    }, `Page ${n} of 18`);
    if (top < 0) throw new Error(`page ${n} not found`);
    // walk down in steps so every beat on the way fires, as a visitor's scroll would
    for (let y = 0; y < top - 80; y += 700) { await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(120); }
    await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), top - 80);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}/${file}` });
  };
  await storyPage(2, 's1.png');
  await storyPage(12, 's2.png');
  await storyPage(18, 's4.png');
  // Analyst lens: Dashboard, then Method scrolled to the automated checks
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.click('.cover-explore');
  await page.waitForTimeout(1800);
  await page.mouse.move(1430, 890);
  await page.screenshot({ path: `${out}/s3.png` });
  await page.locator('#sheet [role=tab]', { hasText: 'Method' }).first().click();
  await page.waitForTimeout(600);
  const found = await page.evaluate(() => { const h = document.querySelector('#dash-checks-title'); if (h) h.scrollIntoView({ block: 'start' }); return !!h; });
  await page.mouse.move(1430, 890); // no row under the pointer, so nothing shows a hover tone
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/s5.png` });
  console.log('checks heading found:', found);
  await browser.close();
})();
