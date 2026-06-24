# Saleseeker + Retention Continuation Plan

## Goal

Finish the current uncommitted work in small, reviewable chunks:
1. Correct the Saleseeker backend/worker implementation.
2. Finish the visitor/retention backend/frontend integration.
3. Validate with targeted checks before broader type-check cleanup.

## Current Review Findings

### Saleseeker issues to fix first

- `src/app/api/saleseeker/leads/[id]/tags/route.ts` has a SQL correctness bug: the `UPDATE ... FROM saleseeker_leads JOIN saleseeker_businesses` statement does not constrain the target lead to `id = $1`, so it can update/return unintended rows.
- `src/app/api/saleseeker/generate/route.ts` is type-safe now, but the response shape should be simplified so UI status is not duplicated/confusing.
- `saleseeker_api/main.py` has the same tag-update SQL pattern and should use an explicit alias with `WHERE l.id = $1`.
- `saleseeker_api/main.py` may serialize Redis queue payloads incorrectly because it currently pushes a Python dict directly to Redis; it should push JSON strings.
- `saleseeker_api/main.py` currently spreads `results` after setting `status`, so Python dict ordering means `results['status']` overwrites the intended generate status.
- `saleseeker_scraper/worker.py` uses `CrawlerProcess` inside a loop. Scrapy's `CrawlerProcess` is not intended to be started repeatedly in the same process; replace with `CrawlerRunner` or spawn a subprocess per queue item.
- `saleseeker_scraper/saleseeker_scraper/spiders/contact_spider.py` currently stores emails/phones on the spider instance. That is acceptable for a single crawl, but should be kept minimal and not shared across requests.
- `prisma/migrations/20260617192500_add_saleseeker_tool/migration.sql` has a nullable unique index on `place_id`; duplicate businesses without `place_id` can still be inserted. Decide whether to add a fallback uniqueness constraint/index or accept the current behavior.

### Retention / visitor-platform issues to fix

- `visitor-platform/backend/src/routes/session.ts` returns `session.conversionEvent`, but the Prisma schema has `conversionStatus`; this will likely return `undefined`.
- `visitor-platform/backend/prisma/schema.prisma` and `prisma/schema.prisma` were changed, but generated Prisma client may be stale; run `prisma generate` in the relevant workspace after schema changes.
- `visitor-platform/backend/src/services/session.ts` creates visitors but does not consistently increment `Visitor.totalSessions`.
- `visitor-platform/backend/src/services/session.ts` calls `calculateIntentScore` before applying the pricing/checkout bonus, then updates `intentScore` twice. This should be consolidated.
- `visitor-platform/backend/src/services/session.ts` creates a new visitor for every new anonymous session and does not merge/link multiple sessions for the same anonymous visitor unless identity linking is used.
- `visitor-platform/backend/src/services/identity.ts` links email but does not update `Visitor.totalSessions`.
- `src/app/retention/components/RetentionOverviewCards.tsx` renders 8 cards but skeleton loading renders 7 placeholders.
- `src/app/api/v1/retention/visitors/route.ts` feed mode ignores the requested `limit` and always asks the backend for `limit=25`.
- `getOverview()` counts high-intent sessions, not high-intent visitors. Confirm whether the UI label should be high-intent visitors or sessions.

## Chunk 1 — Fix Saleseeker SQL and response correctness

Files:
- `src/app/api/saleseeker/leads/[id]/tags/route.ts`
- `src/app/api/saleseeker/generate/route.ts`
- `saleseeker_api/main.py`

Actions:
1. Change the Next.js tag route to use an aliased update:
   - `UPDATE saleseeker_leads AS l ... FROM saleseeker_businesses b ... WHERE l.id = $1 AND b.id = l.business_id`
2. Return only the needed lead row from the `RETURNING` clause.
3. In `generate/route.ts`, avoid duplicated status fields. Prefer:
   - `status: queued > 0 ? 'searching' : 'completed'`
   - plus existing `leads` and `campaigns`
4. In FastAPI, use the same aliased tag update pattern.
5. In FastAPI, serialize Redis queue payloads with `json.dumps(...)`.
6. In FastAPI, avoid overwriting the generate status when merging result dictionaries.

Validation:
- Re-run `npm run type-check -- --pretty false`.
- Confirm no new `src/app/api/saleseeker/**` errors.
- Run `python -m py_compile` on Saleseeker Python files.

## Chunk 2 — Harden Saleseeker Scrapy worker

Files:
- `saleseeker_scraper/worker.py`
- `saleseeker_scraper/saleseeker_scraper/spiders/contact_spider.py`
- `saleseeker_scraper/saleseeker_scraper/pipelines.py`

Actions:
1. Replace the loop-based `CrawlerProcess` with either:
   - `CrawlerRunner` + `CrawlerProcess` lifecycle management, or
   - a subprocess wrapper that starts a one-off Scrapy process per queue item.
2. Keep queue name as `saleseeker_scrape_queue`.
3. Ensure each queue item sends:
   - `business_id`
   - `website`
   - `job_id`
4. Ensure the spider uses only the current item's state.
5. Ensure pipeline posts to `SALEESEEKER_INGEST_URL` and handles non-OK responses without crashing the worker.

Validation:
- Run `python -m py_compile` on all Python files.
- Optionally install only if dependencies are available, then run a tiny Scrapy import smoke test.

## Chunk 3 — Align Saleseeker schema and migration

Files:
- `prisma/schema.prisma`
- `prisma/migrations/20260617192500_add_saleseeker_tool/migration.sql`
- `src/app/tools/saleseeker/types.ts`

Actions:
1. Confirm Prisma models match the SQL migration:
   - `SaleseekerBusiness`
   - `SaleseekerLead`
   - `SaleseekerCampaign`
   - `SaleseekerJob`
   - `SaleseekerJobStatus`
2. Confirm generated client names are available after `prisma generate`.
3. Decide whether nullable `place_id` uniqueness is sufficient or whether to add a partial unique index for non-null `place_id` only. Current migration uses a regular unique index on a nullable column.
4. Ensure all API rows use consistent camelCase frontend types and snake_case SQL fields.

Validation:
- Run `npx prisma generate`.
- Run targeted TypeScript check.

## Chunk 4 — Finish retention API proxy routes

Files:
- `src/app/api/v1/retention/overview/route.ts`
- `src/app/api/v1/retention/visitors/route.ts`
- `src/app/api/v1/retention/visitor/[id]/route.ts`
- `src/app/api/v1/retention/identify/route.ts`

Actions:
1. Validate response status before parsing JSON.
2. Add safe numeric parsing for `page` and `limit`.
3. Preserve `feed=true` behavior but use the requested `limit` instead of hard-coded `25`.
4. Return a consistent error shape for non-OK upstream responses.
5. Consider adding request forwarding for auth headers only if retention pages require tenant/org auth.

Validation:
- Run targeted TypeScript check.
- Smoke-test route compilation.

## Chunk 5 — Fix visitor-platform backend correctness

Files:
- `visitor-platform/backend/prisma/schema.prisma`
- `visitor-platform/backend/src/routes/session.ts`
- `visitor-platform/backend/src/services/session.ts`
- `visitor-platform/backend/src/services/identity.ts`

Actions:
1. Replace `session.conversionEvent` in `routes/session.ts` with `session.conversionStatus` unless a new DB field is intentionally added.
2. Consolidate intent scoring in `services/session.ts`:
   - compute base score from events
   - apply pricing/checkout bonus once
   - update `intentScore` once
3. Increment `Visitor.totalSessions` correctly when creating a new visitor or linking sessions.
4. Make `finalizeSession` update visitor `lastSeen` after session finalization.
5. Ensure `getOverview()` matches UI labels:
   - if UI says `High Intent`, count visitors with at least one session `intentScore >= 80`
   - otherwise rename UI label to `High Intent Sessions`
6. Ensure `getVisitors()` handles visitors with no sessions safely.

Validation:
- Run `npx prisma generate` in `visitor-platform/backend`.
- Run the backend type-check command if available.
- If no backend script exists, run `npx tsc --noEmit` from `visitor-platform/backend` if `tsconfig.json` exists.

## Chunk 6 — Fix retention frontend display issues

Files:
- `src/app/retention/components/RetentionOverviewCards.tsx`

Actions:
1. Render skeleton placeholders based on `cards.length` instead of hard-coded `7`.
2. Confirm all metric values are safe for `0`, `null`, and undefined data.
3. Keep the UI responsive and avoid unnecessary layout shifts.

Validation:
- Run targeted TypeScript check.
- Confirm no new retention component errors.

## Chunk 7 — Final validation

Commands:
1. `npm run type-check -- --pretty false`
   - Expect existing unrelated errors to remain unless this session explicitly fixes them.
   - Confirm no new Saleseeker or retention errors.
2. `python -m py_compile saleseeker_api/main.py saleseeker_scraper/worker.py saleseeker_scraper/saleseeker_scraper/items.py saleseeker_scraper/saleseeker_scraper/settings.py saleseeker_scraper/saleseeker_scraper/pipelines.py saleseeker_scraper/saleseeker_scraper/spiders/contact_spider.py`
3. `npx prisma generate`
4. `git diff --check`
5. Review `git status --short` and remove generated caches or unintended files.

## Execution Order

1. Chunk 1 — Saleseeker correctness fixes.
2. Chunk 2 — Scrapy worker lifecycle fix.
3. Chunk 3 — Saleseeker schema/migration alignment.
4. Chunk 4 — Retention API proxy safety.
5. Chunk 5 — Visitor backend correctness.
6. Chunk 6 — Retention frontend cleanup.
7. Chunk 7 — Final validation.

## Stop Conditions

- Saleseeker API routes compile without new TypeScript errors.
- Saleseeker Python files pass syntax checks.
- Retention proxy routes compile without new TypeScript errors.
- Visitor backend no longer references non-existent Prisma fields.
- Generated Prisma client is up to date after schema changes.
- No generated cache files remain untracked.
