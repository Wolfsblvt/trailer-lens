# Project map

This document owns the repository layout: what lives where and why, so navigation never depends on archaeology. It
describes the current tree truthfully; planned-but-absent structure is not listed.

## Current layout

```text
trailer-lens/
├─ LICENSE                 AGPL-3.0-or-later (canonical text)
├─ README.md               Public product introduction
├─ AGENTS.md               Repository instructions for coworker sessions
├─ package.json            Version source of truth; pinned dev toolchain
├─ tsconfig.json           Strict TypeScript, erasable syntax only
├─ eslint.config.js        Lint incl. static no-network / text-only gates
├─ scripts/
│  ├─ build.mjs             Builds dist/ as the unpacked extension
│  └─ generate-git-oracles.mjs   Two-channel Git oracle regeneration
├─ manifest.json            Authoritative extension manifest (copied to dist/)
├─ _locales/en/             Manifest name/description strings
├─ src/
│  ├─ domain/trailers/     Pure parser core: model, limits, scan, parse,
│  │                       classify, people, pair-coauthor-via
│  ├─ github/              Routes, rendered-text extraction, adapters,
│  │                       reconciliation engine
│  ├─ presentation/        View-model, text-node renderer, panel CSS
│  ├─ settings/            Versioned schema + chrome.storage wrapper
│  ├─ content/             Content-script entry point
│  ├─ options/             Options page (HTML/TS/CSS)
│  └─ strings.ts           Centralized user-visible strings
├─ tests/
│  ├─ trailers/
│  │  ├─ fixtures/         Byte-exact commit-message fixtures
│  │  ├─ oracle/           Recorded Git projections + manifest
│  │  └─ *.test.ts         Parser, pairing, classification suites
│  ├─ settings/            Schema validation suite
│  └─ browser/             Playwright suites, fixture pages, harness
└─ docs/
   ├─ VISION.md            Product promise, audience, refusals, non-goals
   ├─ DECISIONS.md         Settled decisions with rationale
   ├─ PROJECT-MAP.md       This file
   ├─ ARCHITECTURE.md      Runtime architecture and invariants
   ├─ DEVELOPMENT.md       Setup, commands, oracle workflow
   └─ reference/
      └─ 2026-08-21-github-commit-trailer-extension-research.md
                           Founding research report, carried byte-exact
                           (provenance chain in DECISIONS.md)
```

## Placement rules

- Extension source goes to `src/`, split by layer (`domain/`, `github/`, `presentation/`, `settings/`, `content/`,
  `options/`); tests to `tests/`; build/packaging scripts to `scripts/`; icons and Store assets to `assets/`.
- Generated output (packages, test results, coverage) goes to the untracked `/artifacts/` root — never committed.
- Durable documentation lives under `docs/`; byte-exact carried references under `docs/reference/` keep their original
  bytes and are exempt from local documentation conventions.

This map is updated in the same change that adds or moves a top-level surface.
