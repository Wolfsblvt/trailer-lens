# Architecture

This document owns the runtime architecture and its invariants: the layers, the data flow, and the rules that keep
the extension safe on a page it does not control. It describes the settled design being implemented; where a seam is
still qualification-gated, that is stated. Rationale for why this shape was chosen lives in `DECISIONS.md` and the
founding research under `docs/reference/`.

## Runtime shape

One declarative content script on `https://github.com/*`, injected at `document_idle`, plus an options page. No
service worker, no background page, no runtime dependencies, no network access. Settings live in
`chrome.storage.local` as one small versioned object; with device-local memory explicitly enabled, remembered
trailer evidence lives beside them as separately-owned `tlm:` records (see `src/memory/`).

```text
GitHub page DOM
   │  (read only)
   ▼
github/ adapters ──► domain/ parser ──► presentation/ renderer
   ▲                                         │
   │                                         ▼ (owned sibling root only)
navigation + reconciliation ◄──────── settings (chrome.storage.local)
```

## Layers

- **`domain/trailers`** — pure, immutable, DOM-free. Scans a commit-message string for the strict final trailer block
  (modeled on documented default `git interpret-trailers` behavior, backed by committed oracle fixtures from real
  Git), plus conservatively bounded nearby trailer-shaped candidates with diagnostics. Preserves raw lines, ranges,
  source order, repeated keys, casing, separator spacing, and continuations. Classifies known keys and parses
  person-shaped values; pairs `Co-authored-via` with `Co-authored-by` only under the unique join-key rule.
- **`github/`** — routes, navigation handling, reconciliation, and per-surface adapters. All selector knowledge lives
  here. An adapter must prove route, commit identity, complete message, and insertion anchor, or return nothing.
- **`presentation/`** — renders one extension-owned sibling panel per qualified commit unit, from text nodes only.
  Friendly rows with exact keys available, diagnostics in plain language, raw block disclosure, copy action, themes.
- **`settings/`** — schema, validation, and version-by-version migrations for the stored settings object.
- **`content/`** — the entry point wiring observer, navigation events, storage changes, and the reconciliation loop.
- **`options/`** — static options page using the same settings module.

## Invariants

1. **Native DOM is never mutated.** The extension adds and removes only elements carrying its ownership marker; the
   native commit subtree must remain structurally and textually unchanged (tested, not aspired).
2. **Fail closed.** Uncertain route, unit, message source, anchor, or ownership renders nothing and removes any stale
   owned root.
3. **Untrusted text stays text.** Commit content is rendered via text nodes; no `innerHTML`, no linkification of
   arbitrary values.
4. **No silent persistence of page content.** By default, parsed evidence lives only while its DOM unit is
   connected and storage holds settings only. With device-local memory explicitly enabled (off by default), parsed
   trailer evidence — never whole messages — is additionally stored in bounded, purgeable `tlm:` records on this
   device only.
5. **Idempotency.** Reconciliation keys each owned root by commit identity, message hash, adapter version, and
   settings signature; an unchanged unit is a no-op, and duplicate roots cannot accumulate.
6. **Bounded work.** Hard limits on scanned tail size, entries, continuation depth, and units per batch; over-limit
   messages fail closed rather than freezing the tab.

## Navigation and reconciliation

GitHub navigates softly (React router / Turbo) and replaces rendered subtrees without page loads. The content script
observes `document.documentElement` (childList + subtree), batches mutations per animation frame, treats
`location.href` comparison during each flush as the authority (navigation events are accelerators only), ignores
mutations inside owned roots, and re-discovers qualified units on each flush. Route gating short-circuits everything
outside repository routes that can contain qualified surfaces.

## Surfaces and message extraction

The current GitHub commit page is a React `commits` app: the server HTML carries an embedded JSON payload
(`react-app.embeddedData` → `payload.commitRoute.commit`) with `oid` and `bodyMessageHtml`, and the client renders the
message into the page. Qualification on 2026-08-21 established that `bodyMessageHtml` is the exact raw body,
HTML-escaped, with GitHub linkification applied (github.com URLs may render shortened display text while the `href`
preserves the target; emails are never linkified). Extraction therefore decodes rendered content back to text with an
explicit policy for anchors, and marks values that contained rendered links. Because the embedded payload describes
the server-rendered page rather than later soft navigations, the rendered DOM is the primary extraction source; exact
selectors and the anchor policy are recorded here and in fixtures as they are qualified.

Surface dispositions live in `DECISIONS.md` (full-message surfaces only); each shipped adapter has committed
sanitized fixtures and a live qualification path.
