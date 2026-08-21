# Repository instructions

This file orients any coworker session working in `Wolfsblvt/trailer-lens`. It owns the repository's working
boundaries and conventions; product meaning lives in `docs/VISION.md`, layout in `docs/PROJECT-MAP.md`, and settled
rationale in `docs/DECISIONS.md`.

## What this repository is

The public Chrome extension **Trailer Lens** — source-preserving Git commit-trailer rendering on GitHub commit pages.
Documentation maturity: Level 2 (maintained executable repository). The current workplace room is
[`Wolfsblvt/emergency-meeting#96`](https://github.com/Wolfsblvt/emergency-meeting/issues/96) (private).

## Hard product boundaries

These are settled decisions (see `docs/DECISIONS.md`), not defaults to rediscover:

- **Presentation only.** The extension never mutates native GitHub DOM; it adds and removes only its own sibling roots.
- **No network at runtime.** No GitHub token, REST/GraphQL call, backend, analytics, telemetry, remote asset, or
  remote code. Real Git and the GitHub REST API are development-time oracles only.
- **Evidence, not truth.** Strict Git-like trailers and nearby malformed trailer-shaped lines stay distinguishable;
  nothing is silently repaired, and no trailer is presented as verified.
- **No private content persistence.** Commit messages, SHAs, repository names, and URLs never enter storage or logs.
- **Fail closed.** An adapter that cannot prove route, commit identity, full message, and anchor renders nothing.

## Adoption

Built and configured under current Leitsatz doctrine from creation (repository documentation set, generated-output
home, badge and commit conventions, owner repository defaults applied and read back).

Leitsatz adopted through: e5fd1a42056aaf3cc8c76503a52593ff0dd97174

## Working conventions

- TypeScript, esbuild, zero runtime dependencies; static HTML/CSS; no UI framework. Keep bundles readable.
- Verification: `npm test` is the root command once present; `docs/DEVELOPMENT.md` carries the full command set.
- Build and test outputs go to the untracked `/artifacts/` root (`artifacts/packages/`, `artifacts/test-results/`).
- `Wolfsblvt/github-agent-faces` is a read-only pattern donor. Do not import its product model or create a shared
  framework with it.
- Commits materially authored by a coworker carry the current attribution convention as one contiguous final trailer
  block (`Co-authored-via` line(s) directly above the final `Co-authored-by` line(s), no blank line inside). Do not add
  provider/model default co-author trailers.
