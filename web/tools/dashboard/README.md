# Local dashboard review

Use an isolated database. The normal `.env.local` may point at production.
The scripts in this directory intentionally use only `127.0.0.1:8095` and
`127.0.0.1:8096`; they never load production credentials.

From the repository root, start PocketBase:

```sh
DASHBOARD_DISABLE_EMAIL=1 DASHBOARD_MOCK_GITHUB_URL=http://127.0.0.1:8096 \
  web/backend/pocketbase serve --automigrate=false --http=127.0.0.1:8095 \
  --dir=/tmp/dashboard-redesign/data \
  --hooksDir="$PWD/web/backend/pb_hooks" \
  --migrationsDir="$PWD/web/backend/pb_migrations"
```

Create a **local-only** superuser, seed 1,500 submissions, and start the mock:

```sh
web/backend/pocketbase superuser create dashboard-local@example.test LocalDashboardOnly2026 \
  --dir=/tmp/dashboard-redesign/data
python3 web/tools/dashboard/seed-local.py
python3 web/tools/dashboard/mock-github.py
```

Start Next.js from `web/` with explicit local overrides:

```sh
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8095 PB_URL=http://127.0.0.1:8095 \
  node node_modules/next/dist/bin/next dev --port 3005
```

If macOS runs out of file watchers, use `WATCHPACK_POLLING=1000` and `--webpack`.
Open `http://localhost:3005/dashboard`. Local accounts all use password
`LocalDashboardOnly2026`: admins `alex-admin@example.test` and
`manuel@example.test`; contributors `anna-user@example.test` and
`bellamy@example.test`.

The mock returns queued runs. POST `{"id":"10000","conclusion":"failure"}`
to `http://127.0.0.1:8096/simulate` to complete a mock run, then
refresh Publish. For successful publication, use the local superuser to POST
a `running` result with a `commit_sha`, followed by `succeeded`, to
`/api/dashboard/publish/{batchId}/result`. This exercises the workflow callback
without pushing a commit or invoking GitHub.

## Deployment order

1. Back up PocketBase, then deploy the new migration and hooks. Set `GITHUB_TOKEN`
   on **PocketBase**, with repository Actions read/write and Contents read access.
   Keep the existing workflow PocketBase credentials. Never enable the local mock
   or email-disable settings in production.
2. Deploy `.github/workflows/add-icon.yml` and the import/finalization scripts to
   `main` before enabling publishing in the new frontend.
3. Deploy the frontend. Existing rows remain intact; audit history starts at rollout.

Dashboard records and events commit together. Publish callbacks are idempotent;
unknown batches stay reserved until GitHub reconciliation establishes the result.
If a completed run cannot be correlated with a pushed batch-marked commit,
inspect its logs before resolving the reservation through PocketBase administration.
Keep the new audit collections on rollback so collected history is preserved.
