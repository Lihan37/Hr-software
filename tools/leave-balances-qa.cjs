/* Local-only browser QA using synthetic employees; never calls production. */
const { chromium } = require('./.dashboard-qa/node_modules/playwright');
const assert = require('node:assert/strict');

async function run() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const failures = [];
    const requests = [];
    let role = 'HR';
    let scenario = 'normal';
    const adjustments = [];
    const submissions = [];
    let failSaveOnce = false;
    const currentBalance = () => 7 + adjustments.reduce((sum, item) => sum + item.amount, 0);
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('503')) failures.push(message.text()); });
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? { success: true, data } : { success: false, error: { message: 'Leave balances temporarily unavailable' } }) });
      if (url.pathname.endsWith('/auth/me')) return respond({ _id: 'qa-user', role, email: 'qa@example.test', employee: { _id: 'qa-employee', fullName: 'QA user', employeeId: 'EMP-000001' } });
      if (url.pathname.includes('/lifecycle/notifications')) return respond([]);
      if (url.pathname.endsWith('/leave/balances/adjust')) {
        const input = route.request().postDataJSON(); submissions.push(input);
        if (!adjustments.some((item) => item.operationId === input.operationId)) adjustments.push({ ...input, _id: input.operationId, leaveType: { code: 'CL' }, actor: { email: 'qa@example.test' }, createdAt: '2026-10-28T10:00:00Z' });
        if (failSaveOnce) { failSaveOnce = false; return respond(null, 503); }
        return respond({ _id: input.operationId });
      }
      if (url.pathname.endsWith('/leave/balances/adjustments')) return respond({ rows: adjustments, total: adjustments.length, page: 1, pageSize: 20 });
      if (url.pathname.endsWith('/leave/balances')) return respond([{ leaveType: { _id: 'cl', code: 'CL', name: 'Casual leave' }, available: currentBalance() }]);
      if (!url.pathname.endsWith('/leave/balances/overview')) { failures.push(`Unexpected API: ${url.pathname}`); return respond(null, 404); }
      requests.push(url.searchParams.toString());
      if (scenario === 'error') return respond(null, 503);
      const currentPage = Number(url.searchParams.get('page'));
      return respond({
        year: Number(url.searchParams.get('year')), page: currentPage, pageSize: 25,
        total: scenario === 'empty' ? 0 : 26, scope: role === 'HR' ? 'ALL' : role === 'MANAGER' ? 'TEAM' : 'SELF',
        leaveTypes: [{ _id: 'cl', code: 'CL', name: 'Casual leave' }],
        rows: scenario === 'empty' ? [] : [{ _id: 'employee', employeeId: 'EMP-000001', fullName: currentPage === 1 ? 'Synthetic Employee' : 'Second Page Employee', department: { name: 'Operations' }, status: 'ACTIVE', eligible: true, balances: [{ leaveType: 'cl', entitled: 10, accrued: 0, adjustments: currentBalance() - 7, used: 2, pending: 1, available: currentBalance() }] }],
      });
    });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('http://localhost:3100/leave-management');
      await page.getByText('Synthetic Employee', { exact: true }).waitFor();
      const actual = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(actual <= width + 1, `Page overflow at ${width}: ${actual}`);
      console.log(`Layout ${width}px: OK`);
    }
    await page.getByRole('button', { name: 'Leave adjustments', exact: true }).click();
    await page.getByRole('button', { name: 'Adjust leave', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('No manual adjustments for this year.').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await dialog.getByLabel('Number of days').fill('2');
    await dialog.getByLabel('Adjustment reason').fill('Opening balance correction');
    await dialog.getByRole('button', { name: 'Save adjustment', exact: true }).click();
    await dialog.getByText('Opening balance correction', { exact: true }).waitFor();
    await dialog.getByLabel('Adjustment action', { exact: true }).selectOption('DEDUCT');
    await dialog.getByLabel('Number of days').fill('1');
    await dialog.getByLabel('Adjustment reason').fill('Deduct incorrect opening credit');
    failSaveOnce = true;
    await dialog.getByRole('button', { name: 'Save adjustment', exact: true }).click();
    await dialog.getByRole('button', { name: 'Retry adjustment', exact: true }).click();
    await dialog.getByText('Deduct incorrect opening credit', { exact: true }).waitFor();
    assert.equal(adjustments.length, 2);
    assert.equal(currentBalance(), 8);
    assert.equal(submissions[1].amount, -1);
    assert.equal(submissions[1].operationId, submissions[2].operationId);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByText('Second Page Employee', { exact: true }).waitFor();
    await page.getByLabel('Employee name or ID').fill('EMP-000001');
    await page.getByRole('button', { name: 'Search / Refresh' }).click();
    await page.getByText('Synthetic Employee', { exact: true }).waitFor();
    const selectedYear = String(Number(await page.getByLabel('Leave year', { exact: true }).inputValue()) - 1);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/leave/balances/overview') && response.url().includes(`year=${selectedYear}`)),
      page.getByLabel('Leave year', { exact: true }).selectOption(selectedYear),
    ]);
    assert.ok(requests.some((url) => url.includes('page=1') && url.includes('search=EMP-000001') && url.includes(`year=${selectedYear}`)));
    scenario = 'empty'; await page.reload();
    await page.getByText('No employees found in your permitted scope.').waitFor();
    scenario = 'error'; await page.reload();
    await page.getByRole('button', { name: 'Retry', exact: true }).waitFor();
    scenario = 'normal'; await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByText('Synthetic Employee', { exact: true }).waitFor();
    for (const [value, heading] of [['MANAGER', 'Team leave balances'], ['EMPLOYEE', 'My leave balances']]) {
      role = value; await page.reload();
      await page.getByRole('heading', { name: new RegExp(heading) }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Leave adjustments', exact: true }).count(), 0);
    }
    assert.deepEqual(failures, []);
    console.log('Search, year, pagination, empty, error/retry, adjustments add/deduct/history/idempotent retry, HR/HOD/employee UI: OK');
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
