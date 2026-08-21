# Trailer Lens: making Git commit trailers legible on GitHub Web

## Meaning

This is the durable, source-backed research return for
[`Wolfsblvt/emergency-meeting#96`](https://github.com/Wolfsblvt/emergency-meeting/issues/96).
It records the current product opportunity, Git trailer interpretation model, GitHub Web surface
findings, donor comparison, recommended first-release architecture, privacy and Store boundaries,
test strategy, release route, and implementation handoff. Use it to prepare the planned owner
taste round and the subsequent build-to-publication-candidate task; do not treat it as a grant to
publish, create credentials, mutate Store state, or replace the commit message as canonical truth.

The research evaluated the exact accepted donor pin
`Wolfsblvt/github-agent-faces@0d6f20f5a5feaaac6ff86a6752a3d252986dddaa` and preserves its
claims at the source coordinates stated below. At durable carry time on 2026-08-21,
`Wolfsblvt/emergency-meeting/main` had moved to
`f48a2d9cfc10bf17e4e1b76dc48009f4b604c568`, and
`Wolfsblvt/github-agent-faces/main` had moved to
`dafb9717cab462f15c81627b4a3788b9d3df0a3e`. Those later heads were not silently folded into the
completed research. The implementation worker must re-resolve them, inspect material deltas, and
record any consequence before building.

**Research report and implementation handoff**  
**Research completed:** 2026-08-20, Europe/Berlin  
**Durably carried:** 2026-08-21, Europe/Berlin  
**Status:** Decision-ready research. The research phase itself was read-only; this file is its
explicit repository preservation under Wolf's instruction.

## Executive finding

Build it.

The product opportunity is real, but the durable product is not “show which AI wrote this commit.” It is **make the commit’s own trailer evidence readable on GitHub Web without replacing Git as the record**.

That framing survives the fashionable part of the originating use case. It helps with ordinary `Co-authored-by`, `Signed-off-by`, `Reviewed-by`, `Tested-by`, `Reported-by`, `Change-Id`, reference trailers, and legitimate repository-specific keys. It also handles Wolf’s richer `Co-authored-via` convention without pretending that convention is universal.

The decisive evidence is the separation between three layers:

1. **Stored commit message.** The raw message contains the supplied names, values, order, whitespace, and malformed controls.
2. **Git’s trailer interpretation.** Git recognizes a final trailer block under specific structural rules. A blank line inside the intended block can silently remove an earlier line from the parsed trailer set.
3. **Client presentation.** GitHub Web, GitHub Desktop, APIs, and other clients can expose different projections of the same commit.

The provenance canary demonstrates the problem cleanly. A malformed commit with a blank line between `Co-authored-via` and `Co-authored-by` still looks normally co-authored on GitHub Web, while Git drops the route line from its parsed trailer set. GitHub Desktop, meanwhile, preserves a supplied coworker name that GitHub Web replaces with the associated collective account login. Nothing is wrong with the commit object; the clients are choosing different summaries of it. That is precisely where a source-preserving reader extension earns its keep.

### Recommended coherent direction

| Decision | Recommendation |
| --- | --- |
| Product promise | **Show the trailer evidence already present in the commit, clearly and honestly.** Never determine, rewrite, or “correct” authorship. |
| Public framing | Generic Git commit-trailer legibility. Agent provenance is a strong specimen, not the brand. |
| Working name | **Trailer Lens**. Store title: **Trailer Lens: Commit Trailers for GitHub**. Preliminary collision search only, not legal clearance. |
| First supported surface | Standalone GitHub commit-detail pages, including commit pages reached from repositories and pull requests. |
| Conditional surfaces | Repository history and PR Commits lists only if implementation-time qualification proves the full canonical message is already present in the page DOM. |
| Parser | Small repository-owned parser modeled on documented default `git interpret-trailers` behavior, backed by oracle fixtures from real Git. No runtime parser dependency. |
| Interpretation | Two layers: a strict final trailer block and explicitly labeled trailer-shaped evidence outside that block. Unknown and malformed input remains visible and distinguishable. |
| UX | A compact, extension-owned panel directly below the native commit message. Friendly rows, exact raw disclosure, copy actions, diagnostics, source order preserved. |
| `Co-authored-via` | A key-specific optional enhancer. Pair with `Co-authored-by` only when the repeated identity join key makes the relation unique and both lines belong to the same valid block. Otherwise render separately. |
| Accounts and avatars | No API lookup, token, avatar fetch, or inferred account mapping in 1.0. Leave GitHub’s native account presentation intact beside the exact trailer evidence. |
| Runtime architecture | Manifest V3, TypeScript, a tiny deterministic build, content-script-only runtime, no service worker, no backend, no runtime dependencies. |
| Permissions | `storage` plus a declarative content script on `https://github.com/*`, gated by route and adapters in code. No GitHub token, no `host_permissions` block, no remote service. |
| Settings | Enabled, density, diagnostics, unknown-key visibility, and hidden keys. No identity database, repository allowlist, colors, avatar uploads, or pairing DSL. |
| Privacy | Commit messages processed transiently in the page; never stored, logged, or transmitted. Settings only in `chrome.storage.local`. No analytics or telemetry by default. |
| License | MIT. MPL-2.0 is the credible reciprocal alternative if Wolf deliberately wants modified files kept open. |
| Release | Deterministic ZIP and GitHub release assets; Chrome Web Store API v2 for an existing item; service-account auth preferably through GitHub OIDC and Google Workload Identity Federation; staged publication with one explicit human gate. |

The narrowness is deliberate. A trustworthy renderer on the one surface that exposes the full evidence is a product. A renderer sprayed across every place a commit SHA appears, reconstructing missing messages through APIs and tokens, is a maintenance subscription disguised as ambition.

---

## 1. Research method, coordinates, and claim labels

### 1.1 Claim labels used in this report

- **Documented** means a current primary source states the behavior or contract.
- **Observed** means the behavior was directly measured in the supplied repositories, donor implementation, or local experiments.
- **Inference** means the conclusion follows from documented or observed evidence but is not itself a platform guarantee.
- **Recommendation** is product or engineering judgment.
- **Unverified** marks a seam that implementation must qualify rather than quietly assume.

### 1.2 Mutable repository coordinates

The connected GitHub source was used for Wolf’s private material.

| Source | Coordinate used | Mutable-head note |
| --- | --- | --- |
| Product room | [`Wolfsblvt/emergency-meeting#96`][room-96] read completely | Repository default branch `main` was `9e5bb1ee75fd0458e7ae8f5e9f15dac2008db988` on 2026-08-20. |
| Provenance room | [`Wolfsblvt/emergency-meeting#88`][room-88] read completely | Same repository coordinate above. Canary commits are referenced individually below. |
| Donor-adoption room | [`Wolfsblvt/emergency-meeting#104`][room-104] read completely | Closed as complete. |
| Donor repository | [`Wolfsblvt/github-agent-faces@0d6f20f5a5feaaac6ff86a6752a3d252986dddaa`][donor-commit] | The default branch later moved to `831c07ea598e0a20463f1dc162f2b06eb90cef35`; this report evaluates the exact accepted donor pin, not later mutable truth. |
| Git implementation | [`git/git@1a3e64c6c4a623626ff0687008732a8e007e2a1c`][git-source] | Current `master` coordinate resolved on 2026-08-20. |
| Refined GitHub specimen | [`refined-github/refined-github@cc22fe3434b082a982da1efcfbd4f14b4518c747`][refined-github] | Current `main` coordinate resolved on 2026-08-20. |

The operative Nyxara profile was loaded from the exact requested `wolf-leitsatz` coordinate before the work began.

### 1.3 Direct experiments

Local `git interpret-trailers --parse` experiments were run with Git `2.47.3`. The result corpus is preserved in Appendix A. Those results were cross-checked against current Git documentation and the current pinned Git source above.

The local browser toolchain available during research included Chromium `144.0.7559.96` and Node `22.16.0`. The donor’s own final verification used its repository-owned unit, DOM-fixture, and live-GitHub smoke suites.

### 1.4 Important limitation

This research did **not** obtain a fresh, authenticated raw HTML capture for every current GitHub surface. The private canary record and screenshots directly qualify the standalone GitHub Web commit view. Official documentation confirms the other named surfaces exist, but full canonical-message availability in each live DOM remains an implementation qualification task.

The donor’s committed screenshot inventory and README before/after references were inspected, together with the exact options HTML, JavaScript, and CSS. The connected GitHub text interface exposed repository image binaries only as truncated base64, so this report makes no pixel-specific claim about those files; its visual-language conclusions come from the shipped UI source and the screenshot context/alt text.

That limitation is intentional rather than hand-waved away. The implementation must not promise a surface until an adapter can prove it has the complete commit message without a token or background fetch.

---

## 2. The actual problem: stored record, parsed structure, rendered summary

### 2.1 The originating specimen

The selected coworker convention stores two different facts:

```text
Co-authored-via: Juno | Claude Code | Opus 5 | Max
Co-authored-by: Juno <juno@agents.wolfsblvt.com>
```

`Co-authored-by` states a contribution relationship. `Co-authored-via` records route and execution context. The repeated `Juno` is a deliberate join key, especially when a squash contains several coworkers.

The convention requires every route and co-author line to remain in one final contiguous block. This is not typographic fussiness. Git treats the final contiguous block specially, and malformed separation fails silently.

### 2.2 What the canary proved

The room’s four controlled commits separate Git parsing from GitHub Web rendering:

| Commit | Case | Git parsed `via` | Git parsed `by` | GitHub Web summary observed |
| --- | --- | ---: | ---: | --- |
| [`9365a14`][canary-linked] | Linked alias, one named identity | Yes | Yes | Wolf plus the linked collective account login |
| [`742d85a`][canary-unlinked] | Deliberately unlinked alias | Yes | Yes | Wolf plus the supplied inert display name |
| [`4f8f372`][canary-multi] | Two named identities, both linked to one collective account | Both | Both | The collective account appears once, singular |
| [`e74b94a`][canary-malformed] | One blank line between route and co-author | **No** | Yes | Indistinguishable from the valid one-identity summary |

**Observed:** GitHub Web’s summary can therefore look healthy while a meaningful line is outside Git’s parsed trailer block.

**Observed:** The REST commit payload used in the canary contains ordinary author, committer, verification, and the raw message. It does not contain a general co-author or arbitrary-trailer structure. The coworker alias occurs in the message text.

**Observed:** GitHub Desktop presents the supplied named coworker and links its hover target to the associated collective account. GitHub Web substitutes the account login in the summary. The display difference is client-specific, not a loss from the stored commit.

### 2.3 Why native GitHub is not “wrong”

GitHub’s native co-author presentation is optimized for account association and contribution credit. That is useful. It is simply not a generic trailer inspector.

The extension should not replace that native presentation or declare it defective. It should add the missing layer:

> **Here is the exact structured evidence the commit message contains, here is the subset Git would recognize as its final trailer block, and here are any nearby trailer-shaped lines that fall outside it.**

That is a narrower and much more defensible promise than “show the real authors.” Commit trailers are declarations made by whoever created the commit. They are evidence in the commit, not independent proof that the named person acted, consented, reviewed, tested, signed, or owns a GitHub account.

### 2.4 Product opportunity

The opportunity remains useful even if GitHub improves co-author rendering tomorrow because the extension’s distinctive value is broader:

- repeated and custom trailer keys;
- exact supplied names and values;
- route/context kept distinct from contribution;
- raw and copyable evidence;
- malformed-block visibility;
- generic handling of unknown keys;
- no token or backend;
- private repositories from pages the user already has permission to view.

The product should therefore be positioned as **commit-trailer legibility**, not as an AI-attribution patch and not as a replacement for GitHub’s contribution graph.

---

## 3. What GitHub exposes, surface by surface

The table separates what is qualified now from what must be proven during implementation.

| Surface | Current evidence | Canonical message confidence | 1.0 disposition |
| --- | --- | --- | --- |
| Standalone repository commit page, `/owner/repo/commit/<sha>` | Direct private canaries; native co-author and signature presentation documented; donor proves resilient GitHub DOM content scripts are feasible | **High** for the exercised shape | **Required P0** |
| Commit page reached from a PR’s Commits tab | Normally resolves to the repository commit-detail route | High by route identity, still test query/feature variants | **Required when same adapter qualifies** |
| Repository commit/history list | Surface exists; GitHub may show title, collapsed body, or lazy detail depending on current UI | **Unverified** for complete raw message in DOM | Include only after qualification gate |
| PR Commits list | Surface exists and may expose expandable messages | **Unverified** for every commit and layout | Include only after qualification gate |
| Compare view | Multi-commit surface with summaries | **Unverified**; likely more DOM churn and repeated units | Later or qualification-gated |
| PR conversation timeline and merge events | Often references a commit without presenting its full message | Low | Explicitly exclude in 1.0 |
| Blame and file-history views | Useful commit links and summaries, not a generic full-message surface | Low | Exclude; link users to commit detail rather than reconstructing |
| User activity, contribution graph, profile, notifications | Not commit-message inspection surfaces | None | Exclude |
| GitHub Enterprise Server/custom domains | Different versions, selectors, and release cadences | Unqualified | Exclude from 1.0; keep adapters host-neutral enough for later work |

### 3.1 Ordinary, squash, merge, and multiple-co-author commits

At the commit-object level, an ordinary commit, squash result, and merge commit each have a message that can end in trailer-like material. The parser should not care how the commit was created.

The adapter and fixture corpus **must** care because GitHub can render merge commits, signed commits, long messages, and multiple co-authors differently. Qualification should include:

- ordinary one-line and long-body commits;
- squash commits carrying one and multiple co-authors;
- merge commits with and without a custom body;
- repeated keys and mixed known/custom keys;
- signed, partially verified, and unverified native states;
- public and private repositories;
- feature-flagged or legacy/current DOM variants seen during the build.

GitHub’s cryptographic signature state must remain native and visually separate. A `Signed-off-by` trailer is not a GitHub “Verified” signature and must never borrow that wording or badge.

### 3.2 Public and private repositories

A declarative content script receives the DOM of the page the signed-in browser already rendered. It does not need a GitHub token to read that DOM.

That is the correct v1 private-repository path:

- no OAuth application;
- no broad repository scope;
- no GitHub REST or GraphQL request;
- no copying private messages into extension storage;
- no external error service receiving selectors or content;
- no difference in the product promise between public and private pages.

Private pages still require a dedicated release-candidate qualification because GitHub can vary markup by permissions and account features. The qualification is a compatibility test, not an authorization mechanism.

### 3.3 Narrow layouts and “mobile-ish” views

Chrome on Android does not provide the target extension environment. “Mobile-ish” in this project should mean a narrow desktop Chromium viewport, browser zoom, side-by-side windows, and responsive GitHub layouts.

The panel must stack labels and values, allow long hashes and emails to wrap or scroll without clipping, keep copy/disclosure controls reachable, and avoid fixed widths. No feature should depend on hover.

### 3.4 Soft navigation and DOM replacement

GitHub performs in-document navigation and replaces rendered units without a full page load. The donor directly encountered current React and legacy layouts, lazy insertion, edit-mode detachment, and reattachment.

The extension therefore needs all of the following:

- broad GitHub document injection with route gating in code;
- URL checks as the authority, not one event name;
- a batched `MutationObserver`;
- lightweight listeners for current navigation events such as Turbo/PJAX/popstate as accelerators;
- per-surface adapters that fail closed;
- owned DOM markers and stable signatures;
- immediate removal of stale extension roots;
- no observer loop when the extension renders its own panel.

This is maintenance reality, not architecture theater. GitHub will rearrange the furniture. The job is to confine the breakage to adapters and leave the native page untouched when confidence disappears.

## 4. Trailer semantics: structure before footer-shaped vibes

### 4.1 What Git documents

Git’s [`git interpret-trailers`][git-interpret] treats trailers as RFC 822-like lines near the end of a commit message. Under the documented default shape:

- a trailer has a token, a separator, and a value;
- `:` is the default separator for input;
- a valid key uses alphanumeric characters and hyphens, with no leading or internal whitespace;
- spaces or tabs may appear between the key and separator;
- a value may be empty;
- a continuation line begins with whitespace and belongs to the previous trailer;
- repeated keys are allowed and order is significant evidence;
- key casing is preserved even though key comparisons are commonly case-insensitive;
- a patch-divider line such as `---` limits where the message ends for trailer purposes;
- `--parse` emits only the recognized trailer block and unfolds continuation lines;
- pretty formats such as `%(trailers)` use the same trailer machinery.

The final candidate group is not merely “every line with a colon.” Git accepts a group when all relevant lines are trailer-shaped, or under a mixed-content heuristic when a recognized/generated/configured trailer is present and at least roughly one quarter of the lines are trailers. The [current pinned Git source][git-source] includes `Signed-off-by: ` and `(cherry picked from commit ` as generated prefixes. Repository or user configuration can define other recognized tokens and separators.

That last point matters: a browser extension cannot reproduce arbitrary local Git configuration from a rendered GitHub page. It must model a clear portable contract and expose uncertainty rather than pretending to possess someone’s `.gitconfig` by telepathy.

### 4.2 Direct experiment results

The local oracle experiments produced the following material results:

| Input shape | `git interpret-trailers --parse` result |
| --- | --- |
| Blank line before a normal final `Reviewed-by` / `Tested-by` block | Both parsed |
| No blank line between subject/body and `Reviewed-by` | Nothing parsed |
| Blank line between `Co-authored-via` and final `Co-authored-by` | Only `Co-authored-by` parsed |
| Unknown `Co-authored-via` plus three ordinary prose lines | Nothing parsed |
| `Signed-off-by` plus three ordinary prose lines | `Signed-off-by` parsed under the recognized-prefix heuristic |
| `Reviewed-by=...` with default configuration | Nothing parsed |
| Whitespace-prefixed key | Not parsed |
| Internal space in key | Not parsed |
| Spaces before `:` or a tab after `:` | Parsed |
| Empty value | Parsed |
| Hyphenated key | Parsed |
| Underscore, dotted, or Unicode key in the tested Git version | Not parsed |
| Continuation lines | Parsed and unfolded with spaces |
| Repeated keys with varied casing | Preserved in source order and source casing |
| `---` followed by footer-shaped patch text | Only the block before `---` parsed |
| Two final prose lines shaped like `Thing: value` | Both parsed |

The last row is the necessary slap on the wrist: **syntactic trailer status does not prove semantic intent**. If a commit author ends a message with two footer-shaped prose lines, Git can parse them as trailers. The extension should report that fact without upgrading it into a claim about what happened in the world.

### 4.3 A practical browser interpretation model

The recommended parser exposes two related but distinct products:

#### A. Strict final trailer block

This is the best portable approximation of default Git behavior from a commit message alone.

1. Normalize line endings for parsing while preserving the original raw string and raw line slices.
2. Ignore material after the applicable `---` divider.
3. Work backward from the message end, ignoring trailing blank lines and default comment lines where appropriate.
4. Identify the final contiguous candidate paragraph.
5. Parse entries with a conservative default-key grammar and `:` separator.
6. Attach whitespace-leading continuation lines to the preceding entry.
7. Accept the block when every substantive candidate line belongs to a trailer entry, or when the documented mixed-group rule is satisfied by a built-in recognized prefix the browser can know.
8. Preserve exact key casing, raw value, raw lines, source range, repeated entries, and source order.
9. Expose an unfolded value separately for friendly presentation.

The parser must **not** silently assume user-defined separators, custom `trailer.<name>.key` configuration, or a non-default comment character.

#### B. Nearby trailer-shaped evidence

After finding the strict block, inspect only the immediately preceding bounded paragraph for trailer-shaped lines. This is specifically useful for the lived malformed case:

```text
Co-authored-via: Juno | Claude Code | Opus 5 | Max

Co-authored-by: Juno <juno@agents.wolfsblvt.com>
```

The route line should appear as:

> Trailer-shaped line outside Git’s final trailer block. Preserved from the commit message; not grouped or paired automatically.

This diagnostic layer must be conservative:

- do not scan the entire body for every colon;
- do not move the line into the valid block;
- do not silently repair whitespace;
- do not pair it with a later co-author;
- do not call it invalid Git text, because it remains valid commit-message text;
- do not hide the strict block when the diagnostic is present.

A bounded previous-paragraph inspection catches the important blank-line failure without turning release-note prose into a cockpit full of warnings.

### 4.4 Data model

A useful immutable domain model is:

```ts
export interface TrailerEvidence {
  rawMessage: string;
  strictBlock: TrailerBlock | null;
  nearbyCandidates: TrailerCandidate[];
  diagnostics: TrailerDiagnostic[];
}

export interface TrailerBlock {
  rawText: string;
  startLine: number;
  endLine: number;
  entries: readonly TrailerEntry[];
  recognition: 'all-trailer-lines' | 'recognized-prefix-mixed';
}

export interface TrailerEntry {
  rawKey: string;
  normalizedKey: string;
  rawValue: string;
  unfoldedValue: string;
  rawLines: readonly string[];
  startLine: number;
  endLine: number;
  kind: TrailerKind;
}

export type TrailerKind =
  | 'contribution'
  | 'attestation'
  | 'review'
  | 'test'
  | 'report'
  | 'reference'
  | 'route-context'
  | 'change-id'
  | 'unknown';
```

`kind` is a display hint, not a truth level. The exact key remains visible and is the authoritative label.

### 4.5 Known conventions and careful UI treatment

The product does not need an ontology doctorate. It needs a small, reviewed dictionary of common keys whose friendly presentation adds real value.

| Key or family | Typical ecosystem meaning | Safe 1.0 treatment |
| --- | --- | --- |
| `Co-authored-by` | Commit declares another material author | Friendly “Co-authored by” label; parse `Name <email>` conservatively; hide email in compact view, reveal raw value in detail |
| `Co-developed-by` | Linux-style declaration of substantial co-development, normally paired with that person’s sign-off | Keep distinct from `Co-authored-by`; never invent the required associated sign-off if absent |
| `Signed-off-by` | Developer Certificate of Origin-style sign-off or project-specific sign-off | Friendly label with explicit tooltip that this is a commit trailer, not a cryptographic signature |
| `Reviewed-by` | Project-specific review declaration; in Linux it carries a strong meaning | “Reviewed by” as declared evidence; no verified badge |
| `Acked-by` | Acknowledgement under project-specific rules | Exact friendly label; no stronger inference |
| `Tested-by` | Test declaration under project-specific rules | Exact friendly label; no claim about test scope |
| `Reported-by` | Source of a report | Exact friendly label |
| `Helped-by`, `Mentored-by`, `Suggested-by` | Contribution context | Exact friendly labels, kept distinct from authorship |
| `Fixes`, `Closes`, `Resolves`, `Refs` | References or issue relationships, semantics vary | Generic reference presentation; do not implement issue-closing semantics or auto-linking in 1.0 |
| `Change-Id` | Gerrit change identity | Monospace value; no GitHub-account interpretation |
| `Link` | External or project reference | Show exact value; do not make arbitrary schemes clickable |
| `Co-authored-via` | Wolf’s custom route/context declaration | Key-specific enhancer described below; never promoted to an author |
| Session/run/build/context keys | Tool- or team-specific metadata | Generic exact key and value |
| Unknown valid key | Arbitrary legitimate metadata | Visible by default, exact key, source order, raw access |

[Git’s own patch guidance][git-submitting] lists several of the people-oriented conventions, while the [Linux patch process][linux-posting] and [Gerrit `Change-Id` documentation][gerrit-change-id] demonstrate why key semantics belong to ecosystems rather than a universal browser taxonomy. The extension should use friendly words to improve scanning, then defer to the raw line for exact meaning.

### 4.6 Person-shaped values

A conservative person-value parser may recognize:

```text
Display Name <email@example.com>
```

Only use that parser for a reviewed set of people-oriented keys. It should return the original value unchanged when the grammar is not an exact match.

Compact rendering can show the display name and place the email in expanded detail. This keeps the panel readable and avoids making an already-public commit email unnecessarily prominent. The raw value and copy action remain available.

Do not:

- query GitHub by email;
- hash the email for avatar services;
- generate a `mailto:` link by default;
- assume a no-reply address identifies a particular account;
- equate a matching GitHub profile with consent or authorship truth.

### 4.7 `Co-authored-via` pairing without mythology

`Co-authored-via` is not a Git standard. It is a useful custom convention whose first pipe-delimited segment repeats the identity name:

```text
Co-authored-via: Tala | Claude Code | Fable 5 | High
Co-authored-via: Juno | Claude Code | Opus 5 | Max
Co-authored-by: Tala <tala@agents.wolfsblvt.com>
Co-authored-by: Juno <juno@agents.wolfsblvt.com>
```

A safe built-in enhancer can pair these in the **friendly summary** when all of the following hold:

1. Both entries belong to the same strict final trailer block.
2. The route value contains a non-empty first pipe-delimited segment.
3. The co-author value parses exactly as `Name <email>`.
4. The normalized route identity and co-author name match under a documented conservative comparison.
5. Each identity is unique on both sides; there is no duplicate or many-to-one ambiguity.
6. No candidate used for the relation carries a malformed-block diagnostic.

When those conditions hold, render:

```text
Co-authored by  Juno
via             Claude Code · Opus 5 · Max
```

The raw disclosure still shows the original source order and exact lines. The UI must not imply that Git itself understands the relation.

When the conditions do not hold, render every entry independently. Do not pair a single route with a single co-author merely because there are two lines nearby. Convenient guessing is still guessing, but with better typography.

### 4.8 Casing, aliases, ordering, and hiding

Recommended 1.0 behavior:

- match known keys case-insensitively;
- display their original key casing in raw detail;
- preserve entry source order in the exact view;
- preserve repeated keys rather than deduplicating them;
- allow users to hide keys by normalized exact key;
- show unknown keys by default;
- do not expose arbitrary key aliases or reordering rules in 1.0.

An alias/order DSL would let users build a bespoke dashboard, and then the extension would spend the rest of its natural life migrating settings nobody remembers configuring. The first release should remain a reader.

---

## 5. Native features and adjacent products

### 5.1 Native GitHub behavior

GitHub currently has several relevant native capabilities:

- [recognized `Co-authored-by` lines][github-coauthors] can associate contributions with accounts when the email is associated appropriately;
- commit pages and PR Commits views expose [native signature states][github-signatures] such as Verified, Partially verified, or Unverified;
- [GraphQL’s `Commit.authors` connection][github-graphql-commit] includes the Git author and recognized `Co-authored-by` identities;
- the [REST Git commit object][github-rest-git-commit] exposes the raw message, author, committer, and verification, but no generic arbitrary-trailer collection;
- GitHub Desktop can render supplied co-author names differently from GitHub Web.

These features are useful but narrower than the proposed product. GraphQL account authorship does not expose `Reviewed-by`, `Tested-by`, `Change-Id`, `Co-authored-via`, malformed candidates, or arbitrary custom keys. Pulling GraphQL into the extension would add authentication and permission surface while still failing the generic requirement.

### 5.2 Existing extensions and tools inspected

No searched current specimen was found whose primary advertised purpose is **generic read-side Git trailer rendering on GitHub Web**. That is a scoped search finding, not proof that no obscure userscript exists in the human basement.

Relevant adjacent specimens include:

| Specimen | What it demonstrates | Why it is not the same product |
| --- | --- | --- |
| [Better GitHub Co-Authors][cws-better-coauthors] | Demand for improving co-author workflows | Helps produce/select co-authors rather than inspect all stored trailers |
| [GitHub Tags on Commits][cws-tags] | A small extension can enhance commit surfaces | Adds repository tag information, not commit-message evidence |
| [GitHub Git Notes Viewer][cws-notes-viewer] and [GitNotes][cws-gitnotes] | Adjacent commit metadata can be injected into GitHub pages | Reads Git notes, often with authentication or additional data paths |
| [Graph Tab for GitHub][cws-graph-tab] | Private-repository enhancement can operate through the signed-in browser without a user-provided token | Presents graph data, not trailers; undocumented endpoint risk differs |
| [Git Graph for GitHub][cws-git-graph] | Users install substantial commit-history enhancements | API and analytics choices broaden its trust surface |
| [Refined GitHub][refined-github] | Mature typed feature adapters and GitHub-specific maintenance discipline | Broad GitHub enhancement suite; no current generic trailer-rendering feature found at the pinned coordinate |

The donor extension is the closest architectural specimen, but it solves a different product problem: comments posted through a shared account and marked with first-line identity labels.

### 5.3 Strongest public positioning

Recommended one-sentence promise:

> **Trailer Lens makes Git commit trailers readable on GitHub commit pages while keeping the commit message as the source of truth.**

Recommended supporting line:

> See co-authors, reviews, sign-offs, tests, custom metadata, and malformed footer evidence without a GitHub token, backend, or tracking.

Avoid these framings:

- “Discover the real author.”
- “Verify AI-generated commits.”
- “Fix GitHub attribution.”
- “Parse every footer.”
- “Enterprise provenance platform.”

The first three overclaim truth. The fourth ignores Git structure. The fifth is how a compact extension wakes up one morning with an admin console and a sales team.

---

## 6. Recommended user experience

### 6.1 Placement

On a qualified commit-detail page, insert one extension-owned sibling immediately after the native full commit-message region and before the diff or secondary metadata.

Do not:

- rewrite the native message;
- replace GitHub’s author/co-author header;
- move or restyle GitHub’s signature badge;
- hide raw lines from the native page;
- inject into a unit unless the adapter has a confident message and anchor.

The panel should visibly identify itself with a restrained lens icon or an “Added by Trailer Lens” tooltip. This avoids impersonating native GitHub and helps users diagnose breakage.

### 6.2 Progressive disclosure

A useful default shape is a native disclosure panel:

```text
▾ Trailers · 4                                      Added by Trailer Lens

  Co-authored by   Juno
    via            Claude Code · Opus 5 · Max
  Reviewed by      Alex Rivera
  Tested by        CI on Windows and Linux
  Change-Id        I9fd0…72ae

  ▸ Raw trailer lines and parsing details                 Copy block
```

Recommended default behavior:

- one to four normal entries: open;
- more than four entries or very long values: collapsed summary;
- user density preference: `auto`, `compact`, or `expanded`;
- raw detail always available;
- no animation required, which is a remarkably effective reduced-motion strategy.

A native `<details>` / `<summary>` foundation is preferable unless current GitHub styling or nested disclosure behavior forces a custom button. If custom, follow the [WAI disclosure pattern][wai-disclosure] with a real button, `aria-expanded`, keyboard activation, visible focus, and stable focus restoration after rerender.

### 6.3 Row rendering

Each row should contain:

- a friendly label when the key is known;
- the exact key in a tooltip or detail;
- a compact friendly value;
- a per-row copy control only if testing shows it remains uncluttered;
- a raw-line view that preserves casing, separator spacing, continuations, and order;
- no color-only semantic encoding.

Use monospace selectively for hashes, IDs, and raw lines, not for every person’s name as though humanity were a terminal session.

### 6.4 Multiple contributors and repeated trailers

- Preserve every repeated entry.
- Do not collapse two identical values unless the UI explicitly says it is showing a count and the raw view keeps both.
- In 1.0, simpler is better: show all repeated rows.
- Matched `Co-authored-via` context may nest under the corresponding co-author in the friendly summary, but the raw view stays in original order.
- A shared GitHub account association remains native above the panel; the extension displays each exact trailer name.

This directly resolves the donor canary where GitHub Web displays one collective actor for two materially distinct named coworkers.

### 6.5 Raw and copyable evidence

The raw disclosure should provide:

- exact strict trailer block;
- line numbers relative to the commit message if useful;
- nearby trailer-shaped candidates in a separate subsection;
- a “Copy strict trailer block” action;
- optionally “Copy all shown evidence,” clearly distinguished;
- parse notes such as unfolded continuations.

Copy should run only from a user gesture. Test `navigator.clipboard.writeText` on GitHub before requesting any clipboard permission. A copy convenience is not worth an ominous installation warning.

### 6.6 Malformed and ambiguous evidence

Diagnostics should use plain, non-accusatory language:

- **Outside final trailer block:** “This line looks like a trailer but is separated from Git’s final trailer block.”
- **Ambiguous mixed block:** “This footer may depend on repository-specific Git trailer configuration.”
- **Unrecognized key:** no warning; unknown keys are legitimate.
- **Continuation without a preceding entry:** show raw candidate only.
- **Unpaired route:** “Route metadata shown separately because no unique co-author match was found.”

Do not use red unless there is an actual extension failure. A malformed commit message is evidence to inspect, not a browser emergency.

### 6.7 Accounts, links, avatars, and email

Recommended 1.0 boundary:

- no avatar rendering;
- no email-to-account lookup;
- no GitHub API call;
- no Gravatar or third-party image request;
- no inferred profile link;
- no replacement of native account links.

The native GitHub header already provides whatever account association GitHub recognizes. The panel’s job is exact trailer evidence. A later DOM-only enhancer may reuse an existing native link when the mapping is provably one-to-one, but it should not be necessary for the product to feel complete.

### 6.8 Settings

Recommended version-1 schema:

```json
{
  "version": 1,
  "enabled": true,
  "detailMode": "auto",
  "showDiagnostics": true,
  "showUnknownKeys": true,
  "hiddenKeys": []
}
```

Options page sections:

1. **General:** enabled and density.
2. **Evidence:** diagnostics and unknown-key visibility.
3. **Hidden keys:** normalized exact keys with validation and easy removal.
4. **Privacy:** one blunt paragraph stating that commit messages are read locally and never stored or sent.
5. **Reset:** confirmation and migration-safe defaults.

Keep strings centralized, and preferably use an English `_locales` catalog from the start. This does not promise translations; it merely prevents every label from becoming a future archaeological site.

### 6.9 Theme, contrast, keyboard, and screen readers

- Use GitHub/Primer CSS variables with system-color fallbacks.
- Support light, dark, dark-dimmed, and forced-colors modes.
- Never convey strict/diagnostic status by color alone; include text and icons with accessible labels.
- Keep focus outlines visible.
- Use native buttons and disclosures.
- Announce copy success through a polite live region, not by moving focus.
- Avoid hover-only explanations.
- Preserve the currently focused control when a panel must reconcile after a GitHub mutation.
- Respect browser zoom and text resizing.
- Do not animate open/close unless `prefers-reduced-motion` is handled; shipping no animation is entirely respectable.

### 6.10 Failure behavior

If any of these are uncertain, render nothing:

- the route;
- the commit unit;
- the full message source;
- the insertion anchor;
- the parser bounds;
- ownership of an existing injected root.

If a previously qualified unit becomes uncertain, remove the owned root and leave GitHub native. Never leave half a panel attached to the wrong commit.

Disabling the extension should remove all owned roots in open tabs through storage-change handling. Uninstalling cannot honestly guarantee synchronous cleanup in already-open documents; a reload or navigation returns the untouched native page. Public documentation should say that rather than claiming Chrome performs a tiny exorcism on every tab.

---

## 7. GitHub Agent Faces as a donor, not a destiny

### 7.1 What the donor actually is

At the accepted commit, GitHub Agent Faces is a dependency-free Manifest V3 extension with:

- a plain JavaScript shared configuration module;
- a content script injected on all `github.com` pages and gated by route/repository settings;
- current React and legacy GitHub comment adapters;
- a requestAnimationFrame-batched `MutationObserver`;
- idempotent transformation signatures;
- reversible DOM changes with original-node records in a `WeakMap`;
- cleanup for detached DOM that GitHub may later reattach;
- live settings updates from `chrome.storage.local`;
- an options page for repositories, source account, identities, colors, avatars, import/export, and reset;
- unit tests, a 29-scenario DOM fixture harness, and a 12-step browser smoke flow;
- privacy, architecture, decisions, development, vision, and project-map documentation;
- a storage-only API permission and no backend, token, analytics, runtime dependency, remote code, or service worker.

This is a serious donor. It is not a README-shaped prototype wearing a manifest.

### 7.2 Transfer matrix

| Donor choice | Transfer? | New-product treatment |
| --- | --- | --- |
| Centralized layout adapters | **Yes** | One adapter per GitHub surface; no selectors in parser or renderer |
| Fail closed on uncertain DOM | **Yes** | Hard invariant |
| Batched observer and soft-navigation handling | **Yes** | Keep URL authoritative; ignore owned roots |
| Per-unit signatures and idempotency | **Yes** | Key by commit identity, raw-message hash, adapter version, and settings signature |
| Explicit DOM ownership marker | **Yes** | One extension root such as `data-trailer-lens-owned` |
| Reversible behavior | **Yes, simpler** | Remove owned sibling roots; do not rewrite native nodes in the first place |
| Validated, versioned local settings | **Yes** | Add explicit migration tests from version 1 onward |
| Local fixture harness plus live smoke | **Yes** | Expand around parser oracle, multiple commit surfaces, accessibility, and packaging |
| Match all GitHub and gate in code | **Likely yes** | Best current answer to soft navigation without `scripting`/service-worker permissions |
| Plain JavaScript and no build | **No as a rule** | Appropriate for the private donor; TypeScript plus a tiny deterministic build is worth it for a maintained public parser/adapters project |
| Source-account and repository allowlist | **No** | Product-specific to marked comments |
| Identity records, colors, avatar upload/URL/initials | **No** | Wrong model and unnecessary privacy/settings surface |
| Replace visible author name and avatar | **No** | New product adds a sibling evidence panel and leaves native authorship untouched |
| Hide the source marker | **No** | Trailer Lens never hides commit-message evidence |
| External avatar URL option | **No** | Avoid an unnecessary third-party request path |
| Import/export of complex identity config | **No for 1.0** | Tiny settings do not need ceremony; add export only if settings later justify it |
| Byte-identical native restoration | **Not required** | Because the new design does not mutate native nodes; assert native subtree identity instead |
| “Touch only when GitHub breaks it” maintenance posture | **Partly** | Keep architecture quiet, but a public Store item needs dependency, policy, and live-canary hygiene |

### 7.3 Improvements required for a public maintained extension

The donor’s plain-JS/no-build decision was rational for a private one-owner utility. The new product has a larger semantic core, more surfaces, public release automation, and long-lived settings. TypeScript earns its cost through:

- typed parser spans and diagnostics;
- typed adapter contracts;
- exhaustive known-key handling;
- safer settings migrations;
- fixture factories shared across parser and DOM suites;
- fewer accidental null-selector tragedies after GitHub changes.

Use a tiny build tool such as esbuild, no framework, no runtime dependency graph, and readable non-minified output. The goal is not to “modernize” a 500-line extension into a festival of config files. It is to make the semantic boundaries executable.

### 7.4 Do not create a shared framework yet

The two products share broad patterns, not yet a stable reusable abstraction:

- GitHub Agent Faces modifies comment identity presentation.
- Trailer Lens adds commit-message evidence.
- Their adapters target different units.
- Their settings models are unrelated.
- Their parser domains are unrelated.
- Their restoration requirements differ.

Copy a proven pattern deliberately or rewrite it cleanly. Do not publish an internal shared package until both repositories have independently produced the same stable code twice. Shared code introduced before shared meaning is just coupling wearing a cardigan.

### 7.5 Settings experience and visual language

The donor’s [README][donor-readme], options markup, and [options CSS][donor-options-css] show a restrained GitHub-adjacent settings experience rather than a custom application shell:

- one centered page around 780 pixels wide;
- neutral cards and familiar system typography;
- explicit light/dark design tokens;
- real labels, hints, validation messages, and `:focus-visible` rings;
- responsive two-column identity grids collapsing below 640 pixels;
- a fixed save bar with dirty, success, and error states;
- previews beside the fields they explain;
- explicit import/export/reset behavior.

Transfer the **interaction discipline**, not the identity-dashboard appearance. Trailer Lens should keep:

- clear sections and blunt explanatory text;
- atomic explicit save with visible dirty/success/error feedback;
- real focus treatment and responsive layout;
- GitHub-adjacent neutral colors so the options page feels familiar;
- a live example of the resulting trailer panel.

It should not copy:

- identity cards;
- per-person colors;
- avatar previews/uploads;
- repository toggles;
- a page length that justifies a permanently fixed save bar when five settings fit above the fold.

A compact sticky action row is enough if hidden-key management makes the page longer. The public product should also carry its own lens/line visual motif so it reads as an independent extension rather than an uninvited GitHub settings tab.

### 7.6 Donor testing and packaging route

The donor’s [development guide][donor-development] is admirably literal:

- pure Node tests require no dependency install;
- the DOM harness runs from a local server in a real browser;
- the smoke test launches a throwaway Chromium profile, drives the actual options page, visits public GitHub, and inserts marker text only into the local rendered DOM;
- current branded Chrome no longer honors the unpacked-extension launch flag in the same way, so a Playwright Chromium is the documented automation browser;
- packaging uses an explicit PowerShell `Compress-Archive` allowlist and places the loadable extension at ZIP root while excluding tests and docs.

Transfer the explicit package allowlist, root check, real options-page drive, throwaway profile, and non-destructive live specimen. Improve the public product with:

- a platform-neutral Node packaging script;
- normalized archive order and timestamps;
- generated inventory and SHA-256;
- version-coordinate checks;
- unpacked-ZIP browser smoke;
- CI-owned release artifacts;
- no dependence on a manually typed `1.0.0` filename.

The donor’s screenshots are documented as captures from the real extension on live GitHub and its options page, which is the correct standard for Trailer Lens assets too.

---

## 8. Implementation architecture options

### 8.1 Option A: donor-style plain JavaScript, no build

**Shape:** direct `manifest.json`, plain scripts, Node built-in tests.

**Advantages:**

- no build dependencies;
- Store package is trivially inspectable;
- lowest setup cost;
- donor patterns transfer nearly verbatim.

**Costs:**

- parser and adapter contracts rely on discipline rather than types;
- settings migration and discriminated diagnostics become noisier;
- module sharing between browser and tests requires globals/CommonJS compromises;
- public maintenance becomes less forgiving as surfaces grow.

**Disposition:** credible, but not preferred.

### 8.2 Option B: TypeScript with a tiny deterministic build

**Shape:** TypeScript source, esbuild or an equivalently small pinned tool, static HTML/CSS, no UI framework, no runtime dependencies.

**Advantages:**

- typed immutable domain model;
- clean browser/test modules;
- adapter exhaustiveness;
- build-time dead-code elimination without opaque runtime machinery;
- straightforward source maps for development while shipping readable output;
- easier browser-neutral core later.

**Costs:**

- build and lockfile maintenance;
- Store reviewers see generated files, so source/release mapping must be documented;
- reproducibility needs an explicit packaging script.

**Disposition:** **recommended**. The added machinery is proportionate and bounded.

### 8.3 Option C: API-backed extension with service worker

**Shape:** detect commit SHAs in many GitHub surfaces, call REST or GraphQL for messages/authors, cache results, authenticate for private repositories.

**Advantages:**

- broader surface coverage;
- canonical raw message independent of current DOM;
- possible account enrichment.

**Costs:**

- GitHub authentication and token scopes;
- service worker, caching, rate limits, failure states, and revocation;
- private content copied into extension-managed data paths;
- GraphQL still omits arbitrary trailer semantics;
- materially harder Store privacy story;
- larger blast radius when compromised;
- solves missing-DOM surfaces by broadening the product far beyond the originating need.

**Disposition:** reject for 1.0 and do not leave a “temporary” hook for it.

### 8.4 Recommended repository shape

```text
trailer-lens/
├─ manifest.json
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ scripts/
│  ├─ build.mjs
│  ├─ package.mjs
│  ├─ verify-package.mjs
│  └─ generate-git-oracles.mjs
├─ src/
│  ├─ domain/
│  │  └─ trailers/
│  │     ├─ model.ts
│  │     ├─ scan.ts
│  │     ├─ parse.ts
│  │     ├─ classify.ts
│  │     ├─ people.ts
│  │     ├─ pair-coauthor-via.ts
│  │     └─ limits.ts
│  ├─ github/
│  │  ├─ routes.ts
│  │  ├─ navigation.ts
│  │  ├─ reconcile.ts
│  │  └─ adapters/
│  │     ├─ contract.ts
│  │     ├─ commit-detail.ts
│  │     └─ qualified-list-surface.ts
│  ├─ presentation/
│  │  ├─ render.ts
│  │  ├─ labels.ts
│  │  ├─ clipboard.ts
│  │  └─ trailer-lens.css
│  ├─ settings/
│  │  ├─ schema.ts
│  │  ├─ storage.ts
│  │  └─ migrations.ts
│  ├─ content/
│  │  └─ main.ts
│  ├─ options/
│  │  ├─ options.html
│  │  ├─ options.ts
│  │  └─ options.css
│  └─ locales/
│     └─ en.ts
├─ tests/
│  ├─ trailers/
│  │  ├─ fixtures/
│  │  ├─ oracle/
│  │  └─ parser.test.ts
│  ├─ github/
│  │  ├─ fixtures/
│  │  └─ adapters.test.ts
│  ├─ presentation/
│  ├─ migrations/
│  ├─ browser/
│  └─ package/
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ DECISIONS.md
│  ├─ DEVELOPMENT.md
│  ├─ RELEASES.md
│  └─ images/
├─ PRIVACY.md
├─ SECURITY.md
├─ CONTRIBUTING.md
├─ CHANGELOG.md
├─ LICENSE
└─ README.md
```

### 8.5 Adapter contract

```ts
export interface CommitSurfaceAdapter {
  readonly id: string;
  readonly priority: number;

  discover(root: ParentNode): readonly CommitUnit[];
}

export interface CommitUnit {
  surface: 'commit-detail' | 'repository-history' | 'pr-commits' | 'compare';
  commitId: string;
  root: HTMLElement;
  messageSource: HTMLElement;
  insertionAnchor: HTMLElement;
  rawMessage: string;
}
```

An adapter must return `null` or omit the unit unless it can prove:

- `rawMessage` is the full message rather than a title or truncated summary;
- the message belongs to the same commit as `commitId`;
- the anchor belongs to that unit;
- the unit is not already extension-owned;
- extracting text does not include controls, diff text, signature labels, or neighboring commits.

Selector knowledge belongs inside adapters. Parser code receives only a string.

### 8.6 Reconciliation and ownership

Recommended owned root:

```html
<section
  data-trailer-lens-owned="1"
  data-trailer-lens-commit="<sha>"
  data-trailer-lens-signature="<hash>"
  aria-label="Commit trailers added by Trailer Lens">
</section>
```

The signature should derive from:

- adapter ID/version;
- commit ID;
- raw message hash;
- settings signature;
- renderer version if necessary.

Reconciliation loop:

```text
observe/navigation/settings event
  -> queue affected roots
  -> batch once per animation frame
  -> rediscover qualified commit units
  -> remove owned roots whose native unit disappeared or no longer qualifies
  -> parse raw message
  -> if no evidence: remove owned root
  -> if same signature: no-op
  -> otherwise render a fresh owned sibling using text nodes only
```

Never place extension-owned nodes inside the native message subtree. That makes “native DOM remains unchanged” a simple testable invariant and prevents the observer from confusing its own presentation with source evidence.

### 8.7 Navigation and observation

- Inject on `https://github.com/*` at `document_idle`.
- Short-circuit immediately outside repository routes that can contain qualified surfaces.
- Observe `document.documentElement` for child-list/subtree changes.
- Add mutation targets and added element roots to a set.
- Batch with `requestAnimationFrame`; use a deterministic scheduler in tests.
- Listen to current Turbo/PJAX/popstate events as hints, but compare `location.href` during every flush.
- Ignore mutations entirely contained inside an owned root.
- Keep a `WeakMap` from native unit root to applied state; do not retain detached private page data after removal.

### 8.8 Storage and migration

Use one validated settings object in `chrome.storage.local`.

On every read:

- treat stored data as untrusted;
- migrate version by version;
- drop unknown fields;
- normalize hidden keys;
- fall back safely when migration fails;
- never store commit messages, commit SHAs, repository names, browsing history, or diagnostics.

Chrome storage is exposed to content scripts by default. Because the content script needs the settings, that is acceptable, but the project can explicitly set the narrowest storage access level supported by its chosen architecture and document the reason.

### 8.9 Manifest shape

Indicative first manifest:

```json
{
  "manifest_version": 3,
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__",
  "version": "1.0.0",
  "default_locale": "en",
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["https://github.com/*"],
      "js": ["dist/content.js"],
      "css": ["dist/trailer-lens.css"],
      "run_at": "document_idle"
    }
  ],
  "options_ui": {
    "page": "dist/options.html",
    "open_in_tab": true
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

The content-script match grants access to GitHub pages and must be explained honestly in the Store listing. Omitting a separate `host_permissions` array does not make the page-read capability disappear; it merely keeps the manifest aligned with the chosen declarative injection path.

### 8.10 Performance and bounds

The parser only needs the message tail. Centralize and test hard bounds such as:

- maximum tail characters scanned;
- maximum lines;
- maximum entries;
- maximum continuation depth/value length;
- maximum DOM units per batch.

When a bound is exceeded, fail closed or show one extension-owned “unusually large message skipped” note only when it can be attached to the correct commit. Never freeze a GitHub tab trying to honor a commit message that contains the collected works of an overconfident release bot.

### 8.11 Browser portability without premature promises

Keep these foundations browser-neutral:

- pure parser and classifier;
- adapter contracts;
- renderer built on standards;
- a small storage wrapper;
- no Chrome-only service worker APIs.

Do not ship a compatibility polyfill or Firefox manifest in 1.0. Chromium/Chrome is the concrete contract. Portability is a design quality, not a roadmap promise.

## 9. Security, privacy, policy, and trust

### 9.1 Threat model

The extension runs inside pages that may contain confidential private-repository information. Its inputs are attacker-controlled commit messages and a frequently changing third-party DOM. Its update channel can modify every matching GitHub page for installed users.

The meaningful threats are therefore:

- private commit content leaving the browser;
- malicious commit text becoming executable HTML or a dangerous link;
- selector drift attaching evidence to the wrong commit;
- an observer loop degrading GitHub performance;
- a dependency or release workflow injecting remote behavior;
- Store credentials being exposed to pull-request code;
- a settings migration breaking rollback;
- an extension update silently broadening permissions or purpose.

The product does **not** need a grand enterprise security program. It does need boring, explicit invariants.

### 9.2 Runtime security invariants

1. **No remote code.** Manifest V3 and Chrome Web Store policy prohibit remotely hosted executable logic. Bundle all JavaScript with the extension; no CDN scripts, dynamic module URLs, `eval`, `new Function`, or fetched configuration interpreted as code.
2. **No network in 1.0.** The runtime makes no GitHub API, analytics, avatar, font, update-service, or diagnostics request of its own.
3. **Text nodes only.** Commit keys and values are untrusted. Render with `textContent` / `createTextNode`, never `innerHTML`.
4. **No arbitrary linkification.** Do not make unknown values clickable. Known safe links can be considered later under an explicit scheme and origin policy.
5. **No message persistence.** Do not store raw messages, parsed values, commit IDs, repository names, or recent-page caches.
6. **No content logging.** Production console output must not contain private message text. Debug output should be disabled in release builds and structurally redacted.
7. **Fail closed on adapter uncertainty.** A selector miss produces no panel, not a best guess beside the nearest SHA.
8. **Owned-root isolation.** The extension adds and removes only its own root; it does not submit forms, click controls, edit textareas, or modify native links.
9. **Bounded work.** Parser and reconciliation limits prevent hostile or absurdly large messages from blocking the page.
10. **Permission stability.** A permission increase is a product decision requiring changelog, privacy review, Store disclosure update, and user-visible justification.

### 9.3 Manifest V3 and remote-code policy

Chrome’s current [Manifest V3 direction][chrome-mv3] replaces persistent background pages with service workers where background logic is needed, and the [Store’s MV3 policy][cws-mv3-policy] requires extension logic to be packaged rather than remotely hosted. Trailer Lens does not need a background runtime at all.

That is an advantage:

- fewer lifecycle states;
- no message broker between service worker and content script;
- no background network capability;
- no token storage;
- no “the worker was asleep” bugs;
- a smaller Store review surface.

A build step is compatible with Manifest V3. The Store package must contain the generated logic and remain reviewable. Ship readable, non-obfuscated bundles and document how the pinned source produces them.

### 9.4 Permission conclusion

Under Chrome’s current [permission model][chrome-permissions], recommended runtime permissions are:

- API permission: `storage`.
- Site access: declarative content script for `https://github.com/*`.
- No `activeTab`, `tabs`, `scripting`, `webNavigation`, `identity`, `cookies`, `clipboardWrite`, or broad host patterns.

Why not `activeTab`? It would require a user gesture for every page and turn a passive reading aid into a toolbar ritual.

Why not optional GitHub host access? Programmatic optional injection generally needs additional extension components and onboarding. The extension’s sole purpose is GitHub commit pages, so a narrowly stated GitHub match is more honest and more usable.

Why all GitHub routes rather than only `/commit/*`? Content scripts are injected into a document at load; GitHub can then navigate that document into a commit route without reloading it. Matching the whole origin and gating immediately in code avoids `scripting` and navigation permissions. The Store explanation should state this plainly.

### 9.5 Private-repository content handling

Recommended privacy contract:

> Trailer Lens reads the rendered commit-message text on GitHub pages solely to identify and display trailer evidence in the same page. It does not transmit, retain, sell, share, or use that content for analytics, advertising, profiling, or any purpose outside the displayed feature.

Implementation consequences:

- parsed models live only as ephemeral objects associated with the current DOM unit;
- removing the unit releases references;
- no recent-commit history;
- no crash reporter receiving page content;
- no remote feature flags;
- no third-party fonts, icons, or avatars;
- no support workflow that asks users to upload private page captures by default.

The issue template should explicitly ask for a sanitized public specimen or stripped DOM fixture and warn users not to paste confidential messages.

### 9.6 Storage and migrations

[`chrome.storage.local`][chrome-storage] currently has ample quota for the tiny settings object and is removed on extension uninstall. It is not a reason to accumulate browsing data simply because the cupboard is large.

Security requirements:

- validate on every read and import-like path;
- never interpolate stored keys into selectors or HTML;
- migrate one version at a time;
- keep defaults immutable;
- add rollback compatibility notes before changing schema;
- retain unknown future versions by failing safely rather than destructively overwriting them when possible.

### 9.7 Dependencies and supply chain

Recommended dependency posture:

- zero runtime dependencies;
- the smallest practical set of build and test dependencies;
- committed lockfile;
- exact package-manager version through `packageManager` / Corepack policy if used;
- no postinstall scripts unless explicitly reviewed;
- automated dependency alerts;
- dependency updates tested but not auto-published;
- release package allowlist, not “zip the repository”;
- full-SHA pinning for third-party GitHub Actions;
- generated Store bundle scanned for remote URLs, `eval`, source-machine paths, and undeclared files.

A software bill of materials is optional for a project this small. A deterministic package manifest listing every shipped file is more immediately useful.

### 9.8 Chrome Web Store single-purpose and privacy disclosures

Chrome Web Store [privacy][cws-privacy-policy], [limited-use][cws-limited-use], [permission][cws-permissions-policy], and [dashboard disclosure][cws-privacy-dashboard] guidance expects a narrow, accurately described single purpose, the narrowest permissions necessary, accurate data-use declarations, and no remotely hosted code. Trailer Lens fits that contract well if it remains disciplined.

The listing and dashboard should disclose:

- it reads and changes presentation on `github.com` pages;
- it reads commit-message website content to provide the feature;
- processing occurs locally;
- commit content is not collected or transmitted;
- settings are stored locally;
- there is no analytics, advertising, sale, sharing, or remote code;
- private repositories work only because the signed-in user can already see the page;
- the product is not affiliated with or endorsed by GitHub.

Do not write “the extension accesses no data.” It necessarily accesses the commit message. Trust comes from saying exactly what happens, not from defining “data” as whatever makes the privacy form shorter.

### 9.9 Diagnostics and error reporting

Recommended 1.0: no telemetry and no automated error reporting.

Provide instead:

- a local version and adapter-status section in options;
- a “Copy sanitized diagnostics” action only if it excludes message text, repository path, commit SHA, account login, and full URL;
- optional local debug logging enabled manually and reset automatically;
- a public live-canary workflow for maintainers.

A future opt-in crash reporter is not forbidden, but it would materially change the privacy and Store disclosure contract. It should be proposed as a product decision with explicit payload examples, not smuggled in as “observability.”

### 9.10 Accessibility and policy

Chrome Web Store policy does not turn every small extension into a formally certified accessibility product. Nevertheless, keyboard access, focus visibility, screen-reader semantics, color independence, and high-contrast support are part of a credible public interface and reduce review/support risk.

Use the WAI disclosure pattern or native disclosure semantics. Run automated accessibility checks, then perform keyboard and screen-reader spot checks because automated tools remain machines politely verifying that attributes exist while humans discover whether the interface makes sense.

### 9.11 Public trust surfaces for a one-owner extension

Realistic minimum:

- public source repository;
- `PRIVACY.md` linked from Store and README;
- `SECURITY.md` with a private reporting address or GitHub private vulnerability reporting;
- GitHub Issues for support and bugs;
- explicit supported platform/surfaces;
- changelog and release assets;
- no support SLA;
- no promise to support every GitHub experiment immediately;
- a deprecation/unpublish policy if maintenance stops.

Not required merely to publish this extension:

- a backend;
- a corporation created for the extension;
- SOC 2;
- an analytics platform;
- a consent-management banner;
- a dedicated status page;
- a formal bug bounty;
- an “enterprise” plan whose main feature is a different shade of blue.

### 9.12 Required, recommended, and cosplay-separated

| Level | Item |
| --- | --- |
| Platform-required or effectively required | Manifest V3; no remote code; accurate permissions; single purpose; Store listing/privacy declarations; publisher email/account verification and two-step verification; compliance with impersonation/IP policy; version increase for updates |
| Strongly recommended | Public privacy policy; source repository; no telemetry; least privilege; readable bundle; security contact; deterministic package; tests; rollback-compatible settings; original icon; “not affiliated with GitHub” wording |
| Optional maturity | Verified CRX uploads; artifact attestations; reproducible-build verification by third parties; translations; private vulnerability reporting; SBOM |
| Startup cosplay for this scope | Backend account system, data warehouse, legal whitepaper, customer-success portal, uptime dashboard, multi-tenant admin console |

---

## 10. Testing and durability strategy

The dominant risk is not algorithmic novelty. It is Git semantics plus GitHub DOM drift. Tests should reflect that rather than producing a heroic percentage from files that never touch a page.

### 10.1 Deterministic parser corpus

Repository-owned parser fixtures should include at minimum:

- normal final blocks;
- no preceding blank line;
- blank line inside intended block;
- repeated keys and casing variations;
- spaces before separator and tabs after separator;
- empty values;
- continuation lines;
- CRLF and LF;
- trailing blank lines;
- `---` divider;
- default comment lines;
- all-trailer unknown-key blocks;
- mixed unknown blocks below and above the recognition threshold;
- built-in recognized prefixes;
- underscore/dotted/Unicode-key controls;
- one-line message controls;
- footer-shaped prose controls;
- long values and hard bounds;
- invalid UTF-16 edge cases as JavaScript presents them;
- suspicious HTML/script/link text;
- Wolf’s valid one- and multi-identity specimens;
- Wolf’s blank-line malformed specimen.

Each fixture should carry:

- raw input;
- expected strict block and exact ranges;
- expected unfolded values;
- expected nearby candidates;
- expected diagnostics;
- the Git version and command used to generate any oracle output.

### 10.2 Git oracle strategy

Use real Git as a development oracle, not as a runtime dependency.

A script should run a pinned set of fixture messages through:

```bash
git interpret-trailers --parse
```

Store the expected output in the repository. CI compares the implementation parser to the stored oracle. A separate manually triggered or scheduled compatibility job may run against the newest installed Git and report drift.

Do not make “latest Git changed a heuristic” an unexplained permanent red branch. The job should produce a focused diff and open or update a maintenance issue. Stable release tests remain pinned until the behavior is reviewed and intentionally adopted.

### 10.3 Classifier and pairing tests

Test known-key lookup separately from parsing:

- case-insensitive lookup with original display preservation;
- every friendly label;
- person-value exact matches and non-matches;
- email hidden in compact view but preserved raw;
- `Signed-off-by` never receiving signature/verified semantics;
- unique name-based `Co-authored-via` pairing;
- duplicate, mismatch, malformed, missing-pipe, and many-to-one controls;
- source-order preservation in raw detail.

### 10.4 DOM fixtures

Capture sanitized, minimal, repository-owned fixtures for every supported adapter variant. A fixture should preserve the structural anchors needed by the adapter without copying irrelevant private page content.

For each surface, cover:

- one commit;
- several commits;
- long/collapsed native message;
- one and multiple co-authors;
- native signature states;
- unknown and malformed trailers;
- no trailers;
- lazy insertion;
- DOM replacement;
- soft navigation between qualifying and non-qualifying routes;
- repeated reconciliation;
- settings changes;
- narrow viewport;
- light, dark, and forced-colors classes/variables;
- extension root removal.

### 10.5 Native-DOM safety assertion

Before applying the extension, serialize or structurally snapshot the native commit unit. After render, disable, settings changes, navigation, and removal:

- the native subtree must remain structurally and textually unchanged;
- only the owned sibling may appear or disappear;
- no native attributes, classes, event handlers, links, or focus order may change.

This is simpler and stronger than the donor’s byte-identical restoration requirement because Trailer Lens never edits the source subtree.

### 10.6 Reconciliation tests

Assert:

- identical second scan is a no-op;
- the observer does not loop on owned-root insertion;
- changed raw-message hash replaces the correct panel once;
- detached units release state;
- reattached GitHub nodes are rediscovered safely;
- a route change removes panels from the old view;
- an adapter failure removes stale owned roots;
- focus inside a disclosure/copy control is retained where possible after a legitimate rerender;
- two extensions or duplicate content-script execution cannot create duplicate roots.

### 10.7 Browser automation

Use Playwright or a similarly maintained browser harness to load the unpacked built extension into Chromium.

Deterministic browser tests should run against local fixtures and cover:

- manifest load;
- content-script injection;
- settings page;
- storage changes;
- disclosure behavior;
- copy success/error path;
- theme styles;
- keyboard navigation;
- package CSP/no remote requests;
- screenshots.

Keep each browser test deterministic and independent. The donor’s one-machine smoke flow is useful evidence, but the public product should avoid one long stateful test whose seventh step fails because the third step left a menu open in another dimension.

### 10.8 Accessibility checks

- axe or equivalent automated scan on options and fixture panels;
- keyboard-only pass;
- screen-reader spot check on panel summary, rows, diagnostics, raw disclosure, and copy status;
- forced-colors screenshot/check;
- 200% zoom and narrow width;
- no inaccessible tooltip-only content;
- focus visible against all GitHub themes.

Automated accessibility failure should block CI. Manual qualification belongs in release readiness.

### 10.9 Public live canaries

Maintain a tiny public canary repository or a stable set of public commits containing:

- no trailers;
- ordinary known trailers;
- unknown custom trailers;
- repeated and multiple co-authors;
- valid `Co-authored-via` pairing;
- malformed blank-line split;
- signed and unsigned commits;
- merge and squash shapes.

A scheduled browser job may visit those pages and assert adapter discovery plus expected owned panels.

Live canaries are advisory for normal branches because GitHub incidents, rate limits, login state, experiments, and anti-automation measures can fail independently of the extension. They should become release-blocking only when a maintainer has confirmed the supported surface is actually broken.

### 10.10 Private-repository qualification

Before each Store release that changes adapters:

- load the exact release candidate in a clean Chromium profile;
- open at least one private commit-detail page the tester may access;
- verify no network requests from the extension;
- verify exact trailer evidence;
- verify disable/removal;
- verify no content appears in storage or logs;
- record only pass/fail and extension/browser versions, not repository or commit identifiers.

### 10.11 Packaging tests

CI must inspect the final ZIP, not merely the source tree:

- manifest version matches release version;
- archive root is loadable directly;
- only allowlisted files are present;
- no tests/docs/node_modules/source maps unless deliberately shipped;
- no source-machine absolute paths;
- no remote JavaScript URLs;
- no `eval`/`new Function`;
- no undeclared permissions;
- no secrets;
- deterministic file ordering and timestamps;
- SHA-256 produced;
- unpacked browser smoke uses the extracted ZIP contents.

### 10.12 Failure signals that stay useful

| Test class | Branch behavior | Scheduled/release behavior |
| --- | --- | --- |
| Parser/unit/fixture/migration/package | Hard failure | Hard failure |
| Local browser fixture | Hard failure | Hard failure |
| Accessibility automation | Hard failure | Hard failure |
| Public live GitHub canary | Report/advisory unless confirmed | Qualification failure when supported surface is confirmed broken |
| Private-repository check | Not in public CI | Manual release gate |
| Screenshot visual diff | Reviewable artifact, thresholded | Human approval for intentional changes |
| Latest-Git oracle drift | Maintenance report | Must be reviewed before parser behavior changes |

This avoids permanent red wallpaper while preserving the tests that actually protect users.

### 10.13 Donor strengths and gaps

Reuse from GitHub Agent Faces:

- fixture-first DOM adapters;
- dynamic insertion and collapsed-content cases;
- edit/detach/reattach awareness;
- byte-level attention to restoration bugs;
- options-page smoke;
- live GitHub qualification.

Add for Trailer Lens:

- Git oracle corpus;
- strict versus diagnostic evidence tests;
- native subtree immutability;
- accessibility automation;
- deterministic package and release verification;
- public canary repository;
- private content/logging assertions;
- settings migration and rollback tests;
- multi-surface adapter qualification.

## 11. Packaging, releases, and Chrome Web Store delivery

### 11.1 Current publication reality

As of 2026-08-20:

- [Chrome Web Store API v2][cws-api] is the current API and supports [service-account authentication][cws-service-accounts] for publishers.
- The [upload API][cws-api-upload] updates an **existing** Store item. Initial item creation, listing content, privacy declarations, and publisher setup remain dashboard work.
- The [publish API][cws-api-publish] supports normal and staged paths, with current Store tooling also exposing status inspection and cancellation controls.
- [Staged publishing][cws-update] allows an approved submission to wait for publisher release, currently for up to 30 days before it returns to draft.
- [Percentage rollout][cws-update] is available only to sufficiently large existing items, currently documented for more than 10,000 seven-day active users. It is irrelevant to the first release and should not distort the workflow.
- The [Store review page][cws-review] currently warns of increased review volume since April 2026. Many reviews still complete in days, but weeks are possible; support escalation is documented after an unusually long wait.
- [Store rollback][cws-rollback] republishes the prior package under a new higher version and is designed to avoid a fresh review, but settings and package compatibility remain the publisher’s responsibility.

The release design should therefore separate four facts humans love to staple together:

1. source version exists;
2. deterministic extension package exists;
3. GitHub release exists;
4. Chrome Web Store version is reviewed and published.

They should be linked by version and digest, not fused into one transaction that fails halfway and then lies about which half succeeded.

### 11.2 Version ownership

Recommended source of truth:

- `package.json` contains `X.Y.Z`;
- build generates or verifies the packaged manifest `version`;
- tag is exactly `vX.Y.Z`;
- changelog has a matching section;
- GitHub release and Store notes reference the same version;
- package file is `trailer-lens-X.Y.Z.zip`;
- SHA-256 file is `trailer-lens-X.Y.Z.sha256`.

The build must fail if any coordinate disagrees.

For a small extension, use ordinary semantic version intent:

- patch: bug, selector, compatibility, or presentation correction;
- minor: supported surface or user-visible capability;
- major: materially incompatible settings/product contract.

Do not bump merely to rerun CI. Store versions are durable public coordinates, not retry counters.

### 11.3 Deterministic package

The [Store package guidance][cws-prepare] requires the manifest at the archive root and an incremented version. The packaging script should:

1. start from a clean build directory;
2. compile readable bundles;
3. copy an explicit allowlist of manifest, scripts, CSS, options HTML, locales, and icons;
4. normalize file order, separators, modes, and timestamps;
5. create a ZIP whose root is directly loadable;
6. emit a file inventory and SHA-256;
7. unpack the ZIP and run manifest/package/browser verification against the unpacked result.

GitHub release assets should include the exact ZIP submitted to the Store. The Store may transform delivery packaging, but Wolf’s release remains independently inspectable and reproducible.

### 11.4 Workflow separation

Recommended workflows:

#### `ci.yml`

Triggers on pull requests and pushes.

- no secrets;
- minimal token permissions;
- install from lockfile;
- typecheck, lint, unit, fixtures, browser, accessibility, package verification;
- produce test reports and deterministic preview package;
- never publish.

#### `release-candidate.yml`

Triggers on a protected `v*` tag or manual release preparation.

- checks tag/version/changelog;
- builds once;
- runs the full deterministic suite;
- creates package, inventory, checksum, screenshots, and [artifact attestation][github-attestations];
- uploads immutable workflow artifacts;
- may create a **draft** GitHub release;
- has no Store credential.

#### `store-submit.yml`

Manual dispatch against an existing immutable release candidate.

- accepts version and expected digest;
- downloads the exact candidate artifact rather than rebuilding it;
- verifies tag, digest, attestation, and manifest;
- enters a protected `chrome-web-store` environment;
- obtains a short-lived credential;
- uploads to the existing Store item;
- submits through staged publication;
- polls and records the item status honestly;
- does not mark the GitHub release as Store-published.

#### `store-publish.yml`

Manual dispatch after Store approval.

- verifies the approved Store version;
- requires the explicit human environment gate;
- performs the documented release action through the API or dashboard-assisted procedure validated during initial setup;
- records the result and Store version in the GitHub release notes or a signed release-status artifact;
- fails loudly without altering the GitHub tag/package.

#### `release-finalize.yml`

Optional manual step.

- publishes the GitHub draft release independently;
- can run before or after Store publication according to Wolf’s chosen public-release sequence;
- never assumes Store success from an upload response.

### 11.5 Store credential design

[Chrome Web Store currently allows one service account to be associated with a publisher][cws-service-accounts]. That credential can therefore have a wider publisher blast radius than one repository.

Preferred setup:

1. Create a dedicated Google Cloud service account for Chrome Web Store automation.
2. Add its email to Wolf’s Chrome Web Store publisher account according to the current dashboard procedure.
3. Create a [Google Workload Identity Pool][google-wif] and provider for [GitHub Actions OIDC][github-oidc].
4. Restrict the provider/impersonation conditions to the numeric repository owner/repository identity, exact repository, protected branch or tag, and named release workflow/environment.
5. Let the release job request a short-lived token with `id-token: write`; do not store a JSON key in the repository or ordinary Actions secrets.
6. Keep all other workflow token permissions at `none` or `contents: read` as needed.

This is an inference-backed integration of two documented mechanisms: Chrome Web Store service-account authorization and Google/GitHub workload identity. Validate it once against a non-publishing status or upload step before relying on it.

Fallback when Workload Identity setup is unavailable or disproportional:

- store a service-account JSON key only in the protected Store environment;
- never expose it to PR, fork, or general CI jobs;
- rotate it after initial setup and on any suspicion;
- document revocation;
- use environment approval and branch/tag restrictions;
- plan migration to short-lived credentials.

Do not put Store credentials in repository variables, encrypted files committed to Git, release assets, or a general-purpose secret manager that every local agent can read because it was convenient on Tuesday.

### 11.6 GitHub Actions security

- Pin every third-party action to a full commit SHA under GitHub’s [Actions hardening guidance][github-actions-hardening].
- Use official actions where possible and still pin them.
- Set top-level workflow permissions to read-only or none.
- Grant `id-token: write` only in the Store job.
- Never execute untrusted PR code in a job that can access the Store environment or OIDC trust.
- Avoid `pull_request_target` for release logic.
- Require protected tags or verify that the tag commit is reachable from protected `main`.
- Use immutable artifacts/digests between build and publish jobs.
- Require explicit [environment approval][github-environments] before external effects.
- Keep the release workflow file itself under code review/branch protection.
- Record API response status without echoing tokens or publisher details.

For a one-owner repository, a manual approval is still useful even when the approver is Wolf: it separates “code merged” from “publish this externally now.” A second trusted reviewer would strengthen the gate, but lack of a corporate release board is not a reason to automate the last click away.

### 11.7 Staged publication

Recommended default:

1. upload candidate;
2. submit for review with staged publication;
3. poll status and surface warnings;
4. inspect the Store’s approved listing/version;
5. run private/public release qualification against the exact candidate;
6. manually publish;
7. verify Store availability and version;
8. update release status.

Use `blockOnWarnings` or the current equivalent where practical. Warnings should not be silently ignored by CI because a field named “warning” has never in history become less relevant after deployment.

### 11.8 First item setup

The initial Store item remains a deliberate manual external effect:

- follow the current [publisher-account setup][cws-account] to verify display name and contact email;
- ensure two-step verification is active;
- create the item;
- upload the first package manually or through the documented existing-item path after creation;
- complete Store Listing and Privacy fields;
- add screenshots and promotional asset;
- link privacy/support/source pages;
- verify the item ID and save it as a non-secret repository/environment variable;
- add and test the service account;
- perform the first staged review;
- document the exact API states encountered for future automation.

No research workflow should create the item merely to prove the API exists.

### 11.9 Review delays and rejection behavior

The workflow must model Store review as asynchronous and fallible:

- upload success is not review submission success;
- submission success is not approval;
- approval is not publication under staged publishing;
- publication request success is not confirmed user availability.

On rejection:

- preserve the immutable rejected package and Store feedback;
- fix source on a new commit/version;
- create a new release candidate;
- do not replace the GitHub asset under an existing tag;
- do not edit release notes to imply the rejected package shipped;
- document policy interpretation in `docs/DECISIONS.md` if it affects future code or listing language.

On a submission mistake before review completes, use the current [cancellation route][cws-cancel-review] rather than racing another upload. Current documentation limits cancellations to six per publisher per day.

### 11.10 GitHub release and Store publication coupling

Recommended policy:

- the GitHub release may be published as the transparent source/package release before Store approval, clearly labeled “Store review pending”; or
- it may remain draft until Store publication if Wolf wants one public announcement moment.

Either is coherent. What is not coherent is a workflow that deletes or rewrites a GitHub release because the Store took longer than expected.

The Store and GitHub are independently recoverable channels. The release page should have a small status field:

```text
Chrome Web Store: Published / In review / Not submitted / Rejected / Withdrawn
```

### 11.11 Rollback

Prepare rollback before the first Store update:

- retain every submitted ZIP and digest;
- keep settings migrations backward compatible where possible;
- document the previous known-good version;
- maintain a script that repackages the previous source under the next higher manifest version when Store rollback requires it;
- test upgrades and one-version downgrades in local profiles;
- never delete unknown future settings destructively.

Chrome’s documented rollback republishes the previous version under a higher version and can avoid a new review. It also discards pending/partial rollout state. The extension must therefore treat storage compatibility as part of release safety, not an afterthought delegated to hope.

### 11.12 Verified CRX uploads

Chrome supports [verified uploads][cws-verified-uploads] using a publisher-controlled signing key. This can protect the item even if the Store account is compromised, but it adds a high-value offline key whose loss creates support work.

Recommendation:

- do not block 1.0 on it;
- revisit after ordinary Store automation has succeeded at least once;
- if adopted, generate and store the key outside GitHub, the repository, agent-readable secrets, and the Google account itself;
- document recovery and key-custody responsibility;
- test the signed upload path before declaring it required.

The threat reduction is real, especially because a publisher service account may span several items. So is the key-management burden. This is one of the rare cases where security theater can become actual security if someone remembers where the key is.

---

## 12. Public project shape and positioning

### 12.1 Name recommendation

**Recommended brand:** `Trailer Lens`  
**Recommended repository:** `trailer-lens`  
**Recommended Store title:** `Trailer Lens: Commit Trailers for GitHub`

Preliminary searches on 2026-08-20 found no obvious browser-extension or software product collision under the exact phrase. Results were dominated by literal vehicle trailer lenses, film-trailer uses, and generic noise.

This is proportionate naming research for a small open-source extension. It is not trademark clearance, a legal opinion, or a mystical shield against every jurisdiction where someone has sold a red plastic light.

Why the name works:

- “Lens” communicates a read-only view rather than mutation;
- “Trailer” is the domain term;
- the descriptive Store subtitle carries search relevance;
- it is not tied to AI, Wolf, one key, or one client defect;
- it leaves room for additional Git hosting surfaces later without promising them now.

Alternatives:

| Name | Strength | Weakness |
| --- | --- | --- |
| Commit Trailers for GitHub | Maximum clarity | Generic, weak standalone brand, dependent on GitHub wording |
| Git Trailer Lens | Search clarity | More awkward and increases Git trademark presentation concerns |
| Commit Footer Lens | Understandable to newcomers | “Footer” is broader and less structurally accurate |
| Commit Evidence | Strong concept | Overclaims epistemic certainty and is too broad |
| Trailer View | Simple | More collision-prone and less distinctive |

Before creating public assets, recheck the repository slug, Chrome Web Store title search, general web search, and the most relevant software trademark register at a lightweight level. Do not spend startup-lawyer money on a pre-revenue utility, but do not ignore a clear same-category collision either.

### 12.2 Visual identity

In line with the Store’s [impersonation and intellectual-property policy][cws-ip-policy], use an original icon combining:

- a compact lens or inspection aperture;
- two or three horizontal trailer lines;
- no Octocat silhouette;
- no GitHub mark;
- no fake native GitHub iconography;
- simple geometry that survives 16×16.

Dark/light Store assets should share one recognisable silhouette. Avoid tiny text in the icon. The product may live beside GitHub, but it should not dress up as GitHub and borrow its nametag.

### 12.3 Store listing copy

**Title**  
`Trailer Lens: Commit Trailers for GitHub`

**Short description, 123 characters**  
The current [Store listing guidance][cws-listing] caps the short description at 132 characters.  
`Shows structured Git commit trailers in a clear, expandable panel on GitHub commit pages. Local-only, no token or tracking.`

**Category**  
Developer Tools.

**Opening paragraph**

> GitHub does not always make the full structure of a commit’s trailers easy to see. Trailer Lens adds a compact panel to supported commit pages for co-authors, reviews, sign-offs, tests, references, custom metadata, and malformed footer evidence. The commit message remains the source of truth.

**Trust paragraph**

> Everything runs in your browser. Trailer Lens does not use a GitHub token, backend, analytics, remote code, or account lookup. It never edits commits or repository content.

**Affiliation line**

> Trailer Lens is an independent open-source project and is not affiliated with or endorsed by GitHub.

### 12.4 Screenshot story

Use actual extension UI against deterministic public fixture commits, not a Figma fantasy that the shipped code later fails to resemble. Current [Store guidance][cws-listing] allows one to five screenshots at 1280×800 or 640×400 and documents the current promotional-tile dimensions.

1. **The problem:** GitHub native header plus a compact commit message where exact trailer detail is easy to miss.
2. **The answer:** Trailer Lens panel showing `Co-authored-by` and a matched `Co-authored-via` route from a clear Claude-shaped specimen.
3. **Generic value:** `Reviewed-by`, `Tested-by`, `Signed-off-by`, `Change-Id`, and one unknown custom key.
4. **Honest malformed case:** route line outside the final block, visibly separated from strict trailers.
5. **Trust and settings:** dark-mode options page with local-only/no-token explanation.

Include a narrow-layout image in README even if Store slots are better spent on the core story.

### 12.5 README shape

Recommended order:

1. one-sentence promise;
2. before/after screenshot;
3. “What it shows” examples;
4. “What it never does” trust boundary;
5. supported surfaces;
6. installation from Store and source;
7. settings;
8. trailer interpretation and diagnostics;
9. privacy;
10. development/tests;
11. compatibility/reporting bugs;
12. license/affiliation.

Do not lead with implementation architecture. Users came to read commits, not admire the folder tree.

### 12.6 License

#### MIT, recommended

Advantages:

- short and familiar;
- compatible with the donor’s license and common extension tooling;
- encourages audit, reuse, and contribution;
- minimal legal maintenance for a one-owner utility.

Cost:

- proprietary forks may keep modifications closed.

#### MPL-2.0, credible alternative

Advantages:

- file-level reciprocity;
- modifications to covered files remain open when distributed;
- less viral than GPL for adjacent code.

Cost:

- more license text and contributor understanding;
- slightly higher friction for a tiny browser utility.

#### GPL-3.0

Valid but not recommended unless strong copyleft is a deliberate product principle. There is no backend here for AGPL to add meaningful reach.

**Recommendation:** MIT. Choose MPL-2.0 only if Wolf positively wants reciprocal modifications; do not choose it merely because stronger-sounding licenses feel more serious under fluorescent lighting.

### 12.7 Repository documents

Public baseline:

- `README.md`
- `LICENSE`
- `PRIVACY.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md` only if Wolf wants one and will enforce it
- issue templates for bug, GitHub DOM breakage, parser specimen, and feature request
- pull-request template with native-DOM, permissions, privacy, and screenshot checks
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/DEVELOPMENT.md`
- `docs/RELEASES.md`

### 12.8 Support and maintenance boundary

Recommended support statement:

- GitHub Issues are the support channel.
- Current stable Chrome/Chromium and explicitly listed GitHub surfaces are supported.
- GitHub beta/experimental layouts are best effort until qualified.
- Private-repository bugs require sanitized fixtures.
- No response-time or fix-time SLA.
- Security reports use the private channel in `SECURITY.md`.
- If maintenance stops, the Store item will be unpublished or marked unsupported rather than left silently broadening risk.

### 12.9 Badges

Useful compact badges:

- CI status;
- Chrome Web Store version/link after publication;
- license;
- latest release;
- optional “no telemetry” static badge if the linked privacy policy backs it.

Avoid dependency-count, code-size, stars, downloads, coverage, activity, and seven custom badges trying to reassure users through sheer chromatic density. A repository without badges is not abandoned, but three truthful ones do stop it looking emotionally evacuated.

---

## 13. Recommended first release

### 13.1 Trailer Lens 1.0 must include

#### Surface

- standalone `github.com/<owner>/<repo>/commit/<sha>` pages;
- equivalent commit-detail routes reached from repository and PR navigation;
- public and private qualification;
- current DOM variants encountered during implementation;
- narrow desktop layouts and GitHub light/dark/high-contrast behavior.

#### Evidence

- strict final trailer-block parser;
- exact raw block and source order;
- repeated keys;
- continuations;
- common friendly labels;
- unknown custom keys visible by default;
- nearby malformed trailer-shaped evidence;
- unique `Co-authored-via` / `Co-authored-by` pairing;
- raw/copy actions;
- clear distinction from native signature state.

#### Safety

- no native DOM mutation;
- idempotent owned sibling;
- soft-navigation and lazy-render handling;
- hard parser/performance bounds;
- text-only rendering;
- no network, token, backend, analytics, or remote code;
- versioned settings and migration tests.

#### Product

- options page;
- original icons;
- privacy/security/contribution/release documentation;
- deterministic package;
- Store listing assets;
- CI, release candidate, and staged Store workflows;
- rollback procedure;
- public live canaries and private RC qualification.

### 13.2 Qualification-gated inclusions

Repository commit/history lists and PR Commits lists may join 1.0 **only** if all acceptance gates pass during the implementation:

1. full canonical message is already present in the current page DOM;
2. no API or hidden endpoint is required;
3. each message can be mapped deterministically to one commit;
4. long/collapsed/lazy variants work;
5. adapter fixtures cover observed variants;
6. repeated units remain performant;
7. no selector depends on generated class soup when a semantic anchor exists;
8. private pages qualify.

If any gate fails, omit the surface without treating the product as incomplete. Commit detail remains the canonical escape hatch.

### 13.3 Explicit 1.0 non-goals

- editing, adding, repairing, or validating commits on the server;
- creating co-author trailers or merge-message UI;
- deciding whether a named person really authored/reviewed/tested anything;
- account lookup by email;
- avatars;
- GitHub OAuth or personal access tokens;
- GitHub REST/GraphQL requests;
- backend, remote configuration, telemetry, analytics, or crash reporting;
- repository-specific identity databases;
- custom grouping/pairing DSL;
- arbitrary URL linkification;
- GitHub Enterprise Server;
- Firefox, Safari, mobile Chrome, or Edge Store publication promises;
- PR timeline, blame, profile, activity, or notification surfaces;
- changing contribution graphs;
- cryptographic signature verification;
- DCO policy enforcement;
- a shared framework with GitHub Agent Faces.

### 13.4 Later possibilities, not promises

- qualified repository-history, PR Commits, and compare adapters;
- DOM-only account association when one-to-one mapping is provable;
- per-key presentation aliases and ordering if real users need them;
- repository-specific recognized-key hints for the mixed-block parser;
- Firefox packaging;
- GitHub Enterprise host configuration;
- export/import after settings become substantial;
- manual sanitized diagnostics export;
- additional hosting sites such as GitLab, only behind separate adapters and naming review.

### 13.5 Neighboring feature worth including now

**Copy the exact strict trailer block.**

It is cheap, generic, source-preserving, useful for bug reports/reviews, and reinforces the product’s central model. Excluding it would make the first release feel artificially austere.

Do not let that small win invite an editor. Copying evidence and composing commits are different products.

## 14. Risks, unresolved seams, and real product forks

### 14.1 Risk register

| Risk | Consequence | Mitigation | Trigger / reopen condition |
| --- | --- | --- | --- |
| GitHub DOM drift | Panel disappears or attaches incorrectly | Adapter isolation, fail closed, fixtures, public canaries, native-subtree invariant | Supported canary fails or user provides sanitized new layout |
| Full message absent on list surfaces | Incomplete/misleading trailer panel | Qualification gate; support commit detail first; no API fallback | GitHub exposes a stable complete message source in DOM |
| Parser claims false certainty | Footer prose or configured trailers mislabeled | Strict/default model, raw evidence, nearby/ambiguous diagnostics, Git oracle | Git changes documented grammar/recognition or users demonstrate common configured behavior |
| User-specific Git configuration | Browser output differs from local `interpret-trailers` | Explicit portable-default wording; no custom separator assumption | Real demand justifies repository-recognized-key hints |
| GitHub adds native generic trailers | Duplicate UI and reduced value | Detect/research native capability; keep product promise source-preserving | Native panel reaches parity on raw, custom, malformed, private behavior |
| Multiple co-authors map to one account | Exact coworker names hidden by native summary | Display exact commit values; no account inference | GitHub exposes deterministic per-entry associations in page DOM |
| Private content leaks through logs/support | Confidentiality incident | No network/logging/storage; sanitized diagnostics; issue-template warning | Any feature proposes remote diagnostics or account lookup |
| Malicious trailer value | XSS, phishing, broken layout | Text nodes only, no arbitrary links/images, bounds | Link enhancement proposed |
| Observer/performance regression | Slow GitHub pages | Batched roots, idempotency, owned-root ignore, limits, repeated-unit tests | New multi-commit surface added |
| Settings overgrowth | Migration/support burden | Tiny v1 schema; no alias/order/pairing DSL | Repeated user demand with concrete examples |
| Store permission concern | Lower installs or review delay | GitHub-only match, plain explanation, no extra permissions | Chrome offers reliable SPA reinjection with narrower access |
| Store review delay/rejection | Release timing uncertainty | Asynchronous state model, staged publication, independent GitHub release | Policy or review feedback changes listing/code |
| Publisher credential compromise | Malicious update across one or more items | WIF/OIDC, protected environment, no PR secrets, optional verified upload | Store auth model changes or publisher adds high-value items |
| Release rebuild differs from tested package | Unreviewed bits shipped | Build once, immutable artifact, digest verification, unpacked-package smoke | Toolchain cannot produce deterministic output |
| Rollback breaks settings | Known-good code fails on migrated profile | Forward/backward migration tests, non-destructive unknown-version handling | Schema change planned |
| One-owner maintenance stops | Extension silently rots on GitHub | Narrow scope, canaries, unpublish/deprecation policy, public source | Repeated breakage exceeds maintenance willingness |
| Name confusion/IP complaint | Rename or Store rejection | Original identity, descriptive subtitle, no GitHub marks, proportionate recheck | Same-category collision appears before publication |

### 14.2 Unverified technical seams for the implementation worker

These are research gaps to resolve with non-destructive qualification, not reasons to reopen the product:

1. **Exact raw-message DOM source on current commit detail.** Identify the element or embedded page data that preserves line boundaries and does not mix controls. Record selector rationale and fixtures.
2. **List-surface completeness.** Determine whether repository history and PR Commits contain full messages in the DOM under collapsed/lazy states.
3. **Native navigation events.** Confirm current Turbo/React event names, but retain URL-and-observer authority.
4. **Clipboard API.** Verify copy works on user gesture without `clipboardWrite`; omit per-row copy if permission would be required.
5. **Theme variables.** Confirm stable GitHub/Primer variables and forced-colors behavior.
6. **Staged Store final-release call.** Exercise the current API/dashboard state machine once against Wolf’s existing publisher setup and document the exact approved-to-published transition.
7. **GitHub OIDC to CWS service account.** Validate Workload Identity impersonation with a non-destructive API call before making it the required production path.
8. **Private DOM variants.** Run the release-candidate qualification in Wolf’s signed-in private repository.

### 14.3 Product forks that truly belong to Wolf or Nyxara

The research recommends defaults, so none of these block implementation work before the public-facing stage.

#### Name

- Recommended: **Trailer Lens**.
- Owner decision needed before icon, public repository, Store item, and listing assets are finalized.

#### License reciprocity

- Recommended: MIT.
- Choose MPL-2.0 only if keeping distributed modifications open is an actual priority rather than a generalized fondness for stronger licenses.

#### Public release timing

- Option A: publish GitHub release while Store review is pending, with honest status.
- Option B: hold the GitHub release draft for one coordinated launch.
- Both are technically supported; choose before the first release workflow is finalized.

#### Friendly compact email display

- Recommended: show the name only in compact view and reveal the exact email/raw value in details.
- This is a UX/privacy judgment worth screenshot review, not an architecture fork.

### 14.4 Decisions that should not be reopened casually

- no token/API/backend in 1.0;
- presentation only;
- raw evidence always available;
- malformed evidence stays distinct;
- no inferred account or authorship truth;
- commit-detail surface is sufficient for 1.0;
- no native DOM rewriting;
- no shared framework with GitHub Agent Faces;
- no runtime dependency tree;
- no analytics/telemetry default.

A future proposal may reopen one with new evidence. “It would be cool” is not new evidence. It is how software grows vestigial organs.

---

## 15. Practical implementation handoff

This section is intentionally concrete enough to seed one build-to-completion prompt for a fresh implementation worker.

### 15.1 Mission

Build and prepare for publication a public Chromium/Chrome Manifest V3 extension named provisionally **Trailer Lens** that adds a clear, accessible, source-preserving Git trailer panel to qualified GitHub commit-detail pages.

The worker continues through complete implementation, tests, documentation, icons/listing assets, deterministic packaging, and non-publishing release automation. It does not stop at a “first slice,” leave TODO stubs, create a Store item, install credentials, or publish externally.

### 15.2 Non-negotiable invariants

1. The Git commit message remains canonical.
2. The extension never edits a commit, repository, form, or native GitHub message node.
3. Trailer syntax is not authorship verification.
4. Strict Git-like trailers and nearby malformed candidates are separate models.
5. Unknown valid keys remain visible by default.
6. Raw exact evidence is inspectable and copyable.
7. `Co-authored-via` is route/context, not an author.
8. Pairing occurs only under the unique join-key rules in this report.
9. No GitHub token, API, backend, remote code, analytics, telemetry, avatar lookup, or account lookup.
10. Runtime uses only local packaged code, GitHub page DOM, and local settings.
11. Native DOM remains unchanged; only extension-owned sibling roots are added or removed.
12. Uncertain DOM means no output.
13. Every supported surface has deterministic fixtures and a live qualification path.
14. Release jobs never rebuild the package they publish.
15. Publication remains a protected explicit external effect.

### 15.3 Required source reading before implementation

Read these exact sources, not only this report:

- product room #96;
- provenance room #88, including the canary and GitHub Desktop evidence;
- donor-adoption room #104;
- complete donor repository at `0d6f20f5a5feaaac6ff86a6752a3d252986dddaa`;
- current Git trailer documentation and pinned `trailer.c`;
- current Chrome Manifest V3, permissions, storage, and Store policy/API sources in Appendix B.

Resolve mutable heads again at kickoff and record any material changes since 2026-08-20.

### 15.4 Required implementation sequence

#### 1. Repository foundation

- create the public-ready repository locally without publishing if publication is not authorized;
- establish TypeScript/tiny-build structure;
- add license, privacy, security, contributing, changelog, architecture, decisions, development, and release docs;
- add strict CI with no Store effects;
- create original icon source and generated sizes.

#### 2. Trailer domain

- encode immutable model and limits;
- implement strict scanner/parser;
- generate and commit Git oracle fixtures;
- implement known-key classifier and person values;
- implement nearby candidate diagnostics;
- implement unique `Co-authored-via` pairing;
- complete exhaustive unit/fixture tests before DOM integration.

#### 3. GitHub commit-detail adapter

- inspect current public commit pages non-destructively;
- identify full raw-message source and stable insertion anchor;
- record exact coordinates/date and selector rationale in `docs/DECISIONS.md`;
- create sanitized fixtures for all observed variants;
- implement adapter contract and fail-closed behavior.

#### 4. Reconciler and presentation

- implement GitHub-wide injection with in-code route gating;
- implement batched observation/navigation;
- add one owned sibling root per qualified commit;
- implement disclosures, rows, diagnostics, raw view, copy, themes, keyboard/focus behavior;
- listen for settings changes and remove/reconcile immediately;
- assert native DOM immutability and idempotency.

#### 5. Options and localization foundation

- implement versioned settings schema and migrations;
- add enabled/density/diagnostic/unknown/hidden-key controls;
- include privacy explanation and reset;
- centralize English strings;
- test storage corruption, future versions, and focus/status behavior.

#### 6. Conditional adapters

- investigate repository history and PR Commits;
- include each only if every qualification gate in section 13.2 passes;
- otherwise document the rejected surface and why commit detail remains the supported path;
- do not add API fallback.

#### 7. Browser, accessibility, and live qualification

- load the actual packaged extension in Chromium;
- complete local fixture browser suite;
- run axe, keyboard, forced-colors, narrow, and zoom checks;
- create public canary commits/repository only if separately authorized; otherwise prepare exact fixture/spec instructions;
- run a private-repository RC check manually without recording private identifiers.

#### 8. Public project material

- finish README and screenshots using actual deterministic fixtures;
- finish Store description, permission explanation, privacy text, category, support link, and affiliation wording;
- run a final name/title collision recheck;
- generate release notes for 1.0.0.

#### 9. Package and release automation

- create deterministic package/inventory/checksum scripts;
- verify the unpacked ZIP in browser tests;
- add release-candidate, Store-submit, Store-publish, and release-finalize workflows with full-SHA actions and minimal permissions;
- document service account, WIF, fallback key, revocation, staged publication, rejection, cancellation, and rollback;
- do not add real credential values or perform Store calls during implementation unless separately authorized.

#### 10. Completion audit

- run all deterministic suites from a clean clone;
- inspect final ZIP manually;
- compare manifest permissions to documentation/listing;
- verify no remote requests, logging, secrets, TODOs, disabled tests, or unsupported claims;
- confirm every 1.0 criterion below;
- produce one final implementation report with package digest and remaining external owner actions.

### 15.5 Definition of done

The implementation is complete only when:

- all section 13.1 capabilities exist;
- unsupported conditional surfaces are explicitly omitted/documented rather than half-implemented;
- parser behavior matches committed Git oracle fixtures;
- malformed blank-line evidence is clearly distinguished;
- one/multiple/repeated/custom trailers render correctly;
- native message/author/signature DOM remains unchanged;
- soft navigation, lazy insertion, rerender, disable, and settings changes are idempotent;
- no extension-originated network request occurs in browser tests;
- options and content UI pass automated accessibility checks and manual keyboard review;
- public/private RC qualification is recorded without private data;
- built ZIP is deterministic, allowlisted, checksumed, unpacked, and browser-tested;
- repository documentation is coherent and current;
- Store listing assets reflect the shipped UI;
- release automation is prepared but has performed no unauthorized external effect;
- rollback instructions and migration compatibility are tested;
- no TODO, FIXME, skipped test, placeholder icon, fake screenshot, or “later” stub remains inside the accepted 1.0 scope.

### 15.6 Acceptance specimens

At minimum, the final fixture gallery should make these cases visible:

#### Ordinary people-oriented block

```text
Improve retry behavior

Reviewed-by: Alex Rivera <alex@example.com>
Tested-by: Sam Lee <sam@example.com>
Signed-off-by: Morgan Chen <morgan@example.com>
```

#### Custom and repeated metadata

```text
Record deployment provenance

Build-Context: windows-x64 | release
Link: urn:example:run:42
Link: urn:example:artifact:17
Change-Id: I0123456789abcdef
```

#### Valid named coworker route

```text
Fix agent session recovery

Co-authored-via: Claude Opus 5 | Claude Code | Opus 5 | High
Co-authored-by: Claude Opus 5 <noreply@anthropic.com>
```

#### Valid multi-identity route

```text
Integrate review findings

Co-authored-via: Tala | Claude Code | Fable 5 | High
Co-authored-via: Juno | Claude Code | Opus 5 | Max
Co-authored-by: Tala <tala@example.com>
Co-authored-by: Juno <juno@example.com>
```

#### Malformed split

```text
Preserve route evidence

Co-authored-via: Juno | Claude Code | Opus 5 | Max

Co-authored-by: Juno <juno@example.com>
```

#### Footer-shaped prose control

```text
Describe the rollout

Thing: this is prose
Another: still prose
```

The last specimen should parse syntactically under Git-like rules and be presented as exact evidence without pretending `Thing` is a standardized fact.

### 15.7 Implementation decisions to record durably

`docs/DECISIONS.md` should include at least:

- why all GitHub pages are matched and gated in code;
- why no service worker/API/token exists;
- exact commit-detail raw-message and anchor selectors;
- strict/default parser contract and config limitations;
- nearby diagnostic bounds;
- `Co-authored-via` pairing rule;
- no native DOM mutation;
- TypeScript/tiny-build choice;
- no runtime dependencies;
- settings schema/version policy;
- live-canary advisory policy;
- deterministic package/release separation;
- Store credential and staged-publish model;
- rejected list surfaces if they fail qualification.

### 15.8 Handoff result Nyxara should be able to write later

After this research, Nyxara can write one implementation kickoff that says, in substance:

> Build Trailer Lens to complete 1.0. Use the exact source coordinates and decisions in this report. Do not stop at a prototype. Do not broaden into API/auth/account lookup. Qualify optional GitHub surfaces against hard DOM gates. Finish code, tests, docs, assets, deterministic package, and non-publishing release automation. Leave only the genuine external owner actions: public repository creation if not authorized, Store item/listing creation, credential connection, review submission, and publication.

That is enough specificity to prevent a fresh worker from spending its first day re-deciding the product and its second day adding a service worker because one tutorial had one.

---

## Appendix A. Direct Git trailer experiment record

### A.1 Environment

```text
Date: 2026-08-20
Git: 2.47.3
Command: git interpret-trailers --parse < fixture.txt
Cross-check: current Git documentation and git/git@1a3e64c6c4a623626ff0687008732a8e007e2a1c
```

### A.2 Core fixtures and outputs

#### Standard final block

```text
Subject

Body.

Reviewed-by: Alice <alice@example.com>
Tested-by: Bob <bob@example.com>
```

Output:

```text
Reviewed-by: Alice <alice@example.com>
Tested-by: Bob <bob@example.com>
```

#### No preceding blank line

```text
Subject
Body.
Reviewed-by: Alice <alice@example.com>
```

Output: empty.

#### Blank line inside intended paired block

```text
Subject

Body.

Co-authored-via: Juno | Claude Code | Opus 5 | Max

Co-authored-by: Juno <juno@example.com>
```

Output:

```text
Co-authored-by: Juno <juno@example.com>
```

#### Unknown mixed footer at one of four lines

```text
Subject

Body.

Co-authored-via: Juno | Claude Code
ordinary prose one
ordinary prose two
ordinary prose three
```

Output: empty.

#### Recognized `Signed-off-by` mixed footer at one of four lines

```text
Subject

Body.

Signed-off-by: Alice <alice@example.com>
ordinary prose one
ordinary prose two
ordinary prose three
```

Output:

```text
Signed-off-by: Alice <alice@example.com>
```

#### Default `=` separator control

```text
Subject

Body.

Reviewed-by=Alice <alice@example.com>
```

Output: empty.

#### Continuations

```text
Subject

Body.

Context: first line
 second line
	third line
Reviewed-by: Alice <alice@example.com>
```

Output:

```text
Context: first line second line third line
Reviewed-by: Alice <alice@example.com>
```

#### Repeated keys and casing

```text
Subject

Body.

Reviewed-by: Alice <alice@example.com>
reviewed-BY: Bob <bob@example.com>
Reviewed-by: Alice <alice@example.com>
```

Output preserves all three lines and casing.

#### Divider

```text
Subject

Body.

Reviewed-by: Alice <alice@example.com>
---
patch-like content
Fixes: not-a-commit-trailer
```

Output:

```text
Reviewed-by: Alice <alice@example.com>
```

#### Footer-shaped prose

```text
Subject

Thing: this is prose
Another: still prose
```

Output:

```text
Thing: this is prose
Another: still prose
```

### A.3 Key and spacing controls

| Control | Output |
| --- | --- |
| leading whitespace before key | empty |
| internal whitespace in key | empty |
| spaces between key and `:` | parsed |
| tab after `:` | parsed |
| empty value | parsed |
| hyphenated key | parsed |
| underscore key | empty |
| dotted key | empty |
| Unicode key | empty |
| default comment line beside valid trailer | comment omitted; valid trailer parsed |
| unknown 25% mixed group | empty |
| one-line subject `Reviewed-by: X` | empty |
| leading blank then `Reviewed-by: X` | parsed |

### A.4 Product conclusions from the oracle

- The blank-line malformed control is not hypothetical.
- A colon regex is insufficient.
- Unknown custom keys are valid in all-trailer final blocks.
- Configured-key behavior cannot be perfectly reconstructed in a browser.
- Repeats, casing, raw lines, and continuations are evidence worth preserving.
- Syntactic parsing never proves the semantic truth of a trailer.

---

## Appendix B. Source register

### B.1 Wolf repositories and donor

- [`Wolfsblvt/emergency-meeting#96`][room-96] — current product room and boundaries.
- [`Wolfsblvt/emergency-meeting#88`][room-88] — provenance convention, canaries, malformed control, Web/Desktop rendering evidence.
- [`Wolfsblvt/emergency-meeting#104`][room-104] — completed donor-adoption record.
- [`Wolfsblvt/github-agent-faces@0d6f20f5…`][donor-commit] — exact accepted donor.
- [Donor manifest][donor-manifest].
- [Donor shared configuration model][donor-config].
- [Donor content-script engine][donor-content].
- [Donor options UI][donor-options] and [options styling][donor-options-css].
- [Donor architecture][donor-architecture].
- [Donor decisions][donor-decisions].
- [Donor pure-logic tests][donor-config-tests].
- [Donor DOM harness][donor-harness].
- [Donor development, test, screenshot, and packaging route][donor-development].

### B.2 Git primary sources

- [`git interpret-trailers` documentation][git-interpret].
- [Git pretty formats, including `%(trailers)`][git-pretty].
- [Git `SubmittingPatches` trailer conventions][git-submitting].
- [Current pinned Git trailer implementation][git-source].
- [Linux kernel patch trailer semantics][linux-posting].
- [Gerrit `Change-Id` footer documentation][gerrit-change-id].

### B.3 GitHub primary sources

- [Creating commits with multiple authors][github-coauthors].
- [GraphQL `Commit` reference][github-graphql-commit].
- [REST Git commit object][github-rest-git-commit].
- [Commit signature verification status][github-signatures].
- [GitHub Actions OIDC][github-oidc].
- [GitHub environments and required reviewers][github-environments].
- [Artifact attestations][github-attestations].
- [Security hardening for GitHub Actions][github-actions-hardening].

### B.4 Chrome extension and Store primary sources

- [Manifest V3 overview and migration][chrome-mv3].
- [Manifest V3 remote-code requirements][cws-mv3-policy].
- [Declare permissions][chrome-permissions].
- [`chrome.storage` reference][chrome-storage].
- [Chrome Web Store privacy policy][cws-privacy-policy].
- [Limited-use requirements][cws-limited-use].
- [Privacy dashboard guidance][cws-privacy-dashboard].
- [Permission policy][cws-permissions-policy].
- [Preparing an extension package][cws-prepare].
- [Store listing guidance][cws-listing].
- [Publisher account setup][cws-account].
- [Store review process][cws-review].
- [Canceling review][cws-cancel-review].
- [Chrome Web Store API v2][cws-api].
- [API v2 media upload][cws-api-upload].
- [API v2 publish method][cws-api-publish].
- [Service accounts][cws-service-accounts].
- [Updates, staged publishing, and rollout][cws-update].
- [Rollback][cws-rollback].
- [Verified uploads][cws-verified-uploads].
- [Impersonation and intellectual-property policy][cws-ip-policy].

### B.5 Credential and accessibility primary sources

- [Google Workload Identity Federation for deployment pipelines][google-wif].
- [WAI disclosure pattern][wai-disclosure].

### B.6 Adjacent specimens

- [Refined GitHub at the pinned current coordinate][refined-github].
- [Better GitHub Co-Authors][cws-better-coauthors].
- [GitHub Tags on Commits][cws-tags].
- [GitHub Git Notes Viewer][cws-notes-viewer].
- [GitNotes][cws-gitnotes].
- [Graph Tab for GitHub][cws-graph-tab].
- [Git Graph for GitHub][cws-git-graph].

---

## Conclusion

Trailer Lens should exist.

Its strength is not that it knows more than Git. Its strength is that it refuses to know less while presenting the evidence better.

The product has a coherent 1.0 boundary, a low-trust-surface runtime, a parser model grounded in Git rather than punctuation, a donor architecture worth learning from without copying its product assumptions, and a current Store delivery path that supports real staged automation without handing publication to an unreviewed workflow.

The implementation can now begin without reopening the central questions. The remaining uncertainty lives where it belongs: current GitHub adapters, one-time Store account setup, and a few public-facing owner choices. Everything else is ordinary work, which is the nicest thing research can eventually turn into.

<!-- Reference links -->

[room-96]: https://github.com/Wolfsblvt/emergency-meeting/issues/96
[room-88]: https://github.com/Wolfsblvt/emergency-meeting/issues/88
[room-104]: https://github.com/Wolfsblvt/emergency-meeting/issues/104
[donor-commit]: https://github.com/Wolfsblvt/github-agent-faces/tree/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa
[donor-manifest]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/manifest.json
[donor-config]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/src/config.js
[donor-content]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/src/content.js
[donor-options]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/src/options.html
[donor-options-css]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/src/options.css
[donor-readme]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/README.md
[donor-architecture]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/docs/ARCHITECTURE.md
[donor-decisions]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/docs/DECISIONS.md
[donor-config-tests]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/tests/config.test.mjs
[donor-harness]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/tests/harness/runner.js
[donor-development]: https://github.com/Wolfsblvt/github-agent-faces/blob/0d6f20f5a5feaaac6ff86a6752a3d252986dddaa/docs/DEVELOPMENT.md
[canary-linked]: https://github.com/Wolfsblvt/emergency-meeting/commit/9365a14
[canary-unlinked]: https://github.com/Wolfsblvt/emergency-meeting/commit/742d85a
[canary-multi]: https://github.com/Wolfsblvt/emergency-meeting/commit/4f8f372
[canary-malformed]: https://github.com/Wolfsblvt/emergency-meeting/commit/e74b94a
[git-interpret]: https://git-scm.com/docs/git-interpret-trailers
[git-pretty]: https://git-scm.com/docs/pretty-formats
[git-submitting]: https://git-scm.com/docs/SubmittingPatches
[git-source]: https://github.com/git/git/blob/1a3e64c6c4a623626ff0687008732a8e007e2a1c/trailer.c
[linux-posting]: https://www.kernel.org/doc/html/next/process/5.Posting.html
[gerrit-change-id]: https://gerrit-review.googlesource.com/Documentation/user-changeid.html
[github-coauthors]: https://docs.github.com/en/pull-requests/how-tos/commit-changes/creating-a-commit-with-multiple-authors
[github-graphql-commit]: https://docs.github.com/en/enterprise-cloud%40latest/graphql/reference/commits
[github-rest-git-commit]: https://docs.github.com/en/rest/git/commits?apiVersion=2022-11-28
[github-signatures]: https://docs.github.com/en/authentication/troubleshooting-commit-signature-verification/checking-your-commit-and-tag-signature-verification-status
[github-oidc]: https://docs.github.com/en/actions/concepts/security/openid-connect
[github-environments]: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
[github-attestations]: https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations
[github-actions-hardening]: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
[chrome-mv3]: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
[cws-mv3-policy]: https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
[chrome-permissions]: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
[chrome-storage]: https://developer.chrome.com/docs/extensions/reference/api/storage
[cws-privacy-policy]: https://developer.chrome.com/docs/webstore/program-policies/privacy
[cws-limited-use]: https://developer.chrome.com/docs/webstore/program-policies/limited-use
[cws-privacy-dashboard]: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
[cws-permissions-policy]: https://developer.chrome.com/docs/webstore/program-policies/permissions
[cws-prepare]: https://developer.chrome.com/docs/webstore/prepare
[cws-listing]: https://developer.chrome.com/docs/webstore/best-listing
[cws-account]: https://developer.chrome.com/docs/webstore/set-up-account
[cws-review]: https://developer.chrome.com/docs/webstore/review-process
[cws-cancel-review]: https://developer.chrome.com/docs/webstore/cancel-review
[cws-api]: https://developer.chrome.com/docs/webstore/api
[cws-api-upload]: https://developer.chrome.com/docs/webstore/api/reference/rest/v2/media/upload
[cws-api-publish]: https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish
[cws-service-accounts]: https://developer.chrome.com/docs/webstore/service-accounts
[cws-update]: https://developer.chrome.com/docs/webstore/update
[cws-rollback]: https://developer.chrome.com/docs/webstore/rollback
[cws-verified-uploads]: https://developer.chrome.com/docs/webstore/update#verified-uploads
[cws-ip-policy]: https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property
[google-wif]: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
[wai-disclosure]: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
[refined-github]: https://github.com/refined-github/refined-github/tree/cc22fe3434b082a982da1efcfbd4f14b4518c747
[cws-better-coauthors]: https://chromewebstore.google.com/detail/better-github-co-authors/nkemoipciaomkemfjbhfbcokpacdofnb
[cws-tags]: https://chromewebstore.google.com/detail/github-tags-on-commits/gdhejonbolabkbkobjjhgmogfkngdjck
[cws-notes-viewer]: https://chromewebstore.google.com/detail/github-git-notes-viewer/bcfpccehindpaimfanpnonhjihmkhhjh
[cws-gitnotes]: https://chromewebstore.google.com/detail/gitnotes/inhgnndenedfophhcbpjdocjkdgomklm
[cws-graph-tab]: https://chromewebstore.google.com/detail/graph-tab-for-github/lailhjbpeagafdaegmhfolhehjgegead
[cws-git-graph]: https://chromewebstore.google.com/detail/git-graph-for-github/aefcglaagejjdkamokohaboigidhilcn
