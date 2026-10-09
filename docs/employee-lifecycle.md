# Employee lifecycle operations

## Employment type migration

`employment.employmentType` is intentionally not inferred from the legacy `employeeType` field. Run:

```powershell
npm run migration:employment-type:report -w backend
```

The command is read-only and lists every employee requiring HR review. HR can then assign `PROBATION`, `PERMANENT`, `CONTRACTUAL`, or `TRAINEE` through controlled employee updates. Existing status, attendance, leave, biometric references, and MongoDB `_id` values remain unchanged.

## Demo policy and trainee type

The development seed creates an active `ADMIN_TRAINEE` trainee type and a policy marked by key `DEFAULT`: four probation months, seven reminder days for probation and trainee completion, thirty contract reminder days, and `Asia/Dhaka`. These are development defaults, not company-policy declarations. Super Admin or HR Admin should review them through the lifecycle policy API before production use.

## Identifier rules

Trainee identifiers use an atomic `sequences` document keyed by year. `findOneAndUpdate` with `$inc`, `upsert`, and `new` protects concurrent allocation. A trainee receives a compatibility operational `employeeId` of `TRN-<traineeId>` because existing attendance, leave, biometric, and employee screens expect an employee code. Conversion replaces that operational code with the HR-supplied normal employee ID while preserving `traineeId` and `originalTraineeId`.

## Reminder scheduler

The API process runs `runEmployeeLifecycleReminderJobs()` at startup and every `SCHEDULER_INTERVAL_HOURS` when `ENABLE_SCHEDULER=true`. The notification unique index makes repeat executions idempotent. It covers probation evaluation, contract expiry, and trainee completion.

Development manual execution (authenticated HR request):

```text
POST /api/v1/lifecycle/reminders/run
```

For production, run only one dedicated scheduler worker where practical, or keep multiple workers because notification writes are idempotent. An external Railway cron can call a protected job runner in a future worker deployment; do not expose an unauthenticated cron endpoint.

Dates are stored in UTC. Reminder day boundaries currently use UTC while the configured IANA timezone is retained in policy; organization-local boundary processing should be completed before supporting multiple timezones.

## Workflow safety

- Manager evaluation is limited to a direct report.
- HR review/finalization is enforced by backend permissions.
- `CONFIRM_PERMANENT` updates employment type and confirmation date.
- `EXTEND_PROBATION` preserves the previous date in a lifecycle event, increments the cycle, and creates a new reminder identity.
- `TERMINATE` records a recommendation only; it does not delete, disable, or separate the employee.
- Trainee conversion preserves the original trainee ID and creates an auditable lifecycle event.
