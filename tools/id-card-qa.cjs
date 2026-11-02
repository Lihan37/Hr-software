/* Local synthetic browser QA. No production requests or employee data. */
const { chromium } = require('./.dashboard-qa/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const id = '507f191e810c19729de860ea';
const photo = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#c9ddea"/><circle cx="100" cy="110" r="55" fill="#607d8b"/><path d="M20 290V240a80 80 0 0 1 160 0v50" fill="#607d8b"/></svg>');
async function run() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const failures = [];
    let role = 'HR_ADMIN'; let missing = false; let broken = false;
    let fullName = 'Ayesha Rahman';
    page.on('pageerror', (error) => failures.push(error.message));
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const respond = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      if (url.pathname.endsWith('/auth/me')) return respond({ _id: 'qa-user', role, employee: { _id: id, fullName: 'QA User', employeeId: 'EMP-000001' } });
      if (url.pathname.includes('/lifecycle/notifications')) return respond([]);
      if (url.pathname.endsWith('/id-card-data')) {
        assert.ok(['HR_ADMIN', 'HR', 'SUPER_ADMIN'].includes(role), 'Unauthorized UI requested card data');
        return respond({ _id: id, employeeId: 'EMP-000001', fullName, profilePhoto: missing ? undefined : { url: broken ? 'data:image/png;base64,broken' : photo }, personal: { bloodGroup: 'B+' }, employment: { joiningDate: '2024-01-15', department: { name: 'Front Office' }, designation: { name: 'Guest Service Associate' } } });
      }
      failures.push(`Unexpected API: ${url.pathname}`); return respond(null);
    });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`http://localhost:3100/employees/${id}/id-card`);
      const preview = page.locator('[data-card-layout="preview"]');
      await preview.getByText('Ayesha Rahman', { exact: true }).waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('.id-card-side img')].every((img) => img.complete && img.naturalWidth > 0));
      assert.equal(await preview.locator('.id-card-side').count(), 2);
      assert.equal(await page.locator('[data-card-overflow]').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflows at ${width}`);
      const imageStyle = await preview.locator('img[alt="Ayesha Rahman"]').evaluate((img) => ({ fit: getComputedStyle(img).objectFit, radius: getComputedStyle(img).borderRadius }));
      assert.equal(imageStyle.fit, 'cover'); assert.equal(imageStyle.radius, '50%');
      console.log(`ID card layout ${width}px: OK`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => { window.__printCount = 0; window.print = () => { window.__printCount++; }; });
    await page.getByRole('button', { name: 'Save as PDF', exact: true }).click();
    await page.waitForFunction(() => window.__printCount === 1);
    const out = path.join(__dirname, '.dashboard-qa');
    await page.locator('[data-card-layout="preview"]').screenshot({ path: path.join(out, 'id-card-preview.png') });
    await page.pdf({ path: path.join(out, 'id-card-output.pdf'), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('[data-card-layout="preview"]').isVisible(), false);
    assert.equal(await page.locator('#employee-id-card-print-root').isVisible(), true);
    await page.emulateMedia({ media: 'screen' });
    fullName = 'Ayesha Rahman Chowdhury'; await page.reload();
    await page.locator('[data-card-layout="preview"]').getByText(fullName, { exact: true }).waitFor();
    assert.equal(await page.locator('[data-card-overflow]').count(), 0);
    fullName = 'Very Long Employee Name '.repeat(20); await page.reload();
    await page.locator('[data-card-layout="preview"] [data-card-overflow="true"]').waitFor();
    await page.getByRole('button', { name: 'Save as PDF', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'too long for the card' }).waitFor();
    fullName = 'Ayesha Rahman'; broken = true; await page.reload();
    await page.locator('[data-card-layout="preview"] [data-card-photo-missing]').waitFor();
    await page.getByRole('button', { name: 'Save as PDF', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'working employee profile photo' }).waitFor();
    broken = false;
    missing = true; await page.reload();
    await page.getByText(/Employee photo is missing/).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Save as PDF', exact: true }).isDisabled());
    for (const value of ['MANAGER', 'EMPLOYEE']) {
      role = value; await page.reload();
      await page.getByRole('heading', { name: 'Access denied', exact: true }).waitFor();
      assert.equal(await page.locator('.id-card-side').count(), 0);
    }
    assert.deepEqual(failures, []);
    await fs.writeFile(path.join(out, 'id-card-results.json'), JSON.stringify({ passed: true, scenarios: ['responsive front/back', 'photo crop', 'field fit', 'PDF/print isolation', 'updated employee', 'missing/broken photo', 'oversize field blocked', 'HR authorization'], failures }, null, 2));
    console.log('Preview, print/PDF, live profile regeneration, missing photo and role restrictions: OK');
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
