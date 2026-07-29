---
type: "query"
date: "2026-07-29T14:57:59.065263+00:00"
question: "explain it simpler and in detail. btw does it have inbox log? where does it save the inbox files before it gets processed?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["createCapture", "createFileCapture", "addJobEvent", "getJob", "openDatabase"]
---

# Q: explain it simpler and in detail. btw does it have inbox log? where does it save the inbox files before it gets processed?

## Answer

Expanded from graph vocab: [capture, inbox, file, database, storage, job, events, interpretation, queue]. Text/link/voice captures are rows in the SQLite captures table. Each processing job is a SQLite jobs row; its lifecycle log is job_events and is available via the job events API. Uploaded files are first streamed to .data/jobs/upload-UUID, then atomically moved into .data/objects/<first-two-sha256>/<sha256>; assets metadata and capture-assets relation are in SQLite. The file upload route creates a file capture but does not automatically enqueue interpretation; the client must trigger it later. The capture row stores the filename as text and file metadata/reference, not necessarily extracted file content. Sources: server/core.mjs, server/objects.mjs, server/jobs.mjs, server/config.mjs, server/db.mjs, capture routes.

## Outcome

- Signal: useful

## Source Nodes

- createCapture
- createFileCapture
- addJobEvent
- getJob
- openDatabase