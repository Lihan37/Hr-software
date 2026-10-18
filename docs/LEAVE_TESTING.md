# Leave Testing

Automated tests cover official entitlements, no annual CH, whole-day enforcement, overlap, calendar-year splitting, decimal-safe ledger reconciliation, permanent confirmation, HOD→HR transitions, stage skipping, Return/Reject, stable CH keys, uniqueness indexes and HR-only cancellation permissions.

Before production migration, add database-backed concurrency tests for approval/cancellation, attendance correction-driven CH reversal, schedule filters, attachment authorization and export datasets. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` from the repository root.
