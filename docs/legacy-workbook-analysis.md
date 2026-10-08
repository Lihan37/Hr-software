# Legacy workbook analysis

Source inspected read-only: `9.BWPR Salary of September 2026.xlsx`. The source file was not modified or imported.

## Structure

- One worksheet: `Master Payroll`
- Used range: 73 rows × 8 columns
- 66 employee rows
- Columns: Department, serial number, legacy ID, date of joining, name, designation, job location, and bank account number
- The workbook contains no salary components despite its filename.

## Data quality observations

- One duplicate after ID normalization: `BWPR340`. This must be resolved before migration because HRMS employee IDs are unique.
- Seven identifier patterns occur (`BWPR###`, `BWPR ###`, `BWPM###`, and several `MC` variants). A future import needs an approved normalization/crosswalk rule rather than silently changing identifiers.
- 11 department groupings, 18 job-location values, and 48 distinct designation strings are present. Department and location must remain separate fields.
- Six bank accounts are blank. Most populated values contain 16 digits; one contains 17. Account numbers must be handled as strings, never numeric values.
- Trailing whitespace occurs in four names, three designations, and seven locations.
- Joining dates span 2015-04-26 through 2026-09-12.
- The heading states 31 days in September 2026, while the month has 30 days. This is source-data quality and is not a system policy.

## Proposed future mapping

| Workbook field | HRMS target | Migration note |
| --- | --- | --- |
| Department | `employees.employment.department` | Map through a reviewed Department crosswalk. |
| Sl. No | none | Row ordering only; do not use as identity. |
| ID | `employees.legacyEmployeeId` initially | Resolve duplicates and approve the canonical `employeeId` rule first. |
| DOJ | `employees.employment.joiningDate` | Convert Excel serial dates with validation. |
| Name | `employees.fullName` | Trim only after producing a review report. |
| Designation | `employees.employment.designation` | Map through a reviewed Designation crosswalk. |
| Job Location | `employees.employment.location` | Preserve independently from department. |
| A/C Number | future encrypted payroll/bank detail store | Sensitive and outside Phase 1. Never put in logs or general employee responses. |

No automatic import command is included in Phase 1. A later migration should stage rows, validate them, produce a human-readable exception report, require approval, then write idempotently.
