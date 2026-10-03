# Insurance / Healthcare Platform

A multi-application Node.js + Supabase platform with three independently deployable sub-applications sharing one Supabase project.

## Architecture Overview

```
platform/
├── patient-app/              # Module A — Patient Portal (Port 3001 + 4001)
│   ├── frontend/             # Next.js 14 App Router
│   └── backend/              # Fastify REST API
├── provider-admin-app/       # Module B — Provider / Admin App (Port 3002 + 4002)
│   ├── frontend/
│   └── backend/
├── verification-onboarding-app/  # Module C — Admin & Insurer Portal (Port 3003 + 4003)
│   ├── frontend/
│   └── backend/
├── supabase/
│   ├── migrations/           # Versioned SQL, timestamp-prefixed
│   ├── seed.sql
│   └── config.toml
└── shared/
    ├── types/                # Shared TypeScript interfaces
    └── review-queue/         # Reusable submit→review→decide pattern
```

## Sub-Applications

| App | Frontend | Backend | Role |
|-----|----------|---------|------|
| Patient Portal | `localhost:3001` | `localhost:4001` | Patient registration, appointments, claims, documents |
| Provider/Admin | `localhost:3002` | `localhost:4002` | Hospital queue, case management, family request review |
| Verification/Onboarding | `localhost:3003` | `localhost:4003` | Branch onboarding, claims review, insurer dashboard |

## Quick Start

### Prerequisites
- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (or local `supabase start`)

### 1. Initialize Supabase

```bash
cd platform/supabase
supabase init
supabase link --project-ref YOUR_PROJECT_REF
supabase db push           # Apply all migrations
supabase db seed           # Optional: seed test data
```

### 2. Configure Environment Variables

Each backend has a `.env.example`. Copy and fill in your values:

```bash
# Patient App
cp platform/patient-app/backend/.env.example platform/patient-app/backend/.env
cp platform/patient-app/frontend/.env.local.example platform/patient-app/frontend/.env.local

# Provider/Admin App
cp platform/provider-admin-app/backend/.env.example platform/provider-admin-app/backend/.env
cp platform/provider-admin-app/frontend/.env.local.example platform/provider-admin-app/frontend/.env.local

# Verification/Onboarding App
cp platform/verification-onboarding-app/backend/.env.example platform/verification-onboarding-app/backend/.env
cp platform/verification-onboarding-app/frontend/.env.local.example platform/verification-onboarding-app/frontend/.env.local
```

All three backends use the **same** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.  
Each frontend uses the **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — never the service role key.

### 3. Install and Run

```bash
# Patient App
cd platform/patient-app/backend && npm install && npm run dev &
cd platform/patient-app/frontend && npm install && npm run dev &

# Provider/Admin App
cd platform/provider-admin-app/backend && npm install && npm run dev &
cd platform/provider-admin-app/frontend && npm install && npm run dev &

# Verification/Onboarding App
cd platform/verification-onboarding-app/backend && npm install && npm run dev &
cd platform/verification-onboarding-app/frontend && npm install && npm run dev &
```

## Security Model

### Defense-in-Depth (Two Layers)

Every protected operation enforces rules at **two independent layers**:

1. **Node.js Backend** — role check middleware, business logic validation
2. **Supabase RLS** — PostgreSQL row-level security policies

Neither layer alone is sufficient. Both must independently enforce the same rules.

### Key Principles

- `SUPABASE_SERVICE_ROLE_KEY` — server-side only, **never** in frontend code
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-side, protected by RLS
- All secrets from `.env` files — never hardcoded, never logged
- Every table has RLS **enabled** with **explicit** policies (default-deny)

### Roles

| Role | Description |
|------|-------------|
| `patient` | Primary account holder |
| `family_member` | Linked to a primary patient |
| `provider` | Hospital staff, scoped to their branch |
| `admin` | Platform administrator |
| `insurer` | Insurance staff reviewing claims |

## Authentication Flow

1. User submits email (must be @gmail.com)
2. Supabase Auth sends OTP via SMTP
3. User verifies OTP → JWT issued
4. JWT carries `auth.uid()`, used to resolve `profiles` table for role + branch
5. Optional ID verification step (marks `id_verified = true`)

## Supabase Storage Buckets

| Bucket | Access | Contents |
|--------|--------|----------|
| `lab-reports` | Owner + assigned provider | Lab test results |
| `invoices` | Owner + insurer | Billing documents |
| `licenses` | Public read / Admin write | Hospital license files |
| `case-documents` | Owner + assigned provider | Case-related documents |

## API Structure

All backends expose REST APIs under `/api/v1/`:

### Patient App (`:4001`)
- `POST /api/v1/appointments` — book appointment
- `GET /api/v1/appointments` — list appointments
- `PATCH /api/v1/appointments/:id/status` — update status
- `POST /api/v1/documents` — upload document
- `POST /api/v1/claims` — create claim draft
- `PATCH /api/v1/claims/:id/submit` — submit claim
- `GET /api/v1/notifications` — list notifications
- `GET /api/v1/profile` — get own profile
- `POST /api/v1/profile/family-members` — request family member

### Provider/Admin App (`:4002`)
- `GET /api/v1/queue` — incoming request queue
- `PATCH /api/v1/appointments/:id/status` — approve/reject appointment
- `POST /api/v1/appointments/:id/case` — open case from appointment
- `PUT /api/v1/cases/:id` — update case
- `POST /api/v1/cases/:id/treatment-items` — add treatment item
- `GET /api/v1/patients/:id` — patient medical record (scoped)
- `PATCH /api/v1/family-requests/:id/decision` — review family request

### Verification/Onboarding App (`:4003`)
- `GET /api/v1/branch-applications` — list applications
- `PATCH /api/v1/branch-applications/:id/decision` — approve/reject branch
- `PATCH /api/v1/claims/:id/decision` — approve/reject claim
- `PATCH /api/v1/claims/:id/mark-paid` — mark claim paid
- `GET /api/v1/dashboard/stats` — aggregate dashboard stats

## Realtime Subscriptions

| Event | Channel | Subscriber |
|-------|---------|-----------|
| Appointment status change | `appointments` table | Patient, Provider |
| New notification | `notifications` table | All users |
| Queue update | `appointments` table | Provider (filtered by hospital_id) |
| Claim status change | `claims` table | Patient |

## Deployment (Render)

Each of the 6 services (3 backends + 3 frontends) deploys as its own Render web service:

```
Environment Variables per backend:
  SUPABASE_URL           → Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY → From Supabase dashboard (rotate together)
  JWT_SECRET             → Your secret

Environment Variables per frontend:
  NEXT_PUBLIC_SUPABASE_URL      → Same project URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY → Anon key (safe for client)
  NEXT_PUBLIC_API_URL           → Deployed backend URL for this app
```

> **Note:** When rotating `SUPABASE_SERVICE_ROLE_KEY`, update all three backend `.env` configs simultaneously.

## Database Migrations

All schema changes go through versioned SQL files:

```
supabase/migrations/
  20240001000000_extensions.sql
  20240001000001_profiles_and_auth.sql
  20240001000002_patients_and_family.sql
  20240001000003_insurance_policies.sql
  20240001000004_hospitals_and_users.sql
  20240001000005_appointments_and_cases.sql
  20240001000006_documents.sql
  20240001000007_claims.sql
  20240001000008_notifications_and_audit.sql
```

**Never edit the database schema directly through the Supabase dashboard in a shared environment.**

```bash
# Apply migrations
supabase db push

# Create new migration
supabase migration new <descriptive_name>
```
