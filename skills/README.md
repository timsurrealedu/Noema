# Managed Noema skills

These project-local skills are the auditable source for Noema AI behavior. The backend passes their equivalent instructions explicitly to isolated `codex exec` jobs; it does not depend on a user's global Codex configuration.

Read-only skills may answer immediately. Proposal skills never mutate Noema directly: they return structured proposals for review, audit, and later transactional application.
