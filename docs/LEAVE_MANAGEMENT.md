# Leave Management

The module reuses `Employee`, `User`, `Attendance`, biometric punches, RBAC and `AuditLog`. Employee Master remains the single employee source. New leave records are normalized collections; no history is embedded into Employee.

Implemented foundations: CL/SL/AL/CH types, year-scoped ledger, full-day applications, HOD (`employment.reviewer`) then HR approval, HR-only cancellation, weekly-holiday schedules, guarded CH processing, leave notifications, calendar API, responsive employee and approval UI, and versioned policy configuration.

`GET /leave/reports/requests` supports employee, department, business unit, branch, employee type, employment status, leave type, date and approval-status filters. `format=csv` returns a CSV export; JSON includes request/day/status totals.

Production data is not automatically backfilled. `npm run migration:leave:dry -w backend` reports the safe CL/SL/AL/CH configuration plan; `migration:leave:apply` is idempotent and changes only leave-type/policy configuration. It does not allocate balances or modify employee, request, attendance, or biometric history. Run apply only after approval.

## Scoped balance viewer

Open **Leave Management** in the sidebar (`/leave-management`). Existing self-service applications and cancellations remain at `/leave`.

- SUPER_ADMIN, HR_ADMIN and HR can view all employees, including inactive records. An employee profile link is not required for HR access.
- MANAGER (Department Head) can view their own record and employees assigned through `employment.reviewer` (HOD) or `employment.reportingManager`. Shared department membership alone does not grant access.
- EMPLOYEE can view only their own linked employee record.
- Unlinked non-HR accounts receive 403. Frontend filtering is not the authorization boundary.

`GET /api/v1/leave/balances/overview` accepts `year`, `page`, `search` (literal name/employee ID), and optional employee database ID. Server-derived scope is ANDed with all filters. Results are paginated by employee (25 per page), include only balance-related employee fields, and summarize existing ledger entries by active leave type and selected year. Search and counts use the same scope. Out-of-range pages are clamped.

The existing single-employee `/leave/balances` endpoint now uses the same scope for consistency. Neither endpoint issues entitlements, runs accrual jobs, changes employee records, or writes ledger entries. No migration or new database collection is required.

Balances show entitled, accrued/earned, adjustments, used, pending reservations, and net ledger balance in days. The ledger balance is not a promise of eligibility: unconfirmed/ineligible employees are marked and application-time leave policy still governs requests (including CH exceptions).

Verification: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Scope, query validation, aggregation, no-write behavior, pagination and direct lookup denial are covered in `backend/tests/leave-balances.test.ts`. Local synthetic browser QA: start the frontend on port 3100 and run `node tools/leave-balances-qa.cjs` (uses the existing local Playwright installation under `tools/.dashboard-qa`). It checks responsive layouts, filters, pagination, empty/error/retry states, and role-specific headings; backend authorization is tested separately, not simulated as proof of security by browser fixtures.
