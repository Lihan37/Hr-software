# Full HRMS implementation plan

## Purpose and constraints

This plan extends the validated Phase 1 monorepo in place. Existing authentication, employee identity, attendance, correction, leave-ledger, biometric, storage, audit, and dashboard behavior must remain compatible while later modules are added. Visible actions must use persisted APIs or be explicitly disabled with a configuration reason. Company policy is represented as effective-dated configuration rather than hard-coded assumptions.

The repository directory is not currently a Git worktree, so branch and commit checks cannot be performed. File changes must therefore remain narrowly scoped and regression gates are mandatory.

## Existing application inventory

### Runtime and shared foundation

- Next.js 16 App Router frontend with TypeScript, Tailwind CSS, authenticated application layout, HTTP API client, loading/error handling, and responsive pages.
- Express 5 TypeScript API with Zod validation, Mongoose, Helmet, credentialed CORS, JSON size limits, request IDs, central errors, pagination, authentication rate limiting, and HTTP-only access/refresh cookies.
- MongoDB persistence; refresh tokens are hashed, rotated, revocable, and separately stored.
- Roles: `SUPER_ADMIN`, `HR_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`.
- Permission middleware and employee/team query scoping. The current permission set is module-level and needs granular expansion.
- Cloudinary behind `StorageService`; business modules do not call the Cloudinary SDK directly.
- Recursive audit sanitization removes password, token, secret, authorization, and cookie fields.

### Current frontend routes

| Route | Current capability |
| --- | --- |
| `/login` | Cookie-based sign in with validation and server errors |
| `/dashboard` | Database-derived scoped headcount, attendance, leave, and correction metrics |
| `/profile` | Logged-in employee profile |
| `/people/employees` | Scoped employee list/search and minimal HR employee creation |
| `/people/organization` | Department/designation list and create |
| `/attendance` | Monthly scoped attendance, browser punch, correction submission |
| `/leave` | Leave ledger summary, history, and request submission |
| `/approvals` | Manager/HR leave and correction decisions |
| `/administration` | Users/roles and audit log views |

Reusable UI currently includes `AppShell`, `PageHeader`, `StatusBadge`, API client, and auth provider. Missing shared primitives include enterprise table state, pagination controls, dialogs, drawers, toasts, searchable select, date range, uploader, skeleton, empty/error state, breadcrumb, command search, and permission-aware navigation.

### Current API endpoints

All endpoints are under `/api/v1` except `/health`.

- Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Users: `GET /users`, `POST /users`, `PATCH /users/:id`.
- Employees: `GET /employees`, `POST /employees`, `GET /employees/:id`, `PATCH /employees/:id`, `POST /employees/:id/photo`.
- Organization: `GET|POST /organization/departments`, `PATCH /organization/departments/:id`; equivalent routes for sections and designations.
- Attendance: `GET|POST /attendance`, `PATCH /attendance/:id`, `POST /attendance/clock`.
- Corrections: `GET|POST /attendance-corrections`, `POST /attendance-corrections/:id/decision`.
- Leave: `GET|POST /leave/types`, `PATCH /leave/types/:id`, `GET /leave/balances`, `POST /leave/balances/adjust`, `GET|POST /leave/requests`, `POST /leave/requests/:id/decision`.
- Dashboard: `GET /dashboard`.
- Audit: `GET /audit`.
- Biometric: `GET|POST /biometric/devices`, `POST /biometric/mappings`, `GET /biometric/punches`, `POST /biometric/simulator/import` (development only).

### Current collections and important invariants

- `users`: credentials, role, employee link, status, login timestamp.
- `refreshtokens`: hashed token, expiry, revocation, replacement chain.
- `employees`: unique employee ID, core personal/employment data, controlled organization references, manager, and profile photo.
- `departments`, `sections`, `designations`: unique code/name and active state.
- `attendances`: unique employee/date, schedule, punches, calculations, source, raw-punch links, original corrected values.
- `attendancecorrections`: request, original/requested values, status, decision history.
- `leavetypes`: configurable base leave definition.
- `leaveledgerentries`: append-only entitlement/reservation/release/usage/adjustment events.
- `leaverequests`: dates, partial day, attachment metadata, state, decision history.
- `auditlogs`: actor/action/entity/time, sanitized changes and request context.
- `biometricdevices`, `employeebiometricmappings`, `biometricpunches`: device abstraction, unique mappings, idempotent immutable raw evidence.

Existing indexes protect employee ID, organization code/name, employee/date attendance, leave request lookup, ledger history, mapping uniqueness, and punch idempotency.

### Existing workflows to preserve

- Attendance correction: employee submission -> reporting manager when present -> HR -> processed attendance update. Raw punches are never changed.
- Leave: employee submission and ledger reservation -> reporting manager when present -> HR -> ledger release plus usage and attendance projection. Rejection releases reservation.
- Biometric: provider punch -> idempotent raw import -> mapping resolution -> pending processing -> daily attendance; unresolved punches remain visible.
- Employee access: HR scope is organization-wide, managers receive self plus direct reports, employees receive self.

## Target architecture additions

Use bounded modules rather than enlarging `Employee`. Cross-module actions use IDs and services; critical ledger/finalization operations use MongoDB sessions when a replica set is available.

### Organization and time

- `companies`, `businessunits`, `branches`, `locations`, `grades`, `costcenters`.
- `shifts` with effective dates and policy references.
- `rosterassignments` and `rosterchangeevents`; do not embed unbounded calendars.
- `holidaycalendars`, `holidays`, `weekendpolicies`.
- `attendancepolicies` with effective dates, location/scope, thresholds, rounding, missing-punch rules, and versioning.

### Employee domain

- Expand core employee names and employment references only where frequently queried.
- `employeecontacts`, `employeefamilymembers`, `employeeemergencycontacts`, `employeeeducations`, `employeeexperiences`.
- `employeeidentities` for restricted NID/passport/visa/work-permit/tax metadata; encrypt configured fields at application level.
- `employeedocuments` with storage metadata, verification, expiry, permissions, and audit.
- `employeechangeRequests` for controlled self-service edits.
- Effective-dated `employeelifecycleevents` for confirmation, transfer, promotion, separation, and contract changes.

### Configurable approvals

- `approvalworkflows`: module, scope, effective dates, active version.
- `approvalsteps`: ordered actor strategy (manager, department head, role, named user).
- `approvalinstances`: subject type/ID, current step, status, immutable workflow-version snapshot.
- `approvalactions`: append-only submit/approve/reject/return/cancel/delegate events.
- Existing leave/correction status behavior remains while adapters migrate records to the engine.

### Payroll and benefits

- `salarycomponents` and `salarycomponentformulas`; formulas use a constrained expression grammar, never arbitrary code.
- `salarygrades`, `employeesalaryrevisions` with effective dates; revisions are immutable after supersession.
- `payrollperiods`, `payrollruns`, `payrollrunemployees`, `payrolllineitems`, `payrolladjustments`, `payslips`.
- Finalization is transactional, versioned, auditable, and immutable; corrections use reversal/re-run policy.
- `loantypes`, `loans`, `loanledgerentries`; outstanding balance is derived.
- `providentfundpolicies`, `providentfundledgerentries`; percentages are effective-dated configuration.
- Bank/tax data lives in restricted collections and never appears in generic employee/search responses.

### Talent and operations

- Recruitment: `jobrequisitions`, `vacancies`, `candidates`, `candidateapplications`, `interviews`, `interviewfeedback`, `offers`; hiring conversion is idempotent.
- Onboarding: `onboardingtemplates`, `onboardinginstances`, `onboardingtasks`.
- Performance: `performancescales`, `performancecycles`, `goals`, `reviews`.
- Training: `trainingprograms`, `trainingsessions`, `trainingparticipants`, `employeeskills`.
- Assets: `assets`, `assetassignments`, `assetrequests`, append-only condition/issue/return history.
- Notices: `notices`, `noticeaudiences`, read acknowledgements where required.
- Service: `servicerequests`, `servicerequestcomments`, status history.
- Optional benefits: cafeteria configuration/requests/consumption, restricted clinic visits, and uniform inventory/issues.
- `notifications` plus delivery attempts; in-app first, email/SMS adapters disabled until configured.
- `scheduledjobs`/execution logs with distributed locking and idempotency keys.

## API and frontend route plan

Each module exposes paginated/filterable list, get, validated create/update, explicit state-transition endpoints, permission checks, audit, and tests. Destructive transitions require reason and confirmation.

Frontend route families will follow the requested navigation hierarchy:

- Self service: `/me/profile`, `/me/attendance`, `/me/leave`, `/me/documents`, `/me/payslips`, `/me/requests`, `/me/assets`, `/me/training`, `/me/performance`.
- Manager: `/manager`, `/manager/team`, `/manager/attendance`, `/manager/leave`, `/manager/approvals`, `/manager/performance`.
- People: `/employees`, `/employees/new`, `/employees/[id]`, `/employees/[id]/edit`, `/organization`, `/employee-documents`, `/employee-assets`, `/employee-lifecycle`.
- Time: `/time/attendance`, `/time/corrections`, `/time/shifts`, `/time/rosters`, `/time/holidays`, `/time/biometric`.
- Leave: `/leave/requests`, `/leave/calendar`, `/leave/types`, `/leave/policies`, `/leave/balances`.
- Talent: `/recruitment`, `/candidates`, `/onboarding`, `/training`, `/performance`.
- Payroll: `/payroll`, `/payroll/salary-structures`, `/payroll/adjustments`, `/payroll/loans`, `/payroll/payslips`, `/payroll/reports`.
- Benefits/operations/system follow the same module boundaries. Routes appear only when the backend-returned permission set permits access.

## Granular RBAC migration

Introduce dot-style permissions while preserving role compatibility. Initial templates include:

- Employee: self profile/attendance/leave/documents/payslips/requests/assets/training/performance.
- Manager: employee/team read, team attendance/leave, manager approvals, assigned reviews.
- HR: employee and organization operations, attendance/leave HR review, documents, recruitment/onboarding/training/performance as assigned.
- Payroll admin: salary/payroll/loan/PF operations without unrelated HR or medical access.
- HR admin and super admin: template administration; super admin retains every permission.

Tokens should eventually carry a permission-version marker, while authoritative permission resolution remains server-side. During migration, current role permissions remain active so no account is locked out.

## Implementation order and acceptance gate per phase

1. Preserve Phase 1 and record this audit.
2. Enterprise shell, grouped permission-aware navigation, breadcrumb/search framework, responsive sidebar, shared feedback/table primitives.
3. Full Employee Master routes, related profile collections, wizard, detail tabs, field-level authorization, tests.
4. Organization expansion and hierarchy/tree.
5. Effective-dated shifts, rosters, holidays, weekends, and attendance policies.
6. Attendance operational views and biometric administration.
7. Leave policies, calendar, balances, accrual and attachment completion.
8. Approval engine and compatibility adapters.
9. Employee documents and assets.
10. Salary structure, payroll calculation/review/finalization, PDF payslips.
11. Loan and provident fund ledgers.
12. Recruitment and candidate-to-employee conversion.
13. Onboarding checklist engine.
14. Configurable performance cycles.
15. Training and skill matrix.
16. Self-service and manager workspaces.
17. Notices and service requests.
18. Optional cafeteria, restricted clinic, and uniform modules.
19. Reporting center and authorized CSV/Excel/PDF exports.
20. Notifications and idempotent scheduled jobs.
21. Security hardening, sensitive-field encryption, permission administration.
22. Playwright critical-flow suite.
23. Regression, deployment documentation, migration rehearsals, and policy sign-off.

Every phase is complete only when schema/indexes, backend service, validation, API, authorization, UI states, audit where applicable, tests, lint, typecheck, and production builds pass.

## Migration strategy

- Additive collections and optional fields first; backfill with idempotent scripts and dry-run reports.
- Never auto-import the legacy workbook. Implement staging batches, mapping, validation, preview, confirmation, and downloadable errors.
- Use effective-dated records instead of overwriting salary, policies, organization placement, or roster history.
- Migrate hard-coded leave/correction chains by creating default workflow definitions matching current behavior, then attach new requests while legacy records keep their decision arrays.
- Enable MongoDB transactions only after replica-set capability is verified. Services must fail closed when an atomic operation cannot safely complete.

## Risks and mitigations

- Policy ambiguity: persist inactive/configurable policy versions and label development defaults as `DEMO DEFAULT`.
- Sensitive data expansion: separate collections, backend projections, field permissions, audit redaction, optional encryption/key rotation.
- Manager hierarchy cycles: validate ancestry on assignment and cap traversal depth.
- Payroll correctness: deterministic decimal/minor-unit math, input snapshots, versioned formulas, review totals, transactional finalization, golden test fixtures.
- Attendance timezone/overnight shifts: organization timezone plus shift-local boundaries; never infer solely from UTC calendar day.
- Large datasets: indexed server pagination/filters and asynchronous export jobs.
- File threats: allow-listed MIME plus signature inspection, size limits, private delivery, malware adapter hook.
- Scheduler duplication: database locks, idempotency keys, retry state, and execution audit.
- Deployment drift: environment validation, health/readiness endpoints, migration version records, and no production auto-seed.

## Open policies requiring company confirmation

- Employee ID sequence and legacy crosswalk, including duplicate `BWPR340`.
- Organization timezone(s), weekend policy, holiday applicability, shift grace, half-day, missing punch, overtime eligibility/rounding/rates.
- Leave accrual, carry-forward, expiry, encashment, sandwich rules, negative balances, service thresholds, attachment requirements.
- Probation/confirmation, contract/retirement reminders, employment categories and lifecycle approvals.
- Salary components, formulas, attendance/leave effects, tax, payment schedule, rounding, approval/finalization/reversal rules.
- PF eligibility and employee/employer percentages; loan limits, interest, approval, and recovery order.
- Performance scales/cycles and access to reviewer comments.
- Document retention/verification, clinic retention, sensitive-field purpose/visibility, encryption-key custody.
- Browser punching validity, location/device restrictions, and production ZKTeco topology/SDK.
- Email/SMS providers, notification templates, reminder schedules, and data-export retention.

## Test strategy

- Unit: policy calculations, workflow transitions, permissions, formula parser, ledger summaries, time/rounding, redaction.
- Model: indexes, immutability, validation, effective-date overlap, hierarchy cycles.
- API integration: authentication, resource scope, validation, CRUD, decisions, audit, pagination/filtering, upload enforcement.
- Transaction tests: leave ledger conversion, payroll finalization, loan recovery, PF posting, recruitment conversion.
- Frontend component tests: tables, filters, forms, dialogs, permission navigation, error/loading/empty states.
- Playwright: login, employee creation, correction, leave manager/HR approvals, payroll through payslip, recruitment conversion.
- Security regression: IDOR, role escalation, restricted projections/search, upload spoofing, cookie/CORS, rate limiting, audit secret exclusion.

Current baseline is 16 backend tests across auth/RBAC, employee scope, attendance/corrections, leave ledger/workflow, and biometric idempotency. Missing coverage is explicitly addressed phase by phase above.
