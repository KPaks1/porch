# Porch — Requirements

Porch is an invite-only lending library. Members vouch for new members via invite codes, list things they're happy to lend, and borrow from each other. Trust is built through completed loans and guest book entries.

**Stack:** NestJS · React (Vite, TypeScript) · PostgreSQL · Prisma · AWS (Terraform) · Vercel

## How to use this document

- Work through the milestones in order. Each one should end with working, deployed software (from M5 onwards).
- Each requirement has an ID (e.g. `AUTH-03`). Reference IDs in commit messages and PR titles: `feat(auth): invite-only registration [AUTH-03]`.
- Tick acceptance criteria as you go. A requirement is done when **all** its criteria pass **and** it has tests where marked 🧪.
- When you make a non-obvious choice, write an ADR in `docs/adr/` and link it next to the requirement.
- Routes in this document are written without a version prefix for readability. Unless marked **version-neutral**, every route is served under `/v1` (e.g. `POST /auth/login` means `POST /v1/auth/login`). See SETUP-04 and M10.

---

## Non-functional requirements (apply throughout)

| ID | Requirement |
|---|---|
| NFR-01 | TypeScript `strict` mode in both apps. No `any` without a comment explaining why. |
| NFR-02 | All request bodies and query params are validated (DTOs + `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`). |
| NFR-03 | API errors use one consistent shape: `{ statusCode, error, message }`. No stack traces in production responses. |
| NFR-04 | Password hashes, invite codes belonging to other users, and emails of other members are never returned by the API. |
| NFR-05 | Secrets come from environment variables only. A `.env.example` lists every variable. Nothing secret is committed. |
| NFR-06 | Every list endpoint is paginated (cursor-based, default page size 20, max 50). |
| NFR-07 | The web app is usable on a 375px-wide screen. |
| NFR-08 | All dates are stored in UTC. Loan dates are calendar dates (no time component). |
| NFR-09 | CI runs lint, type-check, and tests on every PR. Main is always deployable. |
| NFR-10 | The README explains how to run the project locally in under 5 commands. |
| NFR-11 | **No breaking changes within an API version.** Adding endpoints, optional request fields, or response fields is fine. Removing or renaming fields, changing types or meaning, adding required request fields, or tightening validation requires a new version. |

---

## M0 — Setup

### SETUP-01: Local development environment
- [ ] `docker compose up` starts PostgreSQL
- [ ] `api/` is a NestJS app; `web/` is a Vite React TS app
- [ ] ESLint + Prettier configured in both; a single command formats the repo
- [ ] `GET /health` returns `200 { status: "ok" }` and checks the database connection
- [ ] The web app's home page calls `/health` and displays the result

### SETUP-02: Configuration
- [ ] `@nestjs/config` loads and **validates** env vars at startup — the app refuses to start if one is missing
- [ ] `.env.example` exists for both apps

### SETUP-03: Decision records
- [ ] `docs/adr/000-stack-choices.md` — why this stack, why Prisma
- [ ] ADR template in `docs/adr/template.md`

### SETUP-04: API versioning foundation
> As a client team, I want to pin to an API version so that API changes don't break my released app.
- [ ] NestJS versioning is enabled with **URI** versioning; the default version is `1`
- [ ] All routes are served under `/v1/...`; requests without a version prefix return `404`
- [ ] `GET /health` is **version-neutral** (served at `/health`)
- [ ] Versions are only applied at the controller/DTO layer — services and the database are shared across versions
- [ ] The web app reads its API base URL including the version (e.g. `VITE_API_URL=https://api…/v1`)
- [ ] 📄 ADR: why URI versioning (vs header or media-type), and the deprecation policy from M10

---

## M1 — Users & invites data layer

### DATA-01: Schema
- [ ] `User`: id (uuid), email (unique, stored lowercase), passwordHash, displayName, bio?, city?, avatarKey?, invitedById?, createdAt, updatedAt
- [ ] `Invite`: id, code (unique), createdById, usedById?, expiresAt, usedAt?, createdAt
- [ ] Migrations are committed and run from a single command

### DATA-02: Seed data
- [ ] A seed script creates a "founder" user (no inviter) and 3 unused invite codes
- [ ] Running the seed twice does not create duplicates

---

## M2 — Invite-only authentication

### AUTH-01: Register with an invite code 🧪
> As a person with an invite link, I want to create an account so that I can join Porch.
- [ ] `POST /auth/register` with `{ email, password, displayName, inviteCode }`
- [ ] Password minimum 12 characters; displayName 2–50 characters
- [ ] Fails with `400` if the code doesn't exist, is used, or is expired — **same error message for all three** (don't leak which)
- [ ] Fails with `409` if the email is already registered
- [ ] On success: user is created with `invitedById` set, the invite is marked used — **in one transaction**
- [ ] Password is hashed with argon2 (or bcrypt — record the choice in an ADR)
- [ ] 🧪 Two simultaneous registrations with the same code: exactly one succeeds

### AUTH-02: Log in 🧪
- [ ] `POST /auth/login` with `{ email, password }`; email is case-insensitive
- [ ] Wrong email and wrong password return the **same** `401` message
- [ ] On success: sets an httpOnly, `SameSite=Lax` cookie (`Secure` in production) **and** returns the access token in the body (for future mobile clients)
- [ ] Login is rate-limited (e.g. 5 attempts/minute per IP) — `429` when exceeded

### AUTH-03: Authenticated requests
- [ ] A guard accepts the JWT from **either** the cookie **or** an `Authorization: Bearer` header
- [ ] Missing, invalid, or expired token → `401`
- [ ] A `@CurrentUser()` decorator provides the authenticated user to handlers
- [ ] 📄 ADR: why cookie + bearer

### AUTH-04: Log out
- [ ] `POST /auth/logout` clears the cookie and returns `204`

---

## M3 — Profiles & invites API

### PROF-01: View my profile
- [ ] `GET /users/me` returns: id, email, displayName, bio, city, avatarUrl, createdAt
- [ ] Includes `invitedBy: { id, displayName }` (null for the founder)
- [ ] Includes `invitees: [{ id, displayName }]`

### PROF-02: Edit my profile 🧪
- [ ] `PATCH /users/me` accepts displayName, bio (≤ 280 chars), city (≤ 60 chars)
- [ ] Unknown fields (e.g. `email`, `passwordHash`) are rejected
- [ ] Returns the updated profile

### PROF-03: View another member's profile
- [ ] `GET /users/:id` returns a public subset: displayName, bio, city, avatarUrl, invitedBy, member since
- [ ] Never includes email
- [ ] Unknown id → `404`

### INV-01: Create invites 🧪
> As a member, I want to invite people I trust.
- [ ] `POST /invites` creates a code that expires in 14 days
- [ ] A member may hold at most **3 unused, unexpired** invites at once → `422` beyond that
- [ ] Codes are random, URL-safe, and not guessable (≥ 8 chars from a crypto-secure source)

### INV-02: List my invites
- [ ] `GET /invites` returns my invites with status: `available | used | expired`, and who used it

---

## M4 — Web app shell

### WEB-01: Routing & auth state
- [ ] Routes: `/join`, `/login`, `/profile`, `/members/:id`
- [ ] On load the app calls `/users/me` to determine whether the user is logged in
- [ ] Protected routes redirect to `/login`, then return to the original page after login
- [ ] Refreshing the page keeps the user logged in

### WEB-02: Join via invite link
- [ ] `/join?code=ABC123` pre-fills the invite code
- [ ] Form validation (zod) matches the API's rules; API errors are shown inline
- [ ] On success the user is logged in and lands on `/profile`

### WEB-03: Login & logout
- [ ] Login form with inline errors
- [ ] Logout button available on every authenticated page

### WEB-04: Profile page
- [ ] Shows profile details and "Vouched for by …" (linking to their profile)
- [ ] Shows members I've invited
- [ ] Edit form for displayName, bio, city with loading/success/error states
- [ ] Invites section: create an invite, **copy invite link** to clipboard, see status of each

### WEB-05: Member page
- [ ] `/members/:id` shows the public profile

---

## M5 — Ship it

### OPS-01: Infrastructure as code
- [ ] Terraform provisions: database, API hosting, S3 bucket, and required IAM
- [ ] Terraform state is stored remotely (S3 backend)
- [ ] 📄 ADR: hosting choices and estimated monthly cost

### OPS-02: Deployments
- [ ] Web app is deployed to Vercel; API to AWS
- [ ] Database migrations run as part of deploy
- [ ] Production uses HTTPS everywhere, with CORS restricted to the web app's origin

### OPS-03: CI/CD
- [ ] GitHub Actions: lint, type-check, test on every PR
- [ ] `terraform plan` output is visible on PRs that change infrastructure
- [ ] Merging to main deploys automatically

### OPS-04: Go live
- [ ] At least 3 real people have joined via invite links
- [ ] First dev log post published

---

## M6 — Items

### ITEM-01: List an item 🧪
> As a member, I want to list something I'm happy to lend.
- [ ] `POST /items` with title (3–80), description (≤ 1000), category, condition
- [ ] Category is one of: `tools, outdoors, kitchen, electronics, games, books, sports, party, other`
- [ ] Condition is one of: `new, good, worn`
- [ ] New items have status `available`

### ITEM-02: Item photos
- [ ] `POST /items/:id/photos/upload-url` returns a **presigned S3 URL**; the browser uploads directly to S3
- [ ] Max 5 photos per item; jpeg/png/webp only; ≤ 5 MB each
- [ ] Only the owner can add or remove photos
- [ ] The same mechanism is reused for profile avatars

### ITEM-03: Edit, pause, archive 🧪
- [ ] Owner can edit details and set status to `available | paused | archived`
- [ ] An item with an `approved` or `active` loan **cannot be archived** → `409`
- [ ] Non-owners get `403`

### ITEM-04: Browse items
- [ ] `GET /items?category=&cursor=` lists `available` items from other members, newest first
- [ ] `GET /items/:id` shows the item, its photos, and its owner's public profile summary
- [ ] Archived items are not visible to anyone but the owner

### WEB-06: Item pages
- [ ] Browse page with category filter and "load more"
- [ ] Item detail page with a photo gallery
- [ ] "My items" page with create/edit and photo upload (with upload progress)
- [ ] Member profile pages list that member's available items

---

## M7 — Loans

Loan states:

```
requested ──approve──▶ approved ──handover──▶ active ──return──▶ returned
    │                     │
    ├──decline──▶ declined │
    └──cancel───▶ cancelled ◀──cancel──┘
```

### LOAN-01: Request to borrow 🧪
> As a member, I want to request an item for specific dates.
- [ ] `POST /items/:id/loans` with startDate, endDate, message (≤ 500)
- [ ] startDate is today or later; endDate ≥ startDate; max 30 days
- [ ] Can't request your own item → `422`
- [ ] Can't request a `paused` or `archived` item → `422`
- [ ] Can't request dates that overlap an `approved` or `active` loan → `409`

### LOAN-02: Approve or decline 🧪
- [ ] Only the item owner can approve or decline, and only from `requested`
- [ ] When a loan is approved, all other `requested` loans for the same item with overlapping dates are automatically declined
- [ ] **Double-booking is impossible at the database level**: a Postgres exclusion constraint prevents two `approved`/`active` loans for the same item with overlapping dates
- [ ] 🧪 Two overlapping loans approved at the same time: exactly one succeeds
- [ ] 📄 ADR: why a database constraint rather than only an application check

### LOAN-03: Cancel 🧪
- [ ] Only the borrower can cancel, and only from `requested` or `approved`

### LOAN-04: Handover & return 🧪
- [ ] Owner marks `approved → active` (handover) and `active → returned` (return)
- [ ] Every invalid transition returns `409` with a clear message (e.g. "Cannot return a loan that is not active")
- [ ] 🧪 Every valid and invalid transition is covered by a test, including who is allowed to perform it

### LOAN-05: Overdue
- [ ] A loan is **overdue** when `active` and endDate < today (derived, not stored)
- [ ] Overdue loans are flagged in API responses and the UI

### LOAN-06: My loans
- [ ] `GET /loans?role=lender|borrower&status=` lists my loans with item and other party
- [ ] Each loan includes the actions the current user is allowed to take next (e.g. `["approve", "decline"]`) so the UI doesn't duplicate the rules

### WEB-07: Loan UI
- [ ] Request form on the item page with date pickers and validation
- [ ] "My loans" page with Lending / Borrowing tabs
- [ ] Action buttons come from the API's allowed actions
- [ ] Clear status badges, including overdue

---

## M8 — Guest book & profile stats

### GB-01: Leave a guest book entry 🧪
- [ ] `POST /loans/:id/guestbook` with body (10–500 chars)
- [ ] Only the borrower or owner of that loan, only once the loan is `returned`, and within 30 days of return
- [ ] One entry per person per loan (enforced by a unique constraint)
- [ ] Entries can't be edited after posting

### GB-02: Show the guest book
- [ ] A member's profile shows guest book entries written **about** them, newest first, with the author and item

### PROF-04: Profile stats
- [ ] Profiles show: items listed, loans completed as lender, loans completed as borrower, member since

---

## M9 — Search & notifications

### SRCH-01: Search items
- [ ] `GET /items?q=` uses Postgres full-text search over title and description
- [ ] Works together with the category filter and pagination
- [ ] Search box on the browse page, debounced

### NOTIF-01: Email notifications
- [ ] Emails sent via AWS SES when: my item is requested; my request is approved or declined
- [ ] Sending email never causes the request itself to fail (it's queued or fire-and-forget, with errors logged)

### NOTIF-02: Return reminders
- [ ] A daily scheduled job emails borrowers whose loan is due back tomorrow
- [ ] Running the job twice in one day does not send duplicate emails

---

## M10 — Versioning in practice

The aim of this milestone is to make a real breaking change safely, with `v1` and `v2` running side by side.

### VER-01: Introduce v2 of a resource 🧪
Breaking change to practise with: **profile invitees move to their own endpoint.**
- [ ] `GET /v2/users/me` returns the profile **without** `invitees`
- [ ] `GET /v2/users/me/invitees` returns invitees, paginated
- [ ] `GET /v1/users/me` is unchanged and still returns `invitees`
- [ ] Endpoints that didn't change are available under both versions without duplicating controller code (e.g. `@Version(['1', '2'])`)
- [ ] 🧪 Contract tests run against **both** versions: the v1 response shape is identical before and after v2 ships

### VER-02: Deprecation signalling
- [ ] Deprecated versions send a `Deprecation` header on every response, plus a `Sunset` header with the retirement date
- [ ] Policy (in the ADR): a deprecated version stays available for at least **90 days** after its replacement ships
- [ ] Requests per API version are logged, so you can see when nobody uses an old version any more
- [ ] Retired versions return `410 Gone` with a message pointing to the current version

### VER-03: Minimum client version
> As the team, I want to stop very old mobile builds from calling the API, and tell users to update.
- [ ] Clients send `X-Client-Platform` (`web | ios`) and `X-Client-Version` (semver) headers
- [ ] Version-neutral `GET /client-config?platform=ios` returns `{ minimumVersion, latestVersion, apiVersion }`
- [ ] Requests from a client below the minimum version get `426 Upgrade Required`
- [ ] Requests without the headers are still allowed (so curl and old clients keep working)

### VER-04: Documentation per version
- [ ] Swagger/OpenAPI docs are generated separately for each version (`/docs/v1`, `/docs/v2`)
- [ ] The web app is migrated to `v2`, which proves v1 and v2 work side by side

---

## Stretch goals (pick one or more)

### STR-01: Connection graph
- [ ] Profiles and items show "You're N vouches apart" using a recursive CTE over the invite tree
- [ ] Owners can make an item visible to "friends of friends only" (≤ 2 vouches)

### STR-02: Contribution tiers
- [ ] Tier based on loans completed and items listed (define the formula in an ADR)
- [ ] Higher tiers can hold more open invites

### STR-03: Loan messages
- [ ] A message thread on each loan, visible only to the two parties

### STR-04: Mobile app
- [ ] An Expo React Native app that can log in (bearer token), browse items, and request a loan using the same API
- [ ] The app is pinned to an API version independently of the web app (e.g. mobile stays on `v1` while web uses `v2`)
- [ ] The app sends `X-Client-Platform` / `X-Client-Version`, checks `/client-config` on launch, and shows an "update required" screen on `426`

---

## Definition of done (every requirement)

- [ ] Acceptance criteria pass
- [ ] Tests written where marked 🧪
- [ ] Lint and type-check pass
- [ ] Deployed (from M5 onwards)
- [ ] ADR written where marked 📄
