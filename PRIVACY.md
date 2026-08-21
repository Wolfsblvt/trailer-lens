# Privacy policy

This is the complete privacy policy for the Trailer Lens browser extension. It is intentionally short because the
extension is intentionally simple.

## What Trailer Lens reads

Trailer Lens reads the commit-message text on GitHub pages you are already viewing, solely to find and display that
commit's trailers on the same page. That is the whole feature, and reading the page it runs on is the only data access
the extension has.

Private repositories work for exactly one reason: your signed-in browser can already see the page. Trailer Lens has no
GitHub token, no API access, and no way to see anything you cannot.

## What Trailer Lens stores

Your settings — on/off, density, diagnostics, unknown keys, hidden keys — in Chrome's local extension storage on your
device. Nothing else. Specifically never stored: commit messages, parsed trailers, commit SHAs, repository names,
URLs, or any browsing history. Uninstalling the extension removes the stored settings.

## What Trailer Lens sends

Nothing, to anyone, ever. The extension makes no network requests of any kind: no backend, no analytics, no
telemetry, no crash reporting, no update pings, no remote configuration, no external fonts, images, or avatars. This
is enforced in code (a static lint gate forbids network APIs in the source) and verified in tests (the browser suite
fails on any extension-originated request; the packaged archive is scanned for network calls and remote URLs).

## What changes this policy

Only a new extension version can change any of this, and a change to what is read, stored, or sent would be stated in
the changelog and in the Chrome Web Store listing before you receive it.

## Reporting

If you believe the extension is doing anything not described here, that is a bug worth reporting:
open an issue in the repository. Please never paste confidential commit messages into a public issue — a sanitized
reproduction is always enough.
