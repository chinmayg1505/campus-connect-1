# CampusConnect V1 State

Last updated: this response (Phases 11–16: build/debug attempt, static verification,
Supabase integration check, security review, palette check).
This file is the source of truth for project continuity — do not rely on chat
history to understand project state.

## PHASE 11 — Build & Debug: RESULT

`npm install` still fails in this sandbox: `npm error code E403 — 403 Forbidden -
GET https://registry.npmjs.org/@supabase%2fsupabase-js`. This is a sandbox network
restriction (all outbound npm registry access is blocked, including
`--offline`/cache mode — no local package cache exists either), not a project
problem. **`npm run build` / `npm run dev` were never actually run — do not treat
anything below as "the app boots" or "the build passes."** That can only be
confirmed on your machine or CI.

What I did instead, since a real compiler wasn't available either: this sandbox
does have a standalone global TypeScript compiler (`tsc`, and bare `react`/
`react-dom` packages with no `@types/*`) unrelated to this project's own
`node_modules`. I temporarily symlinked those in, stubbed `next` and
`@supabase/supabase-js` as blank ambient modules (`declare module "next";` etc. —
this makes imports from them resolve as `any` instead of erroring, which is the
best available substitute for the real, unavailable type packages), and ran
`tsc --noEmit --strict` across every `.ts`/`.tsx` file.

Result: **785 diagnostic lines, all 785 in categories directly caused by the
missing `@types/react`, `@types/node`, `next`, and `@supabase/supabase-js`
packages** (`TS7026` no `JSX.IntrinsicElements`, `TS7016`/`TS2882` no declaration
file, `TS2503`/`TS2709` no `JSX`/`React` namespace, and their cascades like
`TS2322`/`TS7053`/`TS2347` on lines that reference JSX or the stubbed modules). I
manually inspected every non-obviously-cascading error line individually — none
trace to a real bug in this project's own logic, interfaces, or prop usage. This
is a genuine (if partial) signal, not a guess, but it is **not equivalent to a
real build** — it can't catch issues in how the real `next`/`@supabase/supabase-js`
type definitions actually shape generic calls like `createClient<Database>()` or
`useParams<T>()`, since those were stubbed as untyped. Scaffolding used for this
(`node_modules` symlinks, a throwaway `tsconfig.check.json`, `types-shim.d.ts`) was
removed afterward — it's not part of the delivered project.

While reviewing, I found and fixed 4 real code-quality issues unrelated to the
network blocker — all `any` usages, which you explicitly asked not to leave in:
- `app/(app)/messages/page.tsx`: replaced 3 `as any[]` casts with two proper
  interfaces (`RequestWithAcceptedOffers`, `OfferWithRequest`) matching the exact
  shape of the two embedded-join `.select(...)` queries used there.
- `app/(app)/requests/[id]/page.tsx`: `runAction`'s error parameter was typed
  `any` — changed to the real `PostgrestError | null` from `@supabase/supabase-js`.

Route inventory (all 14 routes from the brief) matches the actual file tree — see
Frontend → Routes/screens table below; none are missing, none are orphaned.

## PHASE 12 — Supabase Integration Check: RESULT

Cross-checked mechanically (grep) against `campusconnect_v1_migration_v2.sql`:
- Every `.from("...")` call in the frontend (21 call sites) uses one of the exact
  7 table names — no typos, no extra tables referenced.
- All 4 `.rpc("...")` calls (`accept_offer`, `start_request`, `complete_request`,
  `cancel_request`) match the migration's function names exactly, with matching
  argument names (`p_offer_id`, `p_request_id`).
- Every `.insert({...})` payload (`requests`, `offers`, `messages`, `ratings`,
  `profiles`) was diffed column-by-column against each table's DDL — all match.
- `.update({...})` calls are limited to exactly the fields RLS/guard triggers
  allow: `offers.status` → `'rejected'`/`'withdrawn'` only, `messages.read_at`
  only, and `profiles` edit excludes `id`/`username`/`college_id`/
  `rating_average`/`rating_count`/`completed_count` entirely.
- **Resolved the FK-embed open question from the previous state**: inspected the
  migration's `offers` table DDL directly — `helper_id` has no explicitly named
  constraint, so Postgres's default naming (`<table>_<column>_fkey`) applies,
  making `offers_helper_id_fkey` the actual constraint name. The embed hint
  `profiles!offers_helper_id_fkey(*)` in `requests/[id]/page.tsx` is confirmed
  correct against the DDL. (Still worth a real smoke test once the project runs —
  PostgREST's schema cache is the final authority — but this is no longer a
  guess.)

No schema changes were made or needed.

## PHASE 13 — Known Issues: STATUS

1. **Realtime replication on `public.messages`.** Unchanged — still requires the
   one manual Supabase dashboard step documented in README.md. Cannot be verified
   without a live project + running app.
2. **Offer→helper profile join.** Resolved — see Phase 12 above.
3. **Messages-list N+1 queries.** Still present. Per the workflow rule
   ("don't prematurely polish if build/runtime correctness is still broken"),
   deferred until after a real build/run confirms the simpler path works first.
4. **Optimistic UI.** Still not implemented, still deferred for the same reason.

## PHASE 14 — Security Review: RESULT

Read every mutation site in the frontend against the audited RLS policies and
guard triggers (see Phase 12 for the enumeration method):
- No direct client write to `profiles.rating_average`, `rating_count`,
  `completed_count`, or `id` anywhere in the codebase.
- No direct client write to `requests.status` anywhere — all 4 status
  transitions go through the RPCs, exactly as the audited backend requires.
  Content-field edits to a request aren't exposed in the UI at all yet (there's
  no "edit request" screen), which is stricter than necessary but safe.
- `offers.status` direct updates are limited to `'rejected'` (rendered only in
  the request-owner's view) and `'withdrawn'` (rendered only in the offering
  helper's own-offer view) — matches `guard_offers_update()` exactly. Acceptance
  only ever goes through `accept_offer()`.
- `messages` inserts only ever set `sender_id` to the current user and rely on
  RLS (`messages_insert_participants`) to reject anything else — the frontend
  doesn't attempt to pre-filter who can be messaged beyond deriving the
  recipient from the accepted offer, so RLS is doing the real work as intended.
- All UI-level gating (`isOwner`, `myOffer`, button visibility) is presentation
  logic only — every action still goes through a real Supabase call that RLS/RPC
  authorization checks independently, so a manipulated client can't do anything
  the backend wouldn't independently reject.
- No `service_role` key or any secret beyond the two `NEXT_PUBLIC_*` vars exists
  anywhere in the codebase (`grep -r "service_role"` → no matches).

This is a code-reading review, not a penetration test — it hasn't been exercised
against a live project. The 20-item security test sequence from the deployment
runbook should still be walked through the real running UI once Phase 11 is
unblocked (this was already the recommended next step and remains so).

## PHASE 15 — UI/UX: PARTIAL

Deferred the full pass per the brief's own sequencing ("only after functionality
and build correctness are confirmed") — that's not true yet. Did do the one check
that's possible without a running app: searched every `.tsx`/`.ts`/`.css` file for
hardcoded hex colors outside `tailwind.config.ts`. Found exactly 3, all of which
are intentional restatements of already-approved palette values (`#F8FAFC` and
`#0F172A` in `globals.css` base styles, `#1E3A5F` as the `<meta theme-color>` in
`app/layout.tsx`) — no rogue colors.

**One thing to flag back to you rather than silently decide**: `tailwind.config.ts`
adds `danger`/`warning`/`success` (plus light tints) beyond your 8 approved colors,
for error banners, offer-status badges, etc. Functionally necessary — the approved
palette has no way to express "this failed" or "this is pending" — but it's
outside what you explicitly specified, so flagging it rather than assuming it's
fine. Easy to restyle using only navy/blue/teal-at-different-opacities if you'd
rather stay strictly within the 8 colors.

## PHASE 16 — Responsive + Accessibility: DEFERRED

Same reasoning as Phase 15 — actual rendering, overflow, keyboard navigation, and
contrast can only be meaningfully checked in a running browser, which isn't
available here. What's already in place from the original build (mobile
bottom-nav/desktop sidebar breakpoint, 44px+ touch targets, form labels,
`aria-label`/`aria-current`/`aria-pressed`) is unchanged. Full pass is next-task
material once Phase 11 is unblocked.

## Completed

Real Supabase integration throughout — no mock data, no localStorage-as-database.
Code has NOT been run/built in this environment (see "Verification caveat" below),
so "completed" here means "implemented and code-reviewed against the actual schema,"
not "tested end-to-end against a live project."

- **Phase 1 — Authentication**: splash (`app/page.tsx`), welcome, login, signup
  (creates `auth.users` only, no premature profile insert), forgot password
  (`resetPasswordForEmail`), session handling via `lib/auth-context.tsx`
  (`onAuthStateChange` + `getSession`), logout (in Profile screen).
- **Phase 2 — Onboarding**: `app/onboarding/page.tsx` collects full_name, username,
  college (from `colleges` table), department, year_of_study, role_mode, bio, skills
  (from `skills` table, multi-select), avatar (URL input, not file upload — see Known
  Issues). Inserts into `profiles` only after all required fields are present.
- **Phase 3 — Main navigation**: `components/Nav.tsx` — bottom tab bar on mobile,
  sidebar on desktop. 5 tabs: Home, Discover, My Requests, Messages, Profile.
  Route-guarded by `app/(app)/layout.tsx` (redirects to /welcome or /onboarding
  if session/profile missing).
- **Phase 4 — Requests**: create (`requests/new`), details (`requests/[id]`), list
  (`requests/mine`), discovery list (`discover`). Status badges use exact enum values
  from the DB (`posted`, `offer_received`, `accepted`, `in_progress`, `completed`,
  `cancelled`).
- **Phase 5 — Discover**: category filter, text search, sort (newest/oldest/deadline)
  — all applied client-side on top of an already-RLS-filtered query result. Comment
  in code explicitly notes RLS is the real boundary, filters are UX only.
- **Phase 6 — Offers**: send offer, view offers (owner sees all on their request,
  helper sees their own — matches RLS), accept via `accept_offer()` RPC, reject via
  direct `update` (owner, pending only), withdraw via direct `update` (helper,
  pending only) — matches the audited migration's guard trigger rules exactly.
- **Phase 7 — Messaging**: `messages/[requestId]/page.tsx`. No conversations table —
  grouped by `request_id`. Realtime subscription for new messages (needs one manual
  Supabase dashboard step — see Known Issues). Read receipts via `read_at` update on
  load. Thread list derives "conversations" from requests with an accepted offer.
- **Phase 8 — Completion**: `start_request()` and `complete_request()` RPCs wired to
  buttons on the request-owner's request-details view.
- **Phase 9 — Ratings**: 1–5 star UI (`components/Badges.tsx` `StarRating`), optional
  review text, insert into `ratings` only — average/count are never written by the
  client (system-maintained via `on_rating_insert()` trigger).
- **Phase 10 — Profile**: view screen (stats, college, skills, bio) and edit screen.
  Edit form only submits editable columns; `rating_average`, `rating_count`,
  `completed_count`, `id` are never included in the update payload (defense in depth
  — the DB trigger would silently reset them even if they were).
- **Loading/empty/error states**: `components/States.tsx` (`LoadingState`,
  `EmptyState`, `ErrorState`, `InlineBanner`) used on every data-fetching screen.
  `friendlyErrorMessage()` in `lib/utils.ts` maps raw Postgres/Supabase errors to
  human-readable text so raw DB errors are never shown to users.
- **Responsive layout**: mobile bottom-nav / desktop sidebar in one shared `Nav`
  component; max-width containers scale up on larger screens rather than a separate
  desktop app.
- **Basic accessibility**: form labels tied to inputs, `aria-label`/`aria-current`/
  `aria-pressed` on interactive controls, semantic `<button>`/`<form>` elements,
  focus-visible styles inherited from Tailwind defaults, min 44px touch targets on
  primary buttons and nav items.

## In Progress / Partially Done

- **Accessibility pass**: basics are in place (see above) but there has been no
  dedicated screen-reader or keyboard-only walkthrough, and color contrast hasn't
  been checked against WCAG AA numerically for every state (e.g. status badge
  text-on-tint combinations).
- **Performance**: request/discover queries use `.limit()`; messages list does N+1
  queries per thread (profile + last message + unread count) — fine for V1 test
  volumes, but should be converted to a single view/RPC if thread counts grow.

## Not Started

- Avatar file upload via Supabase Storage (currently a pasted URL field only).
- Push/browser notifications for new offers or messages.
- Pagination controls (infinite scroll / "load more") — current lists use a fixed
  `.limit()` instead.
- Admin UI for managing `colleges`/`skills` — still SQL-Editor-only, as designed.
- Full security review pass (implementation order step 19) and final integration
  test against a live Supabase project (step 20) — see Verification caveat below.

## Database

Backend is unchanged from the audited migration — **this frontend does not alter
the schema in any way**. Tables used: `profiles`, `colleges`, `skills`, `requests`,
`offers`, `messages`, `ratings`. RPCs used: `accept_offer`, `start_request`,
`complete_request`, `cancel_request`. See `campusconnect_v1_migration_v2.sql` and
`campusconnect_v1_deployment_runbook.md` for full schema/RLS/deployment detail.

**One assumption to verify**: the offers→profiles join in
`app/(app)/requests/[id]/page.tsx` uses the embed hint
`profiles!offers_helper_id_fkey(*)`, relying on Postgres's default foreign-key
constraint naming (`<table>_<column>_fkey`) since the migration didn't name that
constraint explicitly. This should work as-is, but if Supabase's schema cache shows
a different auto-generated name, update that one query.

## Authentication

Email/password only, per the approved auth plan. Signup creates `auth.users` only;
`profiles` insert happens in onboarding. Session persisted via
`@supabase/supabase-js`'s built-in storage + `onAuthStateChange` listener in
`lib/auth-context.tsx`. No other providers wired up.

## Frontend

Next.js 14 App Router, TypeScript, Tailwind CSS with the exact approved palette
(`tailwind.config.ts`). Client components throughout (no server components/server
actions used in this pass — all Supabase calls happen in the browser via the anon
key, consistent with "frontend may use only the public URL and anon key").

### Routes / screens

| Route | Purpose |
|---|---|
| `/` | Splash — decides where to route based on session/profile |
| `/welcome` | Marketing/entry screen |
| `/login`, `/signup`, `/forgot-password` | Auth |
| `/onboarding` | Profile creation |
| `/home` | Dashboard |
| `/discover` | Browse requests |
| `/requests/new` | Create request |
| `/requests/mine` | Own requests |
| `/requests/[id]` | Request detail, offers, lifecycle actions, ratings |
| `/messages` | Conversation list |
| `/messages/[requestId]` | Chat thread |
| `/profile`, `/profile/edit` | Profile view/edit |

## Known Issues

1. **Realtime requires a manual dashboard step.** `public.messages` must be added
   to the `supabase_realtime` publication (Database → Replication in the Supabase
   dashboard, or `alter publication supabase_realtime add table public.messages;`).
   Still unverified — needs a live project. (Phase 13)
2. **Still not actually built/run.** Two agents in a row have hit the identical
   sandbox blocker: no outbound network access, so `npm install` can never reach
   the npm registry here (`403 Forbidden`, confirmed again in Phase 11, including
   `--offline` mode — there's no local cache either). A best-effort static
   TypeScript check was run instead (see Phase 11 above) and found no evidence of
   real bugs, but **this has never been confirmed to actually compile or run**.
   This will keep being the #1 blocker for any agent continuing this project in a
   similarly sandboxed environment — it needs to happen on a machine/CI with real
   npm registry access.
3. ~~Offer→helper profile join~~ — **resolved**, see Phase 12.
4. Messages-list N+1 queries — still present, intentionally deferred (Phase 13).
5. No optimistic UI for offer accept/reject/withdraw or lifecycle actions —
   functional but not the snappiest. Deferred (Phase 13).
6. `danger`/`warning`/`success` colors in `tailwind.config.ts` go beyond the 8
   explicitly approved colors (Phase 15) — flagged for Chinmay's call, not yet
   changed either way.

## CI Build

**Workflow file:** `.github/workflows/build.yml`

**Commands CI executes** (on every push to `main` and every pull request):
```
npm install
npm run build
```
Node 20 on `ubuntu-latest`. Two placeholder (non-secret) env vars are set so the
Supabase client can construct during the build's static page-shelling —
`NEXT_PUBLIC_SUPABASE_URL=https://ci-placeholder-project.supabase.co` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder-anon-key-not-a-real-secret`. No
`SUPABASE_SERVICE_ROLE_KEY`, database password, or other secret is used or
needed — the build never makes a real Supabase call (every screen is a
`"use client"` component fetching after mount, not during SSR/build). Full
explanation in README.md → "CI / Build Verification".

**Package.json changes made for this task:** added an `"engines": { "node":
">=18.17.0" }` field. All four scripts (`dev`, `build`, `start`, `lint`) were
already present from the original build — nothing was missing. All three
external packages actually imported anywhere in the code (`next`, `react`,
`@supabase/supabase-js`) were already declared as dependencies — confirmed by
grepping every import statement in `app/`, `lib/`, `components/` against
`package.json`. No new dependencies were added.

**Other files added for this task:** `.gitignore` (didn't exist before — needed
so `node_modules`/`.next`/`.env*.local` aren't accidentally committed when this
becomes a real git repo pushed to GitHub).

**Has CI actually run yet? No.** This repository doesn't exist on GitHub yet as
far as I know — the workflow file is prepared and correct, but "the workflow
runs and passes" can only be confirmed once you push this to a GitHub repo with
Actions enabled. **Do not treat this as a passing build.** It's the mechanism
that will finally produce a real, trustworthy pass/fail — something the sandbox
this project has been built in still cannot do directly.

### Build-verification checklist

Status of each once CI actually runs for the first time — all unchecked until
then:

- [ ] **Dependency installation** — `npm install` resolves and installs
      `next@14.2.15`, `react@^18.3.1`, `react-dom@^18.3.1`,
      `@supabase/supabase-js@^2.45.4`, and all devDependencies with no errors.
- [ ] **TypeScript compilation** — `next build`'s internal type-check passes
      against the *real* `@types/react`, `@types/node`, and the real `next`/
      `@supabase/supabase-js` type definitions (this is strictly more than what
      the earlier sandbox static check in this file's history could verify,
      since that check had to stub those two packages as untyped).
- [ ] **Next.js compilation** — all 14 routes under `app/` compile into the
      build output with no errors.
- [ ] **Tailwind compilation** — `globals.css` processes cleanly against
      `tailwind.config.ts`, including the custom palette + `danger`/`warning`/
      `success` additions noted under Known Issues.
- [ ] **Route generation** — `next build`'s route summary lists all 14 expected
      paths with no unexpected 404s/missing pages.

## Next Task

1. **Push this repository to GitHub and let `.github/workflows/build.yml`
   actually run.** This is now the concrete unblock — CI has real npm registry
   access this sandbox never had. Check the Actions tab for pass/fail.
2. If CI fails, fix whatever real TypeScript/build errors it reports (the earlier
   static check in this file found none in this project's own code, but it had
   to stub `next`/`@supabase/supabase-js` as untyped, so it couldn't see how
   their *real* type definitions shape generic calls like
   `createClient<Database>()` — CI is what actually resolves that unknown).
3. Once CI is green, run it locally too (`npm install && npm run dev`) with real
   Supabase credentials, click through all 14 routes, confirm they render.
4. Enable Realtime replication on `public.messages` (Known Issues #1).
5. Walk the 20-item security test sequence from the deployment runbook against the
   running UI (not just raw SQL) to confirm RLS + RPCs behave the same way in
   practice.
6. Decide on the `danger`/`warning`/`success` color question (Known Issues #6).
7. Full Phase 15/16 pass (visual polish, responsive check across real viewports,
   keyboard/contrast accessibility audit) — only meaningful once 1–3 are done.

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/publishable key — safe for the browser |

No other environment variables are used. The service_role key is never referenced
anywhere in this codebase.
