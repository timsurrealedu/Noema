# AI inbox performance fixes

- [x] Preserve `processing` while a failed AI attempt is queued for retry.
- [x] Keep primary capture text ahead of attachments in AI input budgeting.
- [x] Bound image/audio base64 extraction memory.
- [x] Add `(job_id, id)` job-event index.
- [ ] Bound `/state` and browser persistence (needs paginated APIs).
- [x] Run focused tests, frontend tests, and build.
