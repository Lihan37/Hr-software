# Assumptions and open policies

These defaults make the Phase 1 development build operable. They are not declarations of company policy.

1. Leave duration currently uses inclusive calendar days. Weekend, holiday, sandwich-leave, and cross-year rules need approved configuration before production use.
2. Leave balance is reserved on submission, released on rejection, and converted to usage on final HR approval.
3. Approval defaults to reporting manager then HR. Employees without a manager go directly to HR. The transition logic is isolated so a configurable workflow engine can replace it.
4. Browser clock-in/out is enabled for the demo. Whether self-service web punches are valid in production is unresolved.
5. Attendance calculations use zero grace and calculate overtime after scheduled minutes. Shift/grace/overtime rules require approval and persisted policy configuration.
6. A first and last biometric punch processor is included only as a development baseline. It is isolated behind the processing service and must not be treated as final policy for multiple/overnight punches.
7. Employee IDs are entered explicitly. The canonical format and sequence allocation policy are unresolved.
8. HR roles can see Phase 1 private HR fields; employees/managers receive a reduced projection. A field-by-field privacy matrix should be approved before production.
9. Profile uploads use Cloudinary when configured. Attachments have metadata support, while the leave attachment upload endpoint remains a Phase 1 follow-up.
10. Approved leave creates or changes attendance to `LEAVE` only when no check-in/out exists; punch-versus-leave conflicts remain visible for HR resolution.
