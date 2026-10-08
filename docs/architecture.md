# Phase 1 architecture

The repository uses independent Next.js and Express applications. The browser uses the same `/api/v1` REST API that future mobile and desktop clients can reuse.

```text
Next.js web / future mobile / future desktop
                    |
              Express REST API
       +------------+-------------+
       |            |             |
  Auth/RBAC   HR domain modules   StorageService
       |            |             |
  Refresh tokens   MongoDB   Cloudinary provider
                                  (future S3 provider)
```

## Collections

- `users`: authentication, role, account status, optional employee link
- `refreshtokens`: hashed, rotatable, revocable web sessions
- `employees`: HR master identity and profile
- `departments`, `sections`, `designations`: controlled organization references
- `attendances`: unique processed daily employee/date record
- `attendancecorrections`: original/requested values and decision history
- `leavetypes`: configurable leave definitions
- `leaveledgerentries`: append-only entitlement, reservation, release, usage, and adjustment history
- `leaverequests`: requested dates and approval history
- `auditlogs`: sanitized actor/action/entity metadata
- `biometricdevices`, `employeebiometricmappings`, `biometricpunches`: device abstraction and immutable raw evidence

## Biometric pipeline

```text
Provider (simulator now, ZKTeco later)
  -> idempotent raw punch import
  -> employee/device-user resolution
  -> configurable attendance processor
  -> daily Attendance
  -> correction workflow (processed layer only)
```

Fingerprint images/templates are intentionally excluded. ZKTeco should perform matching; HRMS stores only device-user mappings and punch evidence.

## Security boundaries

- Access and refresh tokens are HTTP-only cookies for the web client; refresh tokens are random and stored only as SHA-256 hashes.
- Authorization is enforced in API middleware and ownership/team queries.
- Sensitive employee fields are excluded from non-HR responses.
- Device network configuration and Cloudinary/JWT/MongoDB secrets are backend-only environment values.
- Audit metadata is recursively filtered for password, token, secret, authorization, and cookie keys.
