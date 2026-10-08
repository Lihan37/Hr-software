# PeopleCore HRMS — Phase 1

A production-oriented HRMS foundation for employee identity, attendance, attendance corrections, leave, approvals, role-based access, audit logs, and future biometric integration. Payroll, recruitment, performance, training, final settlement, APKs, and physical-device integration are intentionally outside this phase.

## Stack and structure

- `frontend/`: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, React Hook Form, Zod, Lucide
- `backend/`: Node.js, Express 5, TypeScript, Mongoose, Zod
- MongoDB / MongoDB Atlas compatible
- Cloudinary behind a `StorageService` interface
- Root npm workspaces for shared commands
- `docs/`: architecture, assumptions, and read-only workbook mapping

## Requirements

- Node.js 20.9 or newer (Node 22 LTS recommended)
- npm 10 or newer
- MongoDB 7+ locally or a MongoDB Atlas connection
- A Cloudinary account only when testing uploads

## Local setup

```bash
npm install
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
npm run seed -w backend
npm run dev
```

Open `http://localhost:3000`. The API listens on `http://localhost:4000`; health is available at `/health`.

The development seed creates these accounts, all with password `DemoPass123!`:

- `admin@demo.hrms.local`
- `hr@demo.hrms.local`
- `manager@demo.hrms.local`
- `employee@demo.hrms.local`

The seed is development-only and refuses to run in production. Change demo credentials before any shared deployment.

## MongoDB Atlas

Create a database user with access only to the HRMS database, allow the application IP, copy the SRV connection string into backend `MONGODB_URI`, and keep it out of source control. Production should enable backups, alerts, TLS, and a least-privilege database user.

## Cloudinary

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `backend/.env`. Only file metadata is stored in MongoDB. To migrate to S3, implement `StorageService` in a new provider and change provider construction; employee and leave business logic do not need to change.

## Commands

```bash
npm run dev                # frontend and backend
npm run lint               # both applications
npm run typecheck          # both applications
npm test                   # backend business/security tests
npm run build              # backend then frontend production builds
npm run seed -w backend    # development/demo records
```

## API overview

All application endpoints are below `/api/v1`:

- `/auth`: login, rotating refresh, logout, current user
- `/users`: account and role administration
- `/employees`: scoped profile CRUD and photo upload
- `/organization/departments|sections|designations`: controlled organization records
- `/attendance`: scoped records, manual entry, browser clock actions
- `/attendance-corrections`: submission and manager/HR decisions
- `/leave/types|balances|requests`: configuration, ledger balances, application, approvals
- `/dashboard`: database-derived role-scoped statistics
- `/audit`: paginated audit log
- `/biometric`: devices, mappings, raw punches, development simulator

Responses use `{ success, data, meta? }`; errors use `{ success: false, error: { code, message, requestId } }`.

## Mobile and future clients

The Next.js application contains presentation and client API calls only. Authentication, authorization, validation, workflows, and persistence live in Express. A React Native, native mobile, or desktop client can reuse the REST API; non-browser clients can send the access token as a Bearer token and use an appropriate secure refresh-token store.

See [architecture](docs/architecture.md), [open policies](docs/assumptions-and-open-policies.md), and [legacy workbook analysis](docs/legacy-workbook-analysis.md).
