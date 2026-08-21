# Changelog

All notable changes to Trailer Lens. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow semantic intent (patch: fixes and compatibility; minor: user-visible capability; major: incompatible
settings or product contract). Each released version here matches the Git tag, the GitHub release, the package
filename, and the Chrome Web Store version.

## [1.1.0] - 2026-08-21

### Added

- **Device-local trailer memory**, strictly opt-in (off by default): with *Remember trailer evidence on this device*
  enabled, commit pages you visit remember their parsed trailer evidence in Chrome local storage (keyed by repository
  and full commit ID, never a short hash), and blame views, release pages, and PR/issue timeline commit references
  show a compact, clearly-labeled remembered chip on an exact hit. Nothing is synced or transmitted; entries are
  capped at 1500 entries and 3 MB total with deterministic oldest-first eviction; the settings page shows entry/size
  stats and offers
  per-repository and complete purge (two-step). Turning the toggle off stops remembering and showing immediately;
  data stays until purged. Links inside comments, short hashes, and unknown commits never receive a chip.
- Settings schema v2 with lossless migration from v1 (the new field defaults to off). Saving through this version
  preserves any newer-version settings envelope (a Store-rollback scenario) instead of overwriting future fields.
- Every qualified occurrence of a remembered commit gets its own chip (the same commit referenced in several rows
  chips each row); purges and evidence learned in another tab reconcile already-open reference pages immediately;
  malformed stored entries are deeply validated and behave as misses instead of erroring or leaving stale chips.

## [1.0.0] - 2026-08-21

First release.

### Added

- Trailer panel on GitHub commit pages (`github.com/<owner>/<repo>/commit/<sha>`), public and private: friendly rows
  for common keys, unknown keys visible by default, repeated keys and source order preserved, exact raw block with
  copy action.
- Strict Git-modeled trailer parsing pinned to Git's committed-message behavior by a 45-fixture two-channel oracle
  corpus, with hard input bounds.
- Nearby-malformed evidence: trailer-shaped lines separated from the final block (including invisible whitespace-only
  separators) are shown as exactly that, with plain-language diagnostics.
- Conservative `Co-authored-via` route-context pairing with `Co-authored-by` under a unique join-key rule.
- Settings with live propagation to open tabs: enable, detail density, diagnostics, unknown keys, hidden keys; options
  page with a live preview, two-step reset, and a blunt privacy explanation.
- Light, dark, dark-dimmed, and forced-colors support; keyboard operation; screen-reader semantics.
- Privacy boundary enforced in code and tests: no network requests, no storage or logging of page content.
