/* Synthetic UI regression suite. All API requests are intercepted; no real HR data. */
const { chromium } = require('./.dashboard-qa/node_modules/playwright');
const { fixture } = require('./dashboard-visual-qa.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.HRMS_QA_URL || 'http://localhost:3100';
const id = '507f191e810c19729de860ea';
const ref = { _id: id, name: 'Operations', code: 'OPS', active: true };
const employee = { _id: id, employeeId: 'EMP-000001', fullName: 'Ayesha Rahman', firstName: 'Ayesha', lastName: 'Rahman', personal: { bloodGroup: 'B+', phone: '01000000000' }, employment: { status: 'ACTIVE', employmentType: 'PERMANENT', employeeType: 'PERMANENT', joiningDate: '2024-01-15', confirmationDate: '2024-05-15', department: ref, designation: { ...ref, name: 'Guest Service Associate' }, locationRef: { ...ref, name: 'Dhaka' } } };
const types = [{ ...ref, name: 'Casual leave', code: 'CL', paid: true, entitlementMode: 'ANNUAL', defaultEntitlement: 10 }];
const balance = { entitled: 10, accrued: 0, adjustments: 0, used: 2, pending: 1, available: 7 };
const policy = { leaveDayCountingMode: 'CALENDAR_DAYS', reservePendingBalance: true, probationAccrual: { enabled: false, mode: 'UNCONFIGURED', applicableLeaveCodes: [], rounding: 'UNCONFIGURED' }, weeklyCycle: { basis: 'UNCONFIGURED' }, chQualification: { enabled: false, minimumWorkedMinutes: null, requiresPriorAuthorization: true, availableDuringProbation: false } };

async function run() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const failures = []; const requests = []; const results = [];
  const out = path.join(__dirname, '..', 'artifacts', 'dashboard', 'modern-ui');
  await fs.mkdir(out, { recursive: true });
  try {
    const page = await browser.newPage();
    let role = 'SUPER_ADMIN';
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('401')) failures.push(`${message.text()} ${message.location().url}`); });
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url()); const endpoint = url.pathname.replace('/api/v1', '');
      requests.push(endpoint + url.search);
      const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? { success: true, data } : { success: false, error: { message: 'Synthetic sign-in rejection' } }) });
      if (endpoint === '/auth/me') return respond({ _id: 'qa-user', email: 'admin@example.test', role, employee });
      if (endpoint === '/auth/login') return respond(null, 401);
      if (endpoint === '/auth/refresh') return respond(null, 401);
      if (endpoint === '/auth/logout') return respond({});
      assert.equal(route.request().method(), 'GET', `Unexpected mutation: ${endpoint}`);
      if (endpoint.startsWith('/dashboard/')) {
        if (endpoint.endsWith('/records')) return respond({ rows: [], total: 0, page: 1, pages: 1, context: fixture.meta });
        const data = structuredClone(fixture);
        if (role === 'EMPLOYEE') { data.meta.mode = 'SELF'; data.meta.scope = 'My employee record'; data.activities = []; }
        if (role === 'MANAGER') { data.meta.mode = 'TEAM'; data.meta.scope = 'My team / assigned HOD scope'; }
        return respond(data);
      }
      if (endpoint === '/employees') return respond([employee, { ...employee, _id: '507f191e810c19729de860eb', employeeId: 'EMP-000002', fullName: 'Farhan Ahmed' }]);
      if (endpoint === `/employees/${id}`) return respond(employee);
      if (endpoint.endsWith('/profile-data')) return respond({ contact: {}, identity: {}, bank: {}, family: [], education: [], experience: [], identityRestricted: false, bankRestricted: false });
      if (endpoint.startsWith('/organization/')) return respond([ref]);
      if (endpoint === '/lifecycle/policy') return respond({ probationDurationMonths: 4, probationEvaluationReminderDays: 7, contractExpiryReminderDays: 30, traineeCompletionReminderDays: 7, timezone: 'Asia/Dhaka' });
      if (endpoint === '/lifecycle/trainee-types') return respond([ref]);
      if (endpoint.startsWith('/lifecycle/')) return respond([]);
      if (endpoint === '/leave/types') return respond(types);
      if (endpoint === '/leave/policy') return respond(policy);
      if (endpoint === '/leave/balances') return respond([{ ...balance, leaveType: types[0] }]);
      if (endpoint === '/leave/balances/overview') return respond({ year: 2026, page: 1, pageSize: 25, total: 2, scope: role === 'MANAGER' ? 'TEAM' : role === 'EMPLOYEE' ? 'SELF' : 'ALL', leaveTypes: types, rows: [{ ...employee, department: ref, status: 'ACTIVE', eligible: true, balances: [{ ...balance, leaveType: id }] }] });
      if (endpoint === '/leave/requests') return respond([{ _id: id, employee, leaveType: types[0], startDate: '2026-11-10', endDate: '2026-11-11', requestedDays: 2, reason: 'Family event', status: 'PENDING_HOD' }]);
      if (endpoint.startsWith('/leave/')) return respond([]);
      if (endpoint === '/attendance') return respond([{ _id: id, employee, date: '2026-11-05', checkIn: '2026-11-05T03:00:00Z', checkOut: '2026-11-05T12:00:00Z', status: 'PRESENT', source: 'BIOMETRIC', lateMinutes: 0, workedMinutes: 540 }]);
      if (endpoint === '/attendance-corrections') return respond([]);
      if (endpoint === '/users') return respond([{ _id: id, email: 'admin@example.test', role: 'SUPER_ADMIN', status: 'ACTIVE', employee }]);
      if (endpoint === '/audit') return respond([]);
      failures.push(`Unexpected API ${endpoint}`); return respond([]);
    });
    const routes = [
      '/login', '/dashboard', '/employees', '/employees/new', `/employees/${id}`, `/employees/${id}/edit`,
      '/profile', '/attendance', '/leave', '/leave-management', '/approvals', '/people/organization',
      '/administration', '/administration/locations', '/administration/hr-policy', '/administration/leave', '/employees/probation-evaluations',
    ];
    for (const width of [1440, 1280, 1024, 768, 640, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(base + route);
        await page.getByRole('heading').first().waitFor();
        await page.waitForTimeout(70);
        const dimensions = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, width: innerWidth }));
        if (dimensions.actual > width + 1) {
          const overflowing = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((element) => { const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 1 && getComputedStyle(element).position !== 'fixed' && !element.closest('.table-wrap'); }).slice(0, 8).map((element) => ({ tag: element.tagName, class: element.className, text: element.textContent?.slice(0, 50) })));
          failures.push({ route, width, ...dimensions, overflowing });
        }
        if ((width === 1440 || width === 390) && ['/login', '/dashboard', '/employees', '/employees/new'].includes(route)) await page.screenshot({ path: path.join(out, route.replaceAll('/', '-').slice(1) + `-${width}.png`), fullPage: true });
        results.push({ route, width, ...dimensions });
      }
      console.log(`Workspace UI ${width}px: ${routes.length} routes checked`);
      await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, failures }, null, 2));
    }
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base + '/dashboard');
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    const nav = page.getByRole('dialog', { name: 'Navigation', exact: true }); await nav.waitFor();
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.keyboard.press('Shift+Tab');
    assert.ok(await nav.getByRole('link').last().evaluate((element) => element === document.activeElement));
    await page.keyboard.press('Tab');
    assert.ok(await nav.getByRole('button', { name: 'Close navigation', exact: true }).evaluate((element) => element === document.activeElement));
    await nav.getByRole('link', { name: 'Employee master', exact: true }).click();
    await page.getByRole('heading', { name: 'Employee master', exact: true }).waitFor();
    assert.equal(await nav.count(), 0);
    await page.getByRole('button', { name: 'Search modules', exact: true }).click();
    const search = page.getByRole('dialog', { name: 'Find a module', exact: true });
    await search.waitFor();
    await page.keyboard.press('Shift+Tab');
    assert.ok(await search.getByRole('button').last().evaluate((element) => element === document.activeElement));
    await page.keyboard.press('Tab');
    await search.getByRole('textbox', { name: 'Find a module', exact: true }).fill('leave');
    await search.getByRole('button', { name: 'Leave Management', exact: true }).click();
    await page.getByRole('heading', { name: 'Leave Management', exact: true }).waitFor();
    await page.keyboard.press('Control+k'); await search.waitFor(); await page.keyboard.press('Escape');
    assert.equal(await search.count(), 0);
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
    await page.getByRole('button', { name: 'Expand navigation', exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await nav.getByRole('link', { name: 'Employee master', exact: true }).waitFor(); // Mobile labels survive desktop collapse.
    await page.keyboard.press('Escape');
    for (const value of ['MANAGER', 'EMPLOYEE']) {
      role = value; await page.reload();
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await nav.waitFor(); assert.equal(await nav.getByRole('link', { name: 'Administration', exact: true }).count(), 0);
      await page.keyboard.press('Escape');
    }
    await page.goto(base + '/login');
    const password = page.getByLabel('Password', { exact: true });
    assert.equal(await password.getAttribute('type'), 'password');
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    assert.equal(await password.getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Synthetic sign-in rejection' }).waitFor();
    await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, failures, interactions: ['drawer/link/Escape', 'body scroll lock', 'module search', 'Ctrl+K', 'desktop collapse/mobile labels', 'role-aware menus', 'password visibility', 'sign-in error'] }, null, 2));
    assert.deepEqual(failures, []);
    console.log('Workspace UI routes, responsive widths, navigation, search, role visibility and login interactions: OK');
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
