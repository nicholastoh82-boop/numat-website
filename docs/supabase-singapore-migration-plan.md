# Moving the NUMAT database from Sydney to Singapore

## Why
The Vercel functions now run in Singapore, next to the team. The database still
runs in Sydney. Every page makes a few short trips to the database, and each trip
crosses Singapore to Sydney at about 90 milliseconds, even though each query runs
in a few milliseconds. Moving the database to Singapore turns each 90 millisecond
trip into about 1 millisecond and fixes every page at once. There are no users in
Australia, so there is no reason to keep it in Sydney.

## The honest catch
Supabase cannot change a project's region in place. A region move means creating
a new project in Singapore, copying everything across, then pointing the app at
it. So this is a planned switch with a short downtime, not a toggle. Done in a
quiet window it is low risk, and because the old Sydney project stays untouched,
rollback is instant.

## Target
New Supabase project in the Singapore region (ap southeast 1), to sit in the same
place as the Vercel functions (sin1).

## What has to move
1. The whole database: tables, data, row level security, functions, triggers,
   sequences, and the extensions (pg_net, http, pg_cron, pg_trgm and so on).
2. The auth users, keeping the same user ids, so access rows in portal_access and
   user_roles still match the right people.
3. The storage files (the qc photos bucket and any others).
4. The settings that live in the database: push_config (the VAPID keys and the
   chat hook secret), and any cron jobs.

## Who does what
- Nick: create the new Singapore project, then later set the new keys in Vercel
  and trigger the redeploy. These need the Supabase and Vercel dashboards.
- Claude: apply the schema, copy the data, copy storage, recreate extensions and
  cron, and run the full verification, all through tooling.

## Pre flight (no downtime, done before the window)
1. Nick creates the new project in Singapore and shares its keys and connection
   string with Claude.
2. Claude applies the full schema to the new project from the tracked migrations,
   then loads a first copy of the data, so the heavy lifting is done up front.
3. Claude enables the same extensions and recreates the cron jobs and the chat
   push trigger on the new project.
4. Claude runs a dry verification on the new project: counts per table match,
   functions and triggers present, RLS present.

## Cutover window (the short downtime, after hours)
Pick a time when nobody is working, for example late on a Sunday night Malaysia
time. Expect 30 to 60 minutes.

1. Freeze writes. Put up a short notice, or simply run it when the team is offline,
   so no new data is written to Sydney during the copy.
2. Final delta copy. Copy across only the rows that changed since the pre flight
   copy, so nothing written in between is lost.
3. Copy any storage files added since the pre flight copy.
4. Repoint the app. Nick updates these in Vercel and redeploys:
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_URL
   - the anon key
   - SUPABASE_SERVICE_ROLE_KEY
   - the database connection strings, if any are set
5. Smoke test on the live site, in this order:
   - Sign in as a normal numat.ph user.
   - Open Team Chat: send a message, confirm it appears live and a push arrives.
   - Production QC and Borax Test: take or upload a photo, confirm it saves and
     the photo opens (storage works).
   - Finance Receipts, CRM dashboard, Pricing tab: confirm data loads.
6. If all green, lift the freeze. The move is done.

## Expect this, so nobody is surprised
- Everyone signs in again. A new project has a new token signing secret, so old
  sessions stop working. This is normal and one time.
- Signed photo links regenerate from the new project. Old direct links expire,
  which is fine because the app makes fresh ones.
- Realtime and push reconnect to the new project automatically through the new
  keys.

## Rollback (instant)
If anything in the smoke test fails and cannot be fixed quickly:
1. Nick sets the Vercel keys back to the Sydney project and redeploys.
2. The portal is back on Sydney within a couple of minutes, exactly as before.
The Sydney project is never deleted during the move, so this is always available.
Keep Sydney running for at least a week after a successful move as a safety net,
then retire it.

## After the move
- Re measure page switching on a real phone in Malaysia. Each database trip should
  drop from about 90 milliseconds to about 1 millisecond, so pages that felt slow
  should feel immediate.
- Retire the Sydney project once a week has passed with no issues.

## A lighter alternative, if full downtime is unwanted
Supabase can add a read only copy of the database in Singapore (a read replica)
while the main database stays in Sydney. Page loads, which are mostly reads, would
be served locally and fast, with no downtime and no full move. The trade off is
that writes (sending a chat, saving a form) still go to Sydney, and the app needs
a small change to send reads to the Singapore copy. This is more moving parts for
a partial result. Since there are no users in Australia, the clean full move above
is the better long term answer, but the replica is on the table if a maintenance
window is hard to find.
