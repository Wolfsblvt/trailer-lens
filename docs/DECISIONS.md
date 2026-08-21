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
content-script-only runtime (no service worker); `chrome.storage.local` for settings (and, since 1.1, opt-in memory
records); declarative content script
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

## 2026-08-21 — Parser contract: Git's committed-message channel is authoritative

**Decided:** The strict parser models what Git reports for **committed** messages (`%(trailers:only,unfold)`), pinned
by a two-channel oracle corpus that also records `git interpret-trailers --parse` for every fixture.

**Why:** Trailer Lens reads committed messages from rendered pages, and direct oracle evidence (Git 2.55.0,
2026-08-21) showed the channels genuinely differ: committed-message parsing honors **no `---` patch divider**
(`---` is ordinary content — squash separators like `---------` never were dividers in either channel), and a message
whose first content is the trailer paragraph yields nothing even when preceded by a blank line. The founding research
assumed divider handling from the `interpret-trailers` input channel; the two-channel oracle disproved that for the
runtime-relevant channel, so the parser follows the commit channel and the corpus records the divergences by name.

**Documented portable-default limitations** (unchanged from the research): repository-local configuration — custom
separators, `trailer.<token>.key` aliases, a non-default `core.commentChar` — cannot be known from a rendered page and
is not modeled. Default `#` comment lines are invisible to trailer parsing even in committed messages (oracle-pinned).

## 2026-08-21 — 1.1: device-local trailer memory, strictly opt-in

**Decided:** Version 1.1.0 adds *Remember trailer evidence on this device* — disabled by default, enabled only
through an explicit options-page action. With it on, qualified commit-detail pages remember their **parsed evidence
envelope** (never the whole message) in `chrome.storage.local`, and reference-only surfaces show a compact
"remembered on this device" chip on an exact cache hit. The product contract was accepted in the founding workplace
and carried in this repository's issue #2; nothing here reopens it.

**Key discipline:** entries are keyed by host + exact `owner/repo` + **full 40-char commit OID**, and identity always
comes from the reference link's own href — a cross-repository link keys to its own repository, a short display hash
never becomes a key, and derived-file routes (`.patch`/`.diff`) are not identities. A full OID content-addresses
immutable commit bytes; freshness concerns are retention and parser-schema evolution, not mutable-SHA folklore.

**Admitted reference surfaces** (each gate-qualified live on 2026-08-21): blame views, release pages, and PR/issue
timeline commit references — all expose full-OID hrefs. **Excluded with the exact failing gate:** links inside
comment/markdown bodies (arbitrary user prose is not a stable attributable evidence anchor, and decorating people's
comments is invasive); short-hash autolinks (no full OID); hovercards (transient unowned positioning); commit-list
surfaces (they carry the full message, so remembered evidence adds nothing there).

**Retention, measured and enforced:** serialized envelopes run ~0.5–2 KB for ordinary blocks and ~13 KB at the
parser's 64-entry cap; a single entry above 32 KB (UTF-8 bytes) is not stored. Two bounds are enforced together: at
most 1500 entries **and** at most 3 MB total serialized bytes (keys + values) — the byte budget governs long before
the count cap when entries are rich, keeping memory well under the 10 MB `chrome.storage.local` quota, so
`unlimitedStorage` is not requested. Eviction is deterministic and runs before the write: oldest `storedAt` first,
key order as tiebreak (count-triggered eviction removes an extra batch of 100 as hysteresis); a quota failure that
still occurs evicts one batch and retries once instead of pretending the entry was retained. Settings and memory are
separately owned storage records; purge (per-repository and complete) never touches settings and works regardless of
the enable state.

**Disable semantics (the documented honest choice):** turning memory off stops learning and stops rendering
immediately, but retains stored evidence until purged — the options page says exactly that beside the toggle.

**Learning source:** only the commit-detail adapter — the one surface qualified to carry the complete message. List
payloads are not promoted merely because they looked promising.

## 2026-08-21 — Release model

**Decided:** One version source of truth (`package.json` = generated/validated manifest = changelog = tag = package
filename). The v1.0.0 GitHub Release exists as a **draft during development** and is published when the release
candidate is verified complete — it is the official side-load release. The Chrome Web Store release follows its own
schedule against the same immutable package; Store submission and publication remain explicit owner-gated effects.

**By:** Wolf at the checkpoint, replacing the researched "hold for one coordinated launch" option.
