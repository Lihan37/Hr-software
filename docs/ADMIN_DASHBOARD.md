# HR operations dashboard

## Audit and implementation scope

The original `/dashboard` had five cards, a personal punch summary and a single summary API. It used the UTC day, counted only legacy `LEAVE`, combined approval stages and did not use weekly-holiday schedules. The starting branch was `main`, commit `ffd7273`, with a clean worktree.

| Source | Assessment | Dashboard treatment |
| --- | --- | --- |
| Employee Master, department, branch, business unit | Available | Reuse existing employees; no duplicate records or models |
| Lifecycle and legacy employee type | Available, legacy values need normalization for reporting | Prefer `employmentType`; map legacy `PROBATIONARY` to `PROBATION` for display only |
| Daily attendance | Available, no processing-complete marker | Separate complete/missing/unknown records; no inferred absence |
| Approved leave and HOD/HR stages | Available | Separate stage counts, final approved overlap by employee/date |
| WeeklyHolidaySchedule | Available | Employee/date records; no universal weekend |
| CH ledger and exception records | Available, qualification policy may be incomplete | Read earned/reversed/used separately; never create a credit on dashboard reads |
| Probation end dates and confirmation dates | Available when populated | Use stored dates, no invented reviews |
| AuditLog | Available | Scoped employee audit events only; exclude changes/context payloads |
| BiometricPunch/device inventory | Available, live hardware integration incomplete | Scoped processing counts; device status is configuration, never an online claim |
| Authoritative roster, final absence cutoff, minimum staffing | Missing | Explicitly unavailable; no shortage or finalized-absence estimate |
| Historical headcount snapshots, actual payroll | Future modules | No invented growth, historical workforce totals or salary statistics |
| Notification queue/background job status | Incomplete | Task indicator derives from real review queues; no fabricated delivery/queue health |
| Chart library | None | Accessible SVG trend and CSS charts, no new runtime dependency |

## Structure and reusable UI

The dashboard contains a welcome header, global filters and refresh, six executive KPIs, Requires Attention, separate approval stages, exclusive attendance distribution, workforce composition, 7/30-day attendance trend, leave month-to-date, department availability, probation reviews, assignment distribution, six-month joiner counts, CH summary, recent activity, recorded integration health and existing-module quick actions.

`features/dashboard/components.tsx` provides Panel, Empty, TextLink, KpiCard, AttendanceChart, Bars and TrendChart. It reuses existing branding, the authenticated shell, API client and icon set. SVG has textual alternatives and an expandable exact-data table. Filters collapse on narrow screens; tables scroll within their panels. The employee role receives a personal dashboard and no HR action center.

## APIs and navigation

All endpoints are authenticated, use existing API envelopes and return `Cache-Control: private, no-store`.

| Endpoint | Access / purpose |
| --- | --- |
| `GET /api/v1/dashboard/overview` | HR/Admin or scoped Manager/HOD overview |
| `GET /api/v1/dashboard/self` | Linked employee only, even when called by an administrator |
| `GET /api/v1/dashboard/records` | Same authorized scope, metric and optional record ID; 25-row pages |
| `GET /api/v1/dashboard` | Legacy response keys retained, using the same corrected calculation service |

Filters: `date` (validated civil date), `department` (ObjectId), `branch`, `businessUnit`, `employeeType` (`LOCAL`/`EXPAT`), `employmentStatus` and `period` (7/30). Unknown query fields are not interpolated into database filters. Metric and page are validated independently. The optional `record` ID is applied **after** scope filtering and cannot widen it.

KPIs and attention counts open `/dashboard/records` with the selected date and filters. Approval rows open a scoped request summary; the summary links into `/approvals` for the existing decision workflow. Other actions point to `/employees`, `/employees/new`, `/attendance`, `/leave`, `/employees/probation-evaluations`, or an accessible employee profile. No dashboard mutation controls or unsupported calendar/report routes are introduced.

## Scope and privacy

HR/Super Admin roles use their existing organization-wide read access. Manager scope is own employee plus employees whose reporting manager or reviewer/HOD equals the caller's employee ID. Employee scope is own employee only. Missing linkage is a 403. Scope is combined with filters using `$and`, and filter choices derive from employees inside the same authorization boundary. Team access never expands by selecting another department or record ID.

The overview projects a narrow set of employee fields. It excludes salary, bank accounts, NID/passport, health details, leave reasons/attachments, raw punches, IP addresses, credentials and raw audit payloads. Audit activity is HR-only. Organization device inventory requires the existing `biometric:manage` permission; it is clearly labelled as independent of workforce filters and is not shown to HOD/Employee users. Existing HR transaction permissions are unchanged.

Dashboard HOD scope includes assigned Reviewer/HOD employees, but the existing employee-profile module may permit only reporting-manager access. Profile links are omitted when that existing permission would deny access; dashboard implementation does not broaden profile permissions. Approval summaries continue to link to the authorized approval inbox.

## Dates and KPI formulas

Business timezone is read from existing HrPolicy, falling back to `Asia/Dhaka`. A timestamp at 18:30 UTC is already the next Dhaka business date. Attendance/schedule/leave date-only keys retain the application's UTC-midnight storage convention. Timestamp queries such as ledger posting and request submission use real business-midnight instants, not UTC-midnight cutoffs.

The selected date controls the attendance snapshot, month-to-date submission/usage windows, joiner counts, upcoming leave and probation review dates. Pending approval/exception queues show their **current** status. Headcount and organization assignments are current employee data, restricted by joining date where applicable: historical workforce snapshots do not exist and are explicitly described as unavailable. Date selection does not claim to reconstruct former department assignments or former approval states.

| Metric | Definition |
| --- | --- |
| Active workforce | Scoped employee status ACTIVE, joined by selected date |
| Present KPI | Exclusive PRESENT plus WORKED_WEEKLY_HOLIDAY |
| Approved leave KPI | Unique active employees with a final APPROVED range on the date or effective legacy/current leave attendance; punch conflicts remain separately flagged |
| Probation | Active PROBATION, including legacy PROBATIONARY reporting fallback |
| Confirmed | Active PERMANENT with actual confirmationDate on/before the selected date |
| Pending tasks | Pending HOD + pending HR + corrections + overdue probation + leave conflicts + CH resolution cases; tasks can overlap by employee |
| Joiners | Scoped employees with joiningDate between first of selected month and selected day |
| Leave usage | Net negative USAGE/LEAVE_DEDUCTION/LEAVE_REVERSAL ledger amounts posted month-to-date, grouped by leave type |
| CH earned / reversed | CH_CREDIT and negative CH_REVERSAL posting sums separately; CH consumption stays in leave usage |
| Upcoming approved leave | Final APPROVED requests starting in the next 30 days |
| Review upcoming / overdue | Active probation employees with stored probationEndDate, not completed review, respectively next 30 days / before selected date |

Exclusive attendance precedence: complete work on scheduled weekly holiday → worked holiday; complete work → present; incomplete punches → missing punch; approved leave → leave; scheduled weekly holiday → holiday; explicit public holiday → public holiday; explicit present → present; everything else → pending/unknown. The exclusive counts sum to active workforce. A legacy ABSENT record is labelled recorded-but-unfinalized and remains pending because there is no authoritative processing/cutoff field. The finalized-absence KPI displays unavailable, not an invented number. Late, approval/punch conflicts, and holiday-duty indicators may overlap and are labelled separately.

Attendance trends count observed daily records for the selected current employee scope, not historical staffing coverage. Department availability does not claim scheduled duty or staffing shortages. Joining trend uses actual joining dates for current scoped employee records; it does not fabricate historical active headcounts or exit trends.

## Query behavior and failure states

The service uses constant-count batched queries, narrow projections, indexed employee/date/status references and grouped ledger/punch aggregates. There are no per-employee queries. Data for attendance and schedules is bounded to 7/30 days; movement history uses projected current employee records. Recent audit is capped at eight; previews are capped at six; drill-down response pages are capped at 25.

The current organization has a small employee population. Classification necessarily examines the scoped employee projection and bounded daily records. Drill-down currently recomputes the same scoped summary before pagination: for much larger deployments, move classification to indexed aggregation pipelines and add request-coalescing after profiling. No shared cross-user cache is used because authorization scopes differ. Database indexes are reused; no migration was run.

Core source failure returns an error with Retry and no fabricated zeros. Optional CH, ledger, activity and integration failures return null/unavailable and a warning. Dashboard GET handlers never call a business mutation service, policy upsert, seed, allocation, approval or CH processor.

## Verification and review limits

Backend dashboard tests cover active/inactive counts, exclusive attendance reconciliation, weekly-holiday duty, unknown/absence behavior, leave stage separation, CH earned versus consumed, probation dates, legacy type reporting, filter scope, unlinked accounts, employee admin-denial, sensitive-field exclusion, read-only repeated calls, date validation/Dhaka rollover, empty scope, optional failures, pagination and core errors. These are unit/API tests with database model reads mocked; a real MongoDB performance/concurrency benchmark was not performed.

`node tools/dashboard-visual-qa.cjs` runs local headless Chrome with synthetic API fixtures. The isolated runner is installed under ignored `tools/.dashboard-qa`; screenshots/results are generated under ignored `artifacts/dashboard`. No production database is used. Covered widths: 1440, 1024, 768, 390 and 320 pixels; measured document width matches viewport at each. Checks also cover filter propagation, 30-day selector, KPI navigation preserving scope, paginated record page, error/retry, empty/partial states, HOD and employee variants, and page/console errors. Desktop and mobile screenshots were visually inspected.

## Remaining dependencies and recommendations

An authoritative roster and absence-finalization marker are required to report scheduled duty, reliable finalized absence and staffing coverage. Hardware heartbeat/sync jobs are needed before calling devices connected. Leave notifications exist as foundations but delivery-queue monitoring is unavailable. Recent activity currently shows scoped employee-record audit events rather than every HR transaction. Payroll, snapshot-based historical headcount/exit trends and additional leave-calendar UI remain owned by their modules. No new chart-library or backend package is required. No policy changes, production data writes, push or deployment were performed for this dashboard work.

## Validation results (21 October 2026)

- Backend and frontend lint: passed.
- Backend and frontend TypeScript checks: passed.
- Backend test suite: 51/51 passed, including 15 dashboard tests.
- Backend and frontend production builds: passed; `/dashboard` and `/dashboard/records` generated successfully.
- Final browser QA was run against the local **production build**: all five viewport widths matched document width, filter/navigation/retry/role scenarios passed, with no unexpected console or page errors.
- Visually reviewed desktop and mobile captures, including full-page layout and compact mobile filter layout. Generated previews: `artifacts/dashboard/dashboard-1440-viewport.png`, `dashboard-390-viewport.png`, and corresponding full-page images. Fixtures are synthetic, confined to browser test interception.
- `git diff --check`: passed. Temporary local servers were stopped after QA. Dashboard changes remain local and uncommitted.
