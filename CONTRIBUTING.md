# Contributing

This document says how to work on Trailer Lens and what a contribution needs to respect. The project is maintained by
one person; issues and pull requests are welcome, response times are best-effort.

## Setup

- Node.js ≥ 24 and Git on `PATH`.
- `npm install` (all tooling is pinned and repository-local; there are zero runtime dependencies).
- `npm test` runs everything: typecheck, lint, unit suites, build, browser suites (headless Chromium via Playwright,
  first run downloads the browser with `npx playwright install chromium`), packaging, package verification, and the
  packaged smoke. `docs/DEVELOPMENT.md` has the full command table.

## What a change must preserve

These are product invariants, not style preferences (see `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`):

- **No network, ever.** The runtime makes no requests; lint and tests enforce it.
- **Native DOM is never modified.** Only extension-owned sibling elements are added or removed.
- **Untrusted text stays text.** Commit content renders through text nodes; no HTML, no linkification.
- **Evidence stays honest.** Strict trailers and nearby malformed lines stay distinguishable; nothing is repaired.
- **Parser follows Git's committed-message behavior**, pinned by the two-channel oracle corpus. A parser change must
  come with fixtures and oracle evidence, not just intent.
- **Nothing from page content is stored or logged.**

## Practical notes

- Selector knowledge lives only in `src/github/adapters/`. If GitHub changed its DOM, fix the adapter and add a
  sanitized fixture reproducing the new shape.
- New trailer keys for the friendly dictionary go in `src/domain/trailers/classify.ts` with a test; unknown keys
  already render fine, so a dictionary entry needs a real ecosystem behind it.
- User-visible strings live in `src/strings.ts`.
- Keep pull requests focused; `npm test` must pass from a clean clone.
- By contributing you agree your contribution is licensed under AGPL-3.0-or-later like the rest of the project.
