# Deferred Items - Phase 17

## Pre-existing TypeScript errors (out of scope for Plan 17-04)

Discovered during `npx tsc --noEmit` verification for Plan 17-04 Task 2.
Both errors exist on main branch BEFORE Plan 17-04 changes (verified via git stash + re-check).

1. `web/src/lib/i18n.test.ts:81` — `"nonexistent.key"` not assignable to translation key union type. This is an INTENTIONAL test for the i18n type-safety system (test is checking the type system catches invalid keys). Likely needs `// @ts-expect-error` comment or `as never` cast.

2. `web/src/lib/rate-limit.ts:2` — `better-sqlite3` missing TypeScript declaration. Fix: `npm i -D @types/better-sqlite3`.

Both should be addressed in a quick-task (`/gsd:quick`) — not blocking for v1.1.
