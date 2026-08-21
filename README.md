# Trailer Lens

[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)](LICENSE)

> **Trailer Lens makes a commit's fine print readable: the co-authors, reviews, sign-offs, and custom metadata that GitHub leaves buried in the raw message.**

Trailer Lens is a Chrome extension (Manifest V3) that adds a compact, accessible panel to GitHub commit pages showing the commit's [Git trailers](https://git-scm.com/docs/git-interpret-trailers) — exactly as they are stored in the commit message, including repeated keys, unknown custom keys, and trailer-shaped lines that Git itself would silently ignore.

**Status: in development.** This repository is being built toward its first release (`1.0.0`). Nothing is published to the Chrome Web Store yet.

## What it will show

- **Co-authors** — every `Co-authored-by` line, with the exact name and value from the commit, even where GitHub's own header collapses several people into one account.
- **Reviews, sign-offs, tests** — `Reviewed-by`, `Signed-off-by`, `Acked-by`, `Tested-by`, and friends, labeled for scanning with the exact key always available.
- **Custom metadata** — unknown trailer keys stay visible by default. Your team's conventions are evidence, not noise.
- **Malformed evidence** — a trailer-shaped line separated from the final block (for example by a stray blank line) is shown as exactly that, instead of silently disappearing the way it does in `git interpret-trailers`.
- **The raw block** — the exact trailer lines, copyable, with source order, casing, and spacing preserved.

## What it never does

- It never edits commits, repository content, or any native GitHub element.
- It never claims a trailer is verified or true — trailers are declarations stored in the commit, and Trailer Lens shows them as such.
- It never talks to any server: no GitHub token, no API calls, no backend, no analytics, no telemetry, no remote code. Commit messages are read from the page you are already viewing and processed entirely in your browser.

## License

[AGPL-3.0-or-later](LICENSE). This project is licensed under AGPL-3.0-or-later to ensure that improvements to modified or redistributed versions remain available to users and the community.

Trailer Lens is an independent open-source project and is not affiliated with or endorsed by GitHub.
