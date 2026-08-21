# Decisions

This document owns settled decisions and their rationale so they are not silently re-litigated. Each entry records
what was decided, by whom, and why. Newer entries append at the end; a superseded entry stays with a pointer to its
successor.

## 2026-08-21 — Product name and framing

**Decided:** The product is **Trailer Lens**, repository `Wolfsblvt/trailer-lens`, Chrome Web Store title
"Trailer Lens: Commit Trailers for GitHub". Framing is generic commit-trailer legibility for humans; agent-provenance
trailers are the strongest public specimen, not the brand.

**By:** Wolf (owner), at the Shot 1 checkpoint in `emergency-meeting#96`, over Tala's recommendation drawn from the
founding research. Collision recheck on 2026-08-21: the GitHub slug was free, Chrome Web Store search for
"trailer lens" returned zero results, and the only similarly named repositories are unrelated categories.

## 2026-08-21 — License: AGPL-3.0-or-later

**Decided:** AGPL-3.0-or-later.

**Why:** Wolf's standing license policy maps standalone applications to AGPL-3.0-or-later. The founding research
recommended MIT, arguing AGPL's network clause has no reach for an extension — which is true but only neutralizes the
network clause: the ordinary distribution copyleft still binds redistributed forks to stay open, which is exactly the
value the policy encodes. The extension is fresh code (the private donor is a pattern donor, not a code dependency),
so no compatibility pressure pulls toward MIT. Wolf explicitly asked for the license to be chosen consciously against
his default rather than drifted into; **MIT was considered and not taken**.

**Consequence:** packaged bundles ship readable and non-minified, and the repository at the release tag is the
corresponding source for every distributed package.

## 2026-08-21 — Architecture: research defaults accepted

**Decided:** Manifest V3; TypeScript compiled by a pinned esbuild; static HTML/CSS with no UI framework; a
content-script-only runtime (no service worker); `chrome.storage.local` for settings only; declarative content script
on `https://github.com/*` with route gating in code; zero runtime dependencies; no extension-originated network
request.

**Why:** Accepted defaults from the founding research (see the reference entry below), re-validated against the
current platform on 2026-08-21 before implementation. Alternatives (plain-JS/no-build; API-backed with service
worker) are analyzed in the research §8 and were not taken.

## 2026-08-21 — Supported surfaces: full-message surfaces only

**Decided:** Trailer evidence renders only where the complete canonical commit message is already present in the
page. Commit-detail pages are the required 1.0 surface. The repository history list and PR Commits list join only if
every qualification gate passes (complete message, deterministic commit mapping, collapsed/lazy/long variants,
fixtures, performance, stable anchors, private pages). Reference-only surfaces — issue/PR timelines, profile
activity, blame, release pages — are out: they do not carry the message, and fetching it would require the rejected
token/API architecture.

**By:** Research direction, confirmed at the checkpoint; Wolf's broader "every place attribution shows" hope was
answered in `emergency-meeting#96` with this boundary and the recommendation to keep it.

## 2026-08-21 — Founding research carried byte-exact

**Decided:** The complete founding research report lives in this repository at
`docs/reference/2026-08-21-github-commit-trailer-extension-research.md`, byte-exact from its source coordinate, so its
provenance chain stays verifiable:

```text
source: Wolfsblvt/emergency-meeting@84ad3a879d53cf973a51866539fcead00bde8c9a
path:   references/2026-08-21-github-commit-trailer-extension-research.md
blob:   b5e97f20fdeae06c4bd79e3ee0a48a60a695d92e
SHA-256: 07a66f9954c3b74bb01ecee40c6c76cc0ced24d5b881bae4e620a4555b46f2ca
```

**By:** Wolf, mid-session on 2026-08-21 ("it belongs to this repo now, and is the main source there"), byte-exact per
Tala's recommendation. The report references private rooms; those links are provenance, not required reading for
users. Retiring older copies in other repositories is deliberately left to a session holding that grant.

## 2026-08-21 — Release model

**Decided:** One version source of truth (`package.json` = generated/validated manifest = changelog = tag = package
filename). The v1.0.0 GitHub Release exists as a **draft during development** and is published when the release
candidate is verified complete — it is the official side-load release. The Chrome Web Store release follows its own
schedule against the same immutable package; Store submission and publication remain explicit owner-gated effects.

**By:** Wolf at the checkpoint, replacing the researched "hold for one coordinated launch" option.
