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
    let uploadFails = false;
    const uploadedRequests = [];
    let fullName = 'Ayesha Rahman';
    page.on('pageerror', (error) => failures.push(error.message));
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? { success: true, data } : { success: false, error: { message: 'Unable to store the photo. Please retry.' } }) });
      if (url.pathname.endsWith('/auth/me')) return respond({ _id: 'qa-user', role, employee: { _id: id, fullName: 'QA User', employeeId: 'EMP-000001' } });
      if (url.pathname.includes('/lifecycle/notifications')) return respond([]);
      if (url.pathname.endsWith('/photo')) {
        assert.ok(['HR_ADMIN', 'HR', 'SUPER_ADMIN'].includes(role));
        assert.ok(route.request().headers()['content-type'].startsWith('multipart/form-data; boundary='));
        assert.ok(route.request().postDataBuffer().includes(Buffer.from('name="photo"')));
        uploadedRequests.push(url.pathname);
        if (uploadFails) return respond(null, 502);
        missing = false; broken = false;
        return respond({ url: photo, storageKey: 'synthetic-photo', provider: 'cloudinary' });
      }
      if (url.pathname.endsWith('/profile-data')) return respond({ family: [], education: [], experience: [], identityRestricted: true, bankRestricted: true });
      if (url.pathname.endsWith('/id-card-data') || url.pathname === `/api/v1/employees/${id}`) {
        assert.ok(['HR_ADMIN', 'HR', 'SUPER_ADMIN'].includes(role), 'Unauthorized UI requested card data');
        return respond({ _id: id, employeeId: 'EMP-000001', fullName, profilePhoto: missing ? undefined : { url: broken ? 'data:image/png;base64,broken' : photo }, personal: { bloodGroup: 'B+' }, employment: { status: 'ACTIVE', employmentType: 'PERMANENT', joiningDate: '2024-01-15', department: { name: 'Front Office' }, designation: { name: 'Guest Service Associate' } } });
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
      for (const side of await preview.locator('.id-card-side').all()) {
        await side.scrollIntoViewIfNeeded();
        const corners = await side.evaluate((card) => {
          const rect = card.getBoundingClientRect();
          return { radius: parseFloat(getComputedStyle(card).borderTopLeftRadius), clip: getComputedStyle(card).clipPath,
            outside: [[rect.left + 1, rect.top + 1], [rect.right - 1, rect.top + 1], [rect.left + 1, rect.bottom - 1], [rect.right - 1, rect.bottom - 1]].every(([x, y]) => !card.contains(document.elementFromPoint(x, y))) };
        });
        assert.ok(corners.radius > 10 && corners.clip.startsWith('inset(') && corners.outside, 'All four corners must clip the rectangular white artwork background');
      }
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
    assert.ok(await page.locator('#employee-id-card-print-root .id-card-side').first().evaluate((card) => getComputedStyle(card).clipPath.startsWith('inset(')), 'Print must preserve rounded card clipping');
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
    const uploader = page.getByRole('region', { name: 'Employee photo upload', exact: true });
    const photoInput = uploader.getByLabel('Choose employee photo', { exact: true });
    await photoInput.setInputFiles({ name: 'not-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await uploader.getByText('Choose a WebP image.', { exact: true }).waitFor();
    for (const mimeType of ['image/png', 'image/jpeg']) {
      await photoInput.setInputFiles({ name: 'unsupported-photo', mimeType, buffer: Buffer.from('not webp') });
      await uploader.getByText('Choose a WebP image.', { exact: true }).waitFor();
    }
    await photoInput.setInputFiles({ name: 'large.webp', mimeType: 'image/webp', buffer: Buffer.alloc(1000 * 1000 + 1) });
    await uploader.getByText('Photo must be 1000 KB or smaller.', { exact: true }).waitFor();
    assert.equal(uploadedRequests.length, 0);
    const webpDataUrl = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8; return canvas.toDataURL('image/webp'); });
    const webp = Buffer.from(webpDataUrl.split(',')[1], 'base64');
    await photoInput.setInputFiles({ name: 'portrait.webp', mimeType: 'image/webp', buffer: webp });
    await page.waitForFunction(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Upload photo'); return button && !button.disabled; });
    uploadFails = true;
    await uploader.getByRole('button', { name: 'Upload photo', exact: true }).click();
    await uploader.getByText('Unable to store the photo. Please retry.', { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Save as PDF', exact: true }).isDisabled());
    uploadFails = false;
    await uploader.getByRole('button', { name: 'Upload photo', exact: true }).click();
    await uploader.getByText('Photo saved to Employee Profile. The ID card now uses this photo.', { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Save as PDF', exact: true }).isEnabled());
    assert.equal(await page.locator('[data-card-photo-missing]').count(), 0);
    await photoInput.setInputFiles({ name: 'replacement.webp', mimeType: 'image/webp', buffer: webp });
    await page.waitForFunction(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Replace photo'); return button && !button.disabled; });
    await uploader.getByRole('button', { name: 'Replace photo', exact: true }).click();
    await uploader.getByText('Photo saved to Employee Profile. The ID card now uses this photo.', { exact: true }).waitFor();
    await page.reload();
    await page.locator('[data-card-layout="preview"]').getByText(fullName, { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Save as PDF', exact: true }).isEnabled());
    await page.goto(`http://localhost:3100/employees/${id}`);
    await uploader.waitFor();
    await photoInput.setInputFiles({ name: 'profile-photo.webp', mimeType: 'image/webp', buffer: webp });
    await page.waitForFunction(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Replace photo'); return button && !button.disabled; });
    await uploader.getByRole('button', { name: 'Replace photo', exact: true }).click();
    await uploader.getByText('Photo saved to Employee Profile. The ID card now uses this photo.', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Generate ID Card', exact: true }).click();
    await page.locator('[data-card-layout="preview"]').getByText(fullName, { exact: true }).waitFor();
    for (const value of ['MANAGER', 'EMPLOYEE']) {
      role = value; await page.reload();
      await page.getByRole('heading', { name: 'Access denied', exact: true }).waitFor();
      assert.equal(await page.locator('.id-card-side').count(), 0);
    }
    assert.deepEqual(failures, []);
    await fs.writeFile(path.join(out, 'id-card-results.json'), JSON.stringify({ passed: true, scenarios: ['responsive front/back', 'photo crop', 'field fit', 'PDF/print isolation', 'updated employee', 'missing/broken photo', 'photo upload/replace and reload', 'invalid/oversized upload', 'upload failure/retry', 'oversize field blocked', 'HR authorization'], failures }, null, 2));
    console.log('Preview, print/PDF, live profile regeneration, missing photo and role restrictions: OK');
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
