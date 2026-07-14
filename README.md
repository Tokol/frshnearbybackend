# FRSH Nearby backend

Production-oriented authentication/profile API and operations dashboard for FRSH Nearby.

## Architecture

- `apps/api`: NestJS, GraphQL and Firebase Admin
- `apps/admin`: Next.js operations dashboard
- `packages/database`: Prisma schema and PostgreSQL migrations
- Firebase Authentication owns credentials and social sign-in.
- PostgreSQL owns FRSH profiles, roles, onboarding, verification and audit history.

This starts as a modular monolith. Catalog, search, orders and notifications can later be separated behind a GraphQL gateway without redesigning identity.

## Requirements

- Node.js 20+
- PostgreSQL 16+
- A Firebase service account for `freshnearby-17349`

Never commit the service-account JSON. Copy only its project ID, client email and private key into environment variables.

## Local setup

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate
npm run dev:api
```

In a second terminal:

```bash
npm run dev:admin
```

- GraphQL: `http://localhost:4000/graphql`
- Health check: `http://localhost:4000/health`
- Admin: `http://localhost:3000`

### Firebase service account

Firebase Console → Project settings → Service accounts → Generate new private key. Put these values in `.env`:

```dotenv
FIREBASE_PROJECT_ID=freshnearby-17349
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

For the dashboard, copy the public Web App configuration into the `NEXT_PUBLIC_FIREBASE_*` variables. Firebase web configuration is public by design; the Admin private key is not.

## Bootstrap the first administrator

1. Sign into FRSH once with the intended admin email so the API creates the database user.
2. Run:

```bash
npm run admin:grant -- admin@example.com
```

The dashboard API still verifies Firebase tokens and checks the database role on every request.

## Client authentication contract

Flutter signs in through Firebase and sends its ID token:

```http
Authorization: Bearer <firebase-id-token>
```

Start each app session with:

```graphql
query Session {
  session {
    accessGranted
    user { id roles status onboardingStep verificationStatus }
  }
}
```

The returned `onboardingStep` is the source of truth for resuming incomplete onboarding.

## Core workflow

- Consumers complete their profile and become active without manual verification.
- Side hustlers and businesses submit their relevant profiles.
- The API creates a verification submission and exposes it to administrators.
- An administrator can approve, reject or request changes.
- Every review is recorded in `AdminAuditLog`.
- Seller functionality must require `verificationStatus = VERIFIED` in future catalog/order resolvers.

## Account deletion

- `requestAccountDeletion` marks an account for a seven-day deletion window and revokes Firebase refresh tokens.
- `deleteMyAccount(confirmation: "DELETE")` permanently deletes the Firebase Auth identity and cascades application profile data.
- Transaction/order retention and anonymisation rules should be added before commerce launches.

## Render deployment

The included `render.yaml` creates:

- `frshnearby-db`
- `frshnearby-api`
- `frshnearby-admin`

In Render:

1. Create a Blueprint from this repository.
2. Supply every environment variable marked `sync: false`.
3. Set `CORS_ORIGINS` to the exact Flutter web and admin origins.
4. Deploy the API and confirm `/health` returns `{"status":"ok"...}`.
5. Set `NEXT_PUBLIC_API_URL` to the deployed API `/graphql` URL and deploy the dashboard.
6. Add both deployed domains to Firebase Authentication → Authorized domains.

Do not reuse the Antphet web service or database. It is fine to use the same Render account, but FRSH should remain independently deployable.

## Verification commands

```bash
npm test
npm run build
npm audit --omit=dev
```

## Before production commerce

- Add private object storage with signed upload/view URLs for identity and registration documents.
- Add rate limiting backed by Redis.
- Add GraphQL query depth/cost controls.
- Add email notifications for verification decisions.
- Add scheduled cleanup for deletion requests.
- Define GDPR retention rules for financial records and audit logs.
- Add integration tests against a temporary PostgreSQL database and Firebase Auth emulator.
