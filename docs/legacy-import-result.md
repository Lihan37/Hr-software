# Legacy employee import result

The workbook `9.BWPR Salary of September 2026.xlsx` was imported into MongoDB Atlas after an error-free dry run.

## Applied mapping

- 66 employee master records
- Canonical IDs: `EMP-000001` through `EMP-000066`, based on the workbook serial number
- Original workbook IDs retained in `legacyEmployeeId`
- 11 source department values mapped to controlled Department records
- 48 source designation values mapped to controlled Designation records
- 18 source location values retained as employee locations
- Joining dates and trimmed employee names imported
- Employee type stored as `UNSPECIFIED` because the workbook does not define it
- Employment status stored as `ACTIVE` because the source is the September 2026 current payroll list; HR must review this assumption

Bank account numbers were not imported. The workbook contains no salary components.

The duplicated normalized legacy ID `BWPR340` remains available for reconciliation, but it causes no employee identity collision because the canonical HRMS IDs are unique.

## Repeatable commands

```powershell
npm run import:legacy -w backend
npm run import:legacy:apply -w backend
```

The dry run performs no database writes. The apply command is idempotent: an existing canonical employee ID is skipped rather than overwritten.

## Execution result

- First apply: 66 created, 0 skipped
- Verification apply: 0 created, 66 skipped
- Validation errors: 0
- Canonical ID duplicates: 0
