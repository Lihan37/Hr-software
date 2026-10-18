# Leave Management

The module reuses `Employee`, `User`, `Attendance`, biometric punches, RBAC and `AuditLog`. Employee Master remains the single employee source. New leave records are normalized collections; no history is embedded into Employee.

Implemented foundations: CL/SL/AL/CH types, year-scoped ledger, full-day applications, HOD (`employment.reviewer`) then HR approval, HR-only cancellation, weekly-holiday schedules, guarded CH processing, leave notifications, calendar API, responsive employee and approval UI, and versioned policy configuration.

`GET /leave/reports/requests` supports employee, department, business unit, branch, employee type, employment status, leave type, date and approval-status filters. `format=csv` returns a CSV export; JSON includes request/day/status totals.

Production data is not automatically backfilled. `npm run migration:leave:dry -w backend` reports the safe CL/SL/AL/CH configuration plan; `migration:leave:apply` is idempotent and changes only leave-type/policy configuration. It does not allocate balances or modify employee, request, attendance, or biometric history. Run apply only after approval.
