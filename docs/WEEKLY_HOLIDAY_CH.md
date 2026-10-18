# Weekly Holiday and CH

`WeeklyHolidaySchedule` stores employee/date separately from punches and has a unique employee/date index. The cycle basis remains unconfigured until HR confirms scheduled duty days versus actual worked days.

CH evaluation requires a matching schedule and processed attendance. Automatic credit stays disabled until minimum worked minutes and authorization policy are configured. The stable key `CH:<employee>:<date>` prevents duplicate credits after repeated ZKTeco imports. Credits link schedule, attendance and ledger. Reversal status supports later correction processing; used-credit conflicts must be escalated to HR rather than silently changing balances.
