# Leave Approval Workflow

New requests require an assigned HOD from `Employee.employment.reviewer` and enter `PENDING_HOD`. Only the user linked to that employee can act as HOD. Approval moves to `PENDING_HR`; HR approval deducts once and reconciles attendance. Reject and Return require reasons and release reservations. Self-approval and stage skipping are rejected.

Legacy `PENDING_MANAGER` records remain readable and are treated as the HOD stage. Only roles with `leave:cancel` can cancel; cancellation records actor/reason/time and creates a single ledger reversal without deleting history.
