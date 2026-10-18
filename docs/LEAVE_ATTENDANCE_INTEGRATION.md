# Leave and Attendance Integration

Final HR approval creates/updates daily attendance as `APPROVED_LEAVE` and links the leave request. Raw biometric punches are never changed. HR cancellation removes only system leave effects without deleting raw attendance. Compatibility statuses include legacy `LEAVE/WEEKLY_OFF` plus `APPROVED_LEAVE`, `WEEKLY_HOLIDAY`, `WORKED_WEEKLY_HOLIDAY` and `ATTENDANCE_CORRECTION`.

Biometric punches are evidence only. CH requires an explicit configured qualification policy and employee weekly-holiday schedule.
