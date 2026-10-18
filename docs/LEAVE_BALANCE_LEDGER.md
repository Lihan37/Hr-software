# Leave Balance Ledger

Balances are derived from immutable-style `LeaveLedgerEntry` transactions. Supported operations include opening balance, annual entitlement, accrual, adjustment, reservation/release, deduction/reversal, CH credit/reversal, carry-forward and expiry. Amount calculations are converted to hundredths before summation.

Every new workflow entry has a stable unique `operationId`. Final approval and cancellation use request/year operation IDs, making retries idempotent. Cross-year requests store a year/day breakdown. MongoDB unique indexes are required; a replica set is recommended for future multi-document transaction expansion.
