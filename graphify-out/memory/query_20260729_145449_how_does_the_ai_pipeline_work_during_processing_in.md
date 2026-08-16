---
type: "query"
date: "2026-07-29T14:54:49.145995+00:00"
question: "how does the ai pipeline work during processing inbox?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["CaptureInbox", "createCapture", "enqueueJob", "runOne", "handleInterpretCapture", "runAI", "applyCaptureInterpretation"]
---

# Q: how does the ai pipeline work during processing inbox?

## Answer

Expanded from graph vocab: [inbox, capture, interpret, job, worker, proposal, action, ai, queue, validation]. CaptureInbox reads shared state. API creates a capture. Interpret route queues a job. Worker runOne claims it and dispatches handleInterpretCapture. The handler records job events, calls runAI through configured provider chains, checks cancellation/transient failures, validates the proposal, and saves its interpretation. Applying the interpretation is separate and creates notes, tasks, or events through normal core save functions. Relevant nodes: CaptureInbox, createCapture, enqueueJob, runOne, handleInterpretCapture, runAI, validateProposal, saveInterpretation, applyCaptureInterpretation.

## Outcome

- Signal: useful

## Source Nodes

- CaptureInbox
- createCapture
- enqueueJob
- runOne
- handleInterpretCapture
- runAI
- applyCaptureInterpretation