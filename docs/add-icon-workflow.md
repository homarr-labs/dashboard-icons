# Add Icon Workflow Usage

This repository exposes `.github/workflows/add-icon.yml` to import an accepted PocketBase submission into the collection, commit assets/metadata, and mark the submission as `added_to_collection`.

## Required secrets
- `PB_URL`: PocketBase base URL (e.g., `https://pb.example.com`).
- `PB_ADMIN_TOKEN`: PocketBase superuser/impersonation token with permission to read submissions and update their status.

## Inputs
- `submissionId` (string, required): PocketBase submission record ID.
- `dryRun` (boolean, optional, default `false`): Skip writes, commit, and status update.

## Trigger via GitHub API (backend/webhook)
Use a token with `workflow` scope:
```bash
curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<OWNER>/<REPO>/actions/workflows/add-icon.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "submissionId": "SUBMISSION_RECORD_ID",
      "dryRun": "false"
    }
  }'
```

## Trigger from another workflow
```yaml
jobs:
  add-icon:
    uses: ./.github/workflows/add-icon.yml
    with:
      submissionId: ${{ github.event.inputs.submissionId }}
      dryRun: false
    secrets:
      PB_URL: ${{ secrets.PB_URL }}
      PB_ADMIN_TOKEN: ${{ secrets.PB_ADMIN_TOKEN }}
```


