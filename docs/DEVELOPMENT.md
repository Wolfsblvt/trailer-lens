# Development

This document owns the local development workflow: setup, commands, and the verification story. It describes what
exists now and grows with the repository; release mechanics live in `RELEASES.md` once present.

## Setup

- Node.js ≥ 24 (development uses the native TypeScript type-stripping runner; source is erasable-syntax TypeScript).
- `npm install` — all tooling is repository-local and pinned exact; there are **no runtime dependencies**.
- Real Git must be on `PATH` for oracle regeneration (it is a development oracle, never shipped).

## Commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` under strict settings |
| `npm run lint` | ESLint, including the static gates for the no-network and text-nodes-only invariants |
| `npm run test:unit` | Node's built-in test runner over the domain suites (no test framework dependency) |
| `npm run oracle:generate` | Regenerates `tests/trailers/oracle/` from real Git (two channels, see below) |
| `npm run build` | Builds `dist/` as the complete unpacked extension |
| `npm run test:browser` | Playwright browser suites: the real built extension on fixture pages served under github.com URLs via route interception |

`npm test` is the root verification command: typecheck, lint, unit suites, build, and the browser suites in order.

The browser suites launch headless Chromium (Playwright `channel: chromium`) with the unpacked `dist/` extension and
serve authored commit-page fixtures under real `https://github.com/…` URLs through route interception — the shipping
match pattern runs against deterministic local content, and any external request fails the suite. Screenshots and
other run evidence land in `artifacts/test-results/`.

## The Git oracle

The trailer parser's contract is pinned by `tests/trailers/`: each fixture in `fixtures/` has two recorded Git
projections in `oracle/` — `interpret-trailers --parse` and the committed-message `%(trailers:only,unfold)` readback.
The **commit channel is authoritative** (see `DECISIONS.md`); known channel divergences are listed in
`oracle/manifest.json`. Regeneration is deterministic for a given Git version; if a newer Git changes behavior, the
diff shows exactly which fixtures moved, and the change is reviewed before the parser follows it.

Fixture files are byte-exact by design (CRLF cases, whitespace-only lines) and excluded from text normalization via
`.gitattributes`; edit them only with tools that preserve bytes.
