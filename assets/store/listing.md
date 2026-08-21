# Chrome Web Store listing

This file keeps the Store listing versioned with the repository: the dashboard form is what Google receives, this is
the copy source it is filled from, per version. The asset inventory at the end states how every image was produced.

## v1.0.0

### Title

```text
Trailer Lens: Commit Trailers for GitHub
```

### Summary (≤132 characters)

```text
Shows Git commit trailers clearly on GitHub commit pages: co-authors, reviews, sign-offs, and custom metadata. Local-only, no tracking.
```

### Description

```text
GitHub does not always make the full structure of a commit's trailers easy to see. Co-authors collapse into a summary header, custom keys sit unread in the raw message, and one stray blank line can silently drop a line from what Git itself considers the trailer block — while the page looks perfectly healthy.

Trailer Lens adds a compact panel to GitHub commit pages showing the trailer evidence the commit actually contains:

- Co-authors with their exact names as written in the commit, even where the native header collapses several people into one account.
- Reviews, sign-offs, tests, references — Reviewed-by, Signed-off-by, Acked-by, Tested-by, Fixes, Change-Id, and friends, labeled for scanning with the exact key always available.
- Custom team conventions: unknown trailer keys stay visible by default. They are evidence, not noise.
- Route context: a Co-authored-via line (as used by AI pair-programming setups) is paired with its co-author when the relation is unambiguous.
- Malformed evidence: a trailer-shaped line separated from the final block is shown as exactly that, instead of silently disappearing the way it does in git interpret-trailers.
- The exact raw block, copyable, with source order, casing, and spacing preserved.

The commit message remains the source of truth. Trailer Lens never claims a trailer is verified or true — trailers are declarations stored in the commit, and the panel shows them as such, clearly separated from GitHub's native signature status.

Everything runs in your browser. Trailer Lens uses no GitHub token, no API calls, no backend, no analytics, no telemetry, and no remote code. It never edits commits, repository content, or any native GitHub element. Private repositories work because your signed-in browser can already see the page — the extension has no access of its own.

Works on commit pages (github.com/owner/repo/commit/…) in light, dark, and high-contrast themes, with full keyboard access.

Trailer Lens is an independent open-source project (AGPL-3.0-or-later) and is not affiliated with or endorsed by GitHub.
```

### Category

Developer Tools

### Language

English

### Links

- Homepage / source: `https://github.com/Wolfsblvt/trailer-lens`
- Support: `https://github.com/Wolfsblvt/trailer-lens/issues`
- Privacy policy: `https://github.com/Wolfsblvt/trailer-lens/blob/main/PRIVACY.md`

### Privacy dashboard declarations

- **Single purpose:** Display the Git commit trailers already present in commit messages on GitHub commit pages.
- **Permission justification — `storage`:** Stores the user's own settings (enable, density, diagnostics, unknown
  keys, hidden keys) locally. No other data is stored.
- **Host access justification — content script on `https://github.com/*`:** The extension's sole purpose is reading
  commit messages on GitHub pages the user is viewing and rendering their trailers on the same page. It matches the
  whole origin because GitHub navigates between pages without reloads; the code gates to commit routes and does
  nothing elsewhere. No data leaves the page.
- **Data usage:** The extension reads website content (commit-message text) transiently in-page to provide the
  feature. It does **not** collect, store, transmit, sell, or share any user or website data. No analytics, no
  telemetry, no remote code.

### Asset inventory

| Asset | Produced by |
| --- | --- |
| `assets/icons/icon-{16,32,48,128}.png` | `npm run assets:generate` from `assets/source/icon.svg` (original artwork) |
| `assets/store/promo/small-promo-440x280.png` | same script, from `assets/source/promo-small.svg` |
| `assets/store/promo/marquee-promo-1400x560.png` | same script, from `assets/source/promo-scene.svg` |
| `assets/social/github-social-preview-1280x640.png` | same script, from `assets/source/promo-scene.svg` |
| `assets/store/screenshots/01…05.png` | `node scripts/generate-screenshots.mjs` — the real built extension running in Chromium on staged, sanitized commit-page fixtures (served under github.com URLs via route interception). Every panel pixel is the actual product; the surrounding page shell is a deterministic fixture so screenshots stay reproducible and free of third-party content. |

Screenshot captions for the dashboard:

1. `01-before-after.png` — The same commit without and with Trailer Lens.
2. `02-paired-co-author.png` — Co-author with paired route context, exactly as stored in the commit.
3. `03-generic-trailers.png` — Reviews, tests, sign-offs, Change-Id, and custom keys.
4. `04-malformed-evidence.png` — A stray blank line silently drops a trailer for Git; Trailer Lens shows it.
5. `05-settings-dark.png` — Settings with live preview, dark mode. Local-only, no tracking.
