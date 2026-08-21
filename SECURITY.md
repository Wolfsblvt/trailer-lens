# Security policy

This document says how to report a security problem in Trailer Lens and what the extension's security model is.

## Reporting a vulnerability

Please use **GitHub private vulnerability reporting** on this repository (Security → Report a vulnerability). You will
get a response from the maintainer; there is no response-time guarantee, but security reports are read first.

Please do not open public issues for suspected vulnerabilities, and never include confidential commit content from
private repositories in a report — sanitized reproductions are always sufficient.

## Security model, briefly

- The extension runs only on `github.com` pages, with the `storage` permission and nothing else.
- Commit messages are attacker-controlled input: they are parsed with hard bounds and rendered exclusively through
  text nodes — never HTML, never links.
- The extension makes no network requests and executes no remote code; both properties are enforced statically (lint)
  and dynamically (tests), and the shipped package is scanned before release.
- The extension adds and removes only its own marked elements; native GitHub content is never modified.
- Release packages are built once, checksummed, provenance-attested, and published without rebuilding.

In scope for reports: anything that violates the properties above, or any way a crafted commit message, repository, or
page can make the extension misbehave. Out of scope: GitHub itself, and social-engineering scenarios that do not
involve the extension's code.
