# Changelog

All notable changes to Trailer Lens. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow semantic intent (patch: fixes and compatibility; minor: user-visible capability; major: incompatible
settings or product contract). Each released version here matches the Git tag, the GitHub release, the package
filename, and the Chrome Web Store version.

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
