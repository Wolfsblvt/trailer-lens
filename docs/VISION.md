# Product vision

This document owns why Trailer Lens exists, who it serves, and the product promise its releases must keep. Scope
boundaries and non-goals live here; implementation rationale lives in `DECISIONS.md`.

## The promise

> Trailer Lens makes a commit's fine print readable: the co-authors, reviews, sign-offs, and custom metadata that
> GitHub leaves buried in the raw message.

Git commit messages routinely end in structured trailers — `Co-authored-by`, `Reviewed-by`, `Signed-off-by`,
`Fixes`, `Change-Id`, and legitimate custom keys. That structure is real evidence stored in the repository, and GitHub
Web shows almost none of it: co-authors collapse into a summary header, custom keys render as plain text nobody
expands, and a malformed block (one stray blank line) silently drops lines from Git's own parse while the page looks
perfectly healthy.

Trailer Lens adds the missing reading layer: a compact panel on commit pages that shows the exact trailer evidence the
commit already contains — parsed the way Git parses it, with everything Git would ignore still visible and labeled as
such.

## Who it serves

Anyone who reads commits and cares who declared what: reviewers checking co-authorship, maintainers auditing
sign-offs, teams with their own trailer conventions, and readers of AI-assisted repositories where pair-programming
provenance (for example `Co-authored-by` plus a route line like `Co-authored-via`) is the first place attribution
lives. The extension works on private repositories exactly because it reads only the page the signed-in user already
sees.

## What the product refuses

- It does not decide whether a named person truly performed the act. Trailers are declarations by whoever created the
  commit; Trailer Lens renders them without upgrading them to verified facts.
- It does not repair, reorder, or normalize history — malformed evidence stays visibly malformed.
- It does not replace GitHub's native presentation, signature state, or account association; it sits beside them.
- It does not phone home. No token, API, backend, analytics, or remote code — ever, as a product boundary rather than
  a current limitation.

## Non-goals

Commit editing or composition, authorship verification, account lookup by email, avatars, GitHub Enterprise, other
browsers' stores, PR-timeline/blame/profile surfaces (they do not carry the full commit message), cryptographic
signature verification, DCO enforcement, telemetry, and any shared framework with other extensions.

## The second-order hope

A generic public renderer turns useful custom conventions — such as pairing `Co-authored-via` route context with
`Co-authored-by` — from private habits into proposals anyone can adopt, because the evidence finally shows up where
people read commits.
