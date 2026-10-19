# Own Submission updates

`updateOwnSubmission(pb, userId, submissionId, input)` uses the caller's authenticated PocketBase client, never elevated credentials, and returns the saved Submission. Its input extends `SubmissionInput` with an optional `updated` concurrency token.

The assets are a **full representation**, not a delta: send Base and every well-known or Custom variant to keep as validated Files. Omitted optional variants are removed. Load retained files before calling the helper. The web form requires the loaded record's `updated` token; callers without a form can omit it and the helper uses the record it just fetched. PocketBase compares that token again and rechecks the record under its write transaction.

Only the owner can edit pending/rejected records. Approved/published records and active publish reservations stay locked. Rejected saves transition the same id to pending, increment the round, and clear reviewer/feedback fields. Pending edits do not increment the round.

PocketBase retains one bounded last rejected snapshot in `last_rejected` and independent file copies in `reviewed_assets` (up to 99 files, 5 MB each). Copies are created inside the save transaction before current assets can be deleted. Snapshot metadata points to those copies, not deleted current filenames. A later resubmission replaces that snapshot and its files. Existing `submission_events` retain earlier metadata history; only the most recent rejected round is guaranteed file-backed comparison.

Legacy references are resolved by the shared `backend/pb_hooks/submission-assets.js` module before editor labelling, community rendering and snapshot remapping. Exact references take precedence; sanitized stems and PocketBase's ten-character storage suffix are matched only when unique, with the original extension preserved. Conflicting or ambiguous references are never assigned by position or first match. The editor downloads every original file and lets the owner assign unresolved files to empty well-known or distinct Custom slots before saving.

Snapshots retain explicit `asset_variants` and `asset_sources` maps for identifiable copied files. Ambiguous labels are kept in `unresolved_variants` with their original reference and all copied candidates; ambiguous metadata is not turned into a dangling file URL. Comparison displays every unassigned original separately. No migration rewrites legacy rows.
