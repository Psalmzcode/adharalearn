# AdharaEdu Bootcamp

Full-stack bootcamp management platform. NestJS backend + Next.js 14 frontend.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Backend

```bash
cd backend
npm install

# Create database and configure .env
cp .env.example .env
# Edit DATABASE_URL in .env to point to your PostgreSQL instance

# Run migrations and seed
npx prisma migrate dev --name init
npx prisma db seed

# Start dev server (port 3002)
npm run start:dev
```

Swagger docs: http://localhost:3002/api/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev   # port 3000
```

---

## Demo Login Credentials

| Role        | Email                           | Password     |
|-------------|----------------------------------|--------------|
| Admin       | admin@adhara.edu.ng              | Admin123!    |
| Facilitator | tobi.adeyemi@adhara.edu.ng       | Tutor123!    |
| Learner     | aisha.okonkwo@gmail.com          | Learner123!  |
| Learner     | chidi.nwosu@gmail.com            | Learner123!  |
| Learner     | fatima.bello@gmail.com           | Learner123!  |

---

## Architecture

```
adharaedu-bootcamp/
├── backend/               NestJS API
│   ├── src/
│   │   ├── auth/          JWT auth, register, login, refresh
│   │   ├── tracks/        Track CRUD (Web Dev, Data Analytics, AI/ML)
│   │   ├── cohorts/       Cohort lifecycle management
│   │   ├── learners/      Learner profiles, at-risk detection
│   │   ├── facilitators/  Facilitator profiles and stats
│   │   ├── enrollments/   Approve / withdraw / track progress
│   │   ├── assignments/   CRUD + learner submissions
│   │   ├── sessions/      Live session scheduling + attendance
│   │   ├── grades/        Individual + bulk grading
│   │   ├── cbt/           Quiz creation, auto-scoring, results
│   │   ├── scholarships/  Apply → review → disburse flow
│   │   ├── announcements/ Cohort + platform-wide
│   │   ├── messages/      Learner ↔ Facilitator DMs
│   │   ├── notifications/ Role-scoped notification feed
│   │   ├── certificates/  Issue + revoke
│   │   ├── payments/      Paystack initiate + verify + webhook
│   │   ├── reports/       Weekly facilitator reports + analytics
│   │   └── curriculum/    Module + assignment listing for learners
│   └── prisma/            Schema + seed
│
└── frontend/              Next.js 14 (App Router)
    ├── src/
    │   ├── lib/api.ts     Typed API client (all 18 modules)
    │   ├── store/         Zustand auth store with JWT refresh
    │   ├── providers/     React Query client
    │   ├── components/
    │   │   ├── ui/        Modal, ConfirmDialog, StatusBadge, Avatar…
    │   │   ├── learner/   10 wired sections + curriculum + cohort
    │   │   ├── facilitator/ 8 wired sections + bulk grade entry
    │   │   └── admin/     8 wired sections
    │   └── app/
    │       ├── (public)/  Homepage, login, apply, courses
    │       └── (auth)/    Role-guarded dashboards + CBT exam page
```

## Key Features

- **JWT auth** with silent refresh (15m access / 7d refresh rotation)
- **Role-based access** (ADMIN / FACILITATOR / LEARNER) enforced at API level
- **At-risk detection**: flags learners below 75% attendance or 50% submission rate
- **Timed CBT exams**: auto-score MCQ, auto-submit on timeout, full result review
- **Real-time messaging**: learner ↔ facilitator DMs with 5s poll
- **Paystack payments**: full initiate → webhook verify flow
- **Scholarship pipeline**: apply → admin review → disburse
- **Weekly reports**: facilitator submits → feeds admin analytics dashboard
- **Platform analytics**: revenue, cohort breakdown, certificates, at-risk summary

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://user:password@localhost:5432/adharaedu_bootcamp
JWT_ACCESS_SECRET=change_this
JWT_REFRESH_SECRET=change_this
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_WEBHOOK_SECRET=...
PORT=3002
NODE_ENV=development
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```
