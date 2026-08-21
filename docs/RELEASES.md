# Releases

This document owns the release model: how a version becomes a package, a GitHub release, and a Chrome Web Store
release, which parts are automated, which are proven versus prepared, and how failure states are handled. The
workflows under `.github/workflows/` implement it.

## Version truth

`package.json` is the single version source. The build verifies `manifest.json` agrees; the release-candidate
workflow verifies the tag (`vX.Y.Z`) and a matching `CHANGELOG.md` section; the package is named
`trailer-lens-X.Y.Z.zip` with a sibling `.sha256` and `.inventory.json`. One version, one coherent chain:

```text
source vX.Y.Z
  -> immutable deterministic candidate (built once, attested)
  -> draft GitHub release vX.Y.Z (assets: zip, sha256, inventory)
  -> published GitHub release        = the official side-load release
  -> Store upload of the same zip -> review -> staged -> published
```

These are distinct states linked by version and digest — never one pretended transaction. The GitHub release is
published when the candidate is verified complete; the Store follows its own review schedule against the same bytes.

## The workflows

| Workflow | Trigger | May do | May never do |
| --- | --- | --- | --- |
| `ci.yml` | push/PR | full verification, reproducibility proof, preview artifact | touch secrets, publish anything |
| `release-candidate.yml` | `v*` tag | build once, verify, attest, create/refresh the **draft** release | publish the release, reach Store credentials |
| `store-submit.yml` | manual | download the exact draft asset, verify digest + attestation, upload to the existing Store item, submit for review as **`STAGED_PUBLISH`** with warnings surfaced, report status | rebuild, publish the GitHub release, publish on the Store (an approved staged submission stays staged) |
| `store-status.yml` | manual | fetch and record the truthful item state before/after the owner's Dashboard publication | publish, upload, rebuild, touch GitHub releases, use the rollout-percentage endpoint (it only adjusts an already-published revision and is gated to >10k-user items) |
| `release-finalize.yml` | manual | publish the draft GitHub release with an honest Store-status line | infer Store state |
| `oracle-drift.yml` | monthly | regenerate the Git oracle and report drift | gate anything |

Store workflows run in the protected `chrome-web-store` environment (required reviewer: the owner) and share a
concurrency group so submit and publish can never interleave. Third-party actions are pinned to full commit SHAs;
workflow permissions are minimal per job.

## Proven versus prepared

- **Proven** (exercised in this repository): CI, deterministic packaging and reproducibility, package verification,
  packaged browser smoke, draft-release asset flow, screenshots generation.
- **Prepared, not yet proven against the live publisher account:** everything that needs a real Chrome Web Store item
  or credential — the upload, submit, staged publish, and status calls. They implement the current documented API v2
  (`chromewebstore.googleapis.com`, `publishers/{publisher}/items/{item}` methods `:upload`, `:publish`,
  `:fetchStatus`, `:cancelSubmission`, `:setPublishedDeployPercentage`) and fail with a clear message until the
  one-time setup below exists. The first submission validates them; until then, treat the Store lane as documented
  capability, not proven automation.

## One-time Chrome Web Store setup (owner)

The Store API operates on an **existing** item; creating it is deliberate dashboard work:

1. In the [developer dashboard](https://chrome.google.com/webstore/devconsole), verify the publisher account (display
   name, contact email, two-step verification).
2. Create the item: upload a package ZIP manually once so the item exists. This **seed revision is never submitted
   or published** — it only creates the item the API operates on. The version the public ultimately receives is
   whatever accepted release ZIP `store-submit.yml` later uploads and submits.
3. Complete the listing from `assets/store/listing.md`: title, descriptions, category, screenshots
   (`assets/store/screenshots/`), promo images (`assets/store/promo/`), support/homepage links, and the privacy
   declarations exactly as written there.
4. Record the **publisher ID** and **item ID** as repository variables `CWS_PUBLISHER_ID` and `CWS_ITEM_ID`
   (they are identifiers, not secrets).
5. Create the `chrome-web-store` **environment** with yourself as required reviewer.
6. Credentials, preferred route — Workload Identity Federation (no stored key):
   - create a Google Cloud service account; add its email as an API access delegate on the publisher account per the
     current [service-account guide](https://developer.chrome.com/docs/webstore/service-accounts);
   - create a Workload Identity Pool + GitHub OIDC provider restricted to this exact repository (and, ideally, the
     `chrome-web-store` environment claim);
   - allow the pool to impersonate the service account;
   - set `CWS_WIF_PROVIDER` (full provider resource name) and `CWS_SERVICE_ACCOUNT` (email) as environment variables.
7. Fallback route (only if WIF is disproportionate): a classic OAuth client + refresh token stored **only** as
   environment secrets `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_REFRESH_TOKEN`; rotate after setup and on any
   suspicion; plan the migration to WIF.
8. Validate with one `store-submit.yml` dispatch for a real version; record the observed status transitions here,
   including the staged state after approval. **Publication of the approved staged submission is an explicit owner
   action in the Developer Dashboard** — deliberately not automated; `store-status.yml` records the truthful state
   before and after that decision.

## Failure states, honestly

- **Upload accepted ≠ submitted; submitted ≠ approved; approved ≠ published.** `fetchStatus` is the truth; the
  workflows print it and never claim more.
- **Rejection:** keep the rejected package and feedback; fix on a new version; new tag, new candidate. Never replace
  assets under an existing tag or edit notes to imply the rejected package shipped.
- **Wrong submission:** use the cancel-review route (`:cancelSubmission`) rather than racing a second upload;
  cancellations are currently limited per publisher per day.
- **Staged expiry:** an approved staged submission that is never released eventually returns to draft; resubmit.
- **Rollback:** the Store's rollback republishes the previous package under a higher version without a full review.
  Settings are downgrade-safe by design (older schema versions validate field-by-field and never destroy unknown
  newer data — covered by tests), so a rollback cannot corrupt user profiles. Every submitted zip and digest stays on
  its GitHub release for exact re-verification.
- **Credential suspicion:** revoke the service-account key/refresh token at Google, remove environment secrets, and
  rotate; the repository itself never contains credentials.

## Side-load release

The published GitHub release is a complete, verified installation channel: download the zip, verify it against the
`.sha256` asset, extract, and load the folder via `chrome://extensions` → Developer mode → Load unpacked. Side-loaded
copies do not auto-update.
