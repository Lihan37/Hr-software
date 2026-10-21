/* Local browser QA with synthetic API responses; never contacts production. */
const { chromium } = require("./.dashboard-qa/node_modules/playwright");
const fs = require("node:fs/promises");
const path = require("node:path");
const base = "http://localhost:3100";
const out = path.join(__dirname, "..", "artifacts", "dashboard");
const ref = "507f191e810c19729de860ea";
const person = {
  id: ref,
  employee: "Ayesha Rahman",
  employeeId: "EMP-000001",
  department: "Operations",
  detail: "CL · 2 days",
  date: "2026-10-21",
  status: "PENDING_HR",
  href: "/approvals",
};
const fixture = {
  meta: {
    date: "2026-10-21",
    timezone: "Asia/Dhaka",
    generatedAt: "2026-10-21T04:00:00Z",
    scope: "Organization · selected workforce",
    mode: "HR",
    headcountBasis:
      "Current employee status and assignments; historical snapshots unavailable.",
  },
  filters: {
    departments: [
      { value: ref, label: "Operations" },
      { value: "507f191e810c19729de860eb", label: "Finance" },
    ],
    branches: ["Dhaka", "Chattogram"],
    businessUnits: ["Hotel", "Hospitality services"],
  },
  kpis: {
    total: 66,
    active: 62,
    present: 39,
    absent: 0,
    approvedLeave: 7,
    pendingActions: 18,
    probation: 14,
    confirmed: 43,
    late: 5,
    missingPunch: 3,
    pendingAttendance: 6,
    recordedAbsences: 2,
    weeklyHoliday: 10,
    workedWeeklyHoliday: 3,
    joiners: 4,
  },
  attendance: {
    states: {
      PRESENT: 36,
      ABSENT: 0,
      APPROVED_LEAVE: 7,
      WEEKLY_HOLIDAY: 7,
      WORKED_WEEKLY_HOLIDAY: 3,
      MISSING_PUNCH: 3,
      PUBLIC_HOLIDAY: 0,
      PENDING: 6,
    },
    conflicts: 1,
    trend: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-10-${15 + i}`,
      present: 34 + i,
      missing: i % 3,
      recordedAbsent: 2,
    })),
    lastProcessedAt: "2026-10-21T03:45:00Z",
    absenceFinalizationAvailable: false,
  },
  attention: [
    {
      metric: "hr",
      label: "Final HR leave review",
      context: "Awaiting final approval",
      href: "/approvals",
      count: 5,
    },
    {
      metric: "hod",
      label: "HOD leave review",
      context: "Awaiting assigned HOD",
      href: "/approvals",
      count: 4,
    },
    {
      metric: "MISSING_PUNCH",
      label: "Missing attendance punches",
      context: "Incomplete daily evidence",
      href: "/attendance",
      count: 3,
    },
    {
      metric: "overdue",
      label: "Overdue probation reviews",
      context: "Stored review date has passed",
      href: "/employees/probation-evaluations",
      count: 2,
    },
  ],
  approvals: {
    hod: 4,
    hr: 5,
    corrections: 3,
    items: [
      person,
      {
        ...person,
        id: ref + "2",
        employee: "Nusrat Islam",
        status: "PENDING_HOD",
      },
    ],
  },
  leave: {
    upcoming: 3,
    requestsThisMonth: 19,
    usage: [
      { code: "CL", used: 12, requests: 8 },
      { code: "SL", used: 7, requests: 5 },
      { code: "AL", used: 18, requests: 4 },
      { code: "CH", used: 2, requests: 2 },
    ],
  },
  workforce: {
    departments: [
      {
        id: ref,
        name: "Operations",
        active: 32,
        present: 22,
        approvedLeave: 3,
        weeklyHoliday: 4,
        unknown: 3,
      },
      {
        id: ref + "1",
        name: "Food & Beverage Services",
        active: 18,
        present: 10,
        approvedLeave: 2,
        weeklyHoliday: 4,
        unknown: 4,
      },
      {
        id: ref + "2",
        name: "Finance & Administration",
        active: 12,
        present: 7,
        approvedLeave: 2,
        weeklyHoliday: 2,
        unknown: 2,
      },
    ],
    employment: [
      { name: "PERMANENT", count: 43 },
      { name: "PROBATION", count: 14 },
      { name: "CONTRACTUAL", count: 5 },
    ],
    branches: [
      { name: "Dhaka", count: 48 },
      { name: "Chattogram", count: 14 },
    ],
    businessUnits: [
      { name: "Hotel", count: 40 },
      { name: "Hospitality services", count: 22 },
    ],
    employeeTypes: [
      { name: "LOCAL", count: 60 },
      { name: "EXPAT", count: 2 },
    ],
    joiners: Array.from({ length: 6 }, (_, i) => ({
      month: `2026-${String(5 + i).padStart(2, "0")}`,
      count: (i % 3) + 2,
    })),
  },
  lifecycle: {
    upcoming: 4,
    overdue: 2,
    recentlyConfirmed: 3,
    reviews: [
      {
        ...person,
        status: "PROBATION",
        date: "2026-10-20",
        href: `/employees/${ref}`,
      },
      {
        ...person,
        id: ref + "3",
        employee: "Farhan Ahmed",
        status: "PROBATION",
        date: "2026-11-02",
        href: `/employees/${ref}`,
      },
    ],
  },
  ch: {
    earned: 8,
    reversed: 1,
    pending: 3,
    exceptions: 1,
    policyEnabled: false,
  },
  activities: [
    {
      id: "a",
      label: "employee updated",
      employee: "Ayesha Rahman",
      timestamp: "2026-10-21T03:40:00Z",
      href: `/employees/${ref}`,
    },
    {
      id: "b",
      label: "employee created",
      employee: "Farhan Ahmed",
      timestamp: "2026-10-20T03:40:00Z",
      href: `/employees/${ref}`,
    },
  ],
  health: {
    punches: { PENDING: 2, PROCESSED: 95, UNRESOLVED: 1 },
    devices: [],
    deviceScope:
      "Organization integration inventory; unaffected by workforce filters.",
    roster:
      "No authoritative roster or attendance-finalization cutoff configured",
    payroll: "Not implemented",
  },
  warnings: [],
};

async function run() {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const failures = [];
  const results = [];
  const page = await browser.newPage();
  let role = "SUPER_ADMIN";
  let scenario = "normal";
  const requests = [];
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(45000);
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("status of 503"))
      failures.push(msg.text());
  });
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname + url.search);
    const respond = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(
          status === 200
            ? { success: true, data }
            : {
                success: false,
                error: { message: "Dashboard service temporarily unavailable" },
              },
        ),
      });
    if (url.pathname.endsWith("/auth/me"))
      return respond({
        _id: "qa-user",
        email: "qa@example.test",
        role,
        employee: {
          _id: ref,
          fullName: "Test HR Administrator",
          employeeId: "EMP-000001",
        },
      });
    if (url.pathname.includes("/lifecycle/notifications")) return respond([]);
    if (url.pathname.endsWith("/dashboard/records"))
      return respond({
        rows: [person],
        total: 1,
        page: 1,
        pages: 1,
        context: fixture.meta,
      });
    if (
      url.pathname.endsWith("/dashboard/overview") ||
      url.pathname.endsWith("/dashboard/self")
    ) {
      if (scenario === "error") return respond(null, 503);
      const data = structuredClone(fixture);
      data.meta.date = url.searchParams.get("date") || fixture.meta.date;
      if (url.searchParams.get("department")) data.kpis.active = 32;
      if (scenario === "empty") {
        data.kpis = Object.fromEntries(
          Object.keys(data.kpis).map((k) => [k, 0]),
        );
        data.attention = [];
        data.approvals = { hod: 0, hr: 0, corrections: 0, items: [] };
        data.workforce.departments = [];
        data.workforce.employment = [];
        data.lifecycle.reviews = [];
        data.activities = [];
      }
      if (scenario === "partial") {
        data.health.punches = null;
        data.ch.earned = null;
        data.warnings = [
          "Attendance processing is unavailable. Refresh to retry.",
        ];
      }
      if (role === "EMPLOYEE") {
        data.meta.mode = "SELF";
        data.meta.scope = "My employee record";
        data.activities = [];
      }
      if (role === "MANAGER") {
        data.meta.mode = "TEAM";
        data.meta.scope = "My team / assigned HOD scope";
        data.activities = [];
        data.health.devices = null;
      }
      return respond(data);
    }
    failures.push(`Unexpected API request: ${url.pathname}`);
    return respond(null, 404);
  });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/dashboard`);
    await page.getByText("Requires attention", { exact: true }).waitFor();
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    if (overflow.document > width + 1)
      failures.push(
        `Horizontal page overflow at ${width}: ${overflow.document}`,
      );
    await page.screenshot({
      path: path.join(out, `dashboard-${width}.png`),
      fullPage: true,
    });
    await page.screenshot({ path: path.join(out, `dashboard-${width}-viewport.png`), fullPage: false });
    results.push({ width, ...overflow });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Department", { exact: true }).selectOption(ref);
  await page.waitForFunction(() => document.body.innerText.includes("32"));
  await page.waitForTimeout(300);
  await page.getByLabel("Business date", { exact: true }).fill("2026-10-20");
  await page.waitForTimeout(300);
  await page.getByLabel("Attendance trend period").selectOption("30");
  await page.waitForTimeout(300);
  if (
    !requests.some(
      (url) =>
        url.includes("department=" + ref) &&
        url.includes("date=2026-10-20") &&
        url.includes("period=30"),
    )
  )
    failures.push("Filter changes did not reach the dashboard API");
  await page.getByRole("link", { name: /Active employees/ }).click();
  await page
    .getByRole("heading", { name: "Active workforce", exact: true })
    .waitFor();
  if (
    !page.url().includes("department=" + ref) ||
    !page.url().includes("date=2026-10-20")
  )
    failures.push("KPI drill-down lost filter scope");
  await page.getByText("Ayesha Rahman", { exact: true }).waitFor();
  scenario = "error";
  await page.goto(`${base}/dashboard`);
  await page.getByText("Dashboard could not be loaded").waitFor();
  scenario = "normal";
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByText("Requires attention", { exact: true }).waitFor();
  scenario = "empty";
  await page.reload();
  await page.getByText("No active workforce.", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(out, "dashboard-empty.png"),
    fullPage: true,
  });
  scenario = "partial";
  await page.reload();
  await page
    .getByText("Attendance processing is unavailable. Refresh to retry.")
    .waitFor();
  scenario = "normal";
  role = "MANAGER";
  await page.reload();
  await page
    .getByText("My team / assigned HOD scope", { exact: true })
    .waitFor();
  role = "EMPLOYEE";
  await page.reload();
  await page
    .getByRole("heading", { name: "My workday", exact: true })
    .waitFor();
  if (await page.getByText("Requires attention", { exact: true }).count())
    failures.push("Employee sees HR action center");
  await fs.writeFile(
    path.join(out, "results.json"),
    JSON.stringify(
      {
        results,
        failures,
        scenarios: [
          "normal",
          "empty",
          "partial",
          "error/retry",
          "department/date/period",
          "KPI navigation",
          "HOD",
          "employee",
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(JSON.stringify({ results, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
