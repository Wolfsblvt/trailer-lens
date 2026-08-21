/**
 * Authored commit-page fixtures for browser tests.
 *
 * Each fixture replicates exactly the structure the commit-detail adapter
 * qualifies against (see the adapter's selector rationale): the message
 * container with subject and optional body spans, the full-OID tree link,
 * and the `Commit <abbrev>` heading — plus the Primer variables both themes
 * define, so theming assertions are meaningful. Body content is authored as
 * GitHub renders it: pre-wrap text with real newlines, optionally containing
 * inline anchors for linkified specimens.
 */

export interface CommitFixture {
  readonly owner: string;
  readonly repo: string;
  /** Full 40-char lower-case OID. */
  readonly sha: string;
  readonly subject: string;
  /**
   * Rendered body HTML (what GitHub's renderer produced), or null for a
   * title-only commit. Fixture-authored, trusted test input.
   */
  readonly bodyHtml: string | null;
  readonly colorMode?: 'light' | 'dark';
}

export function fixtureUrl(fixture: CommitFixture): string {
  return `https://github.com/${fixture.owner}/${fixture.repo}/commit/${fixture.sha}`;
}

export function commitFixtureHtml(fixture: CommitFixture): string {
  const mode = fixture.colorMode ?? 'light';
  const abbrev = fixture.sha.slice(0, 7);
  const body =
    fixture.bodyHtml === null
      ? ''
      : `<span class="ws-pre-wrap extended-commit-description-container f6 wb-break-word text-mono mt-2">${fixture.bodyHtml}</span>`;
  return `<!doctype html>
<html lang="en" data-color-mode="${mode}" data-light-theme="light" data-dark-theme="dark">
<head>
<meta charset="utf-8">
<title>${escapeHtml(fixture.subject)} · ${fixture.owner}/${fixture.repo}@${abbrev} · fixture</title>
<style>
  :root, [data-color-mode="light"] {
    --fgColor-default: #1f2328; --fgColor-muted: #59636e;
    --borderColor-default: #d1d9e0; --borderColor-muted: #d1d9e0b3;
    --bgColor-default: #ffffff; --bgColor-muted: #f6f8fa;
    --bgColor-attention-muted: #fff8c5; --borderColor-attention-muted: #d4a72c66;
    --focus-outlineColor: #0969da;
    --fontStack-monospace: ui-monospace, Consolas, monospace;
  }
  [data-color-mode="dark"] {
    --fgColor-default: #f0f6fc; --fgColor-muted: #9198a1;
    --borderColor-default: #3d444d; --borderColor-muted: #3d444d80;
    --bgColor-default: #0d1117; --bgColor-muted: #151b23;
    --bgColor-attention-muted: #bb800926; --borderColor-attention-muted: #bb800966;
    --focus-outlineColor: #1f6feb;
  }
  body { margin: 0; padding: 0 24px 24px; background: var(--bgColor-default); color: var(--fgColor-default);
         font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 14px; }
  .topbar { margin: 0 -24px 16px; padding: 12px 24px; border-bottom: 1px solid var(--borderColor-default);
            background: var(--bgColor-muted); font-size: 14px; color: var(--fgColor-default); }
  .topbar b { font-weight: 600; }
  .ws-pre-wrap { white-space: pre-wrap; }
  .text-mono { font-family: var(--fontStack-monospace); }
  .f5 { font-size: 15px; font-weight: 600; }
  .f6 { font-size: 13px; }
  .mt-2 { margin-top: 10px; }
  .commit-box { border: 1px solid var(--borderColor-default); border-radius: 6px; padding: 14px 16px; max-width: 920px; }
  [class*="commitMessageContainer"] { display: flex; flex-direction: column; }
  h1 { font-size: 20px; margin: 12px 0 6px; }
  a { color: #0969da; text-decoration: none; font-size: 13px; }
  [data-color-mode="dark"] a { color: #4493f8; }
  .diff-area { margin-top: 16px; color: var(--fgColor-muted); }
</style>
</head>
<body>
<div class="prc-PageLayout-PageLayoutRoot-fixture">
  <div class="topbar"><b>${fixture.owner}</b> / <b>${fixture.repo}</b></div>
  <h1 class="prc-PageHeader-Title-fixture">Commit ${abbrev}</h1>
  <a href="/${fixture.owner}/${fixture.repo}/tree/${fixture.sha}" class="prc-Button-ButtonBase-fixture">Browse files</a>
  <div class="commit-box">
    <div class="CommitHeader-module__commitMessageContainer__fixt1">
      <span class="ws-pre-wrap f5 wb-break-word text-mono">${escapeHtml(fixture.subject)}</span>${body}
    </div>
  </div>
  <div class="diff-area">4 files changed</div>
</div>
</body>
</html>`;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Shared specimen: the paired multi-identity block plus generic keys. */
export const RICH_SHA = 'aaaa000000000000000000000000000000000001';
export const RICH_FIXTURE: CommitFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  sha: RICH_SHA,
  subject: 'Integrate review findings',
  bodyHtml: escapeHtml(
    [
      'Join the reviewed changes into one release candidate.',
      '',
      'Co-authored-via: Tala | Claude Code | Fable 5 | High',
      'Co-authored-via: Juno | Claude Code | Opus 5 | Max',
      'Co-authored-by: Tala <tala@example.com>',
      'Co-authored-by: Juno <juno@example.com>',
      'Reviewed-by: Alex Rivera <alex@example.com>',
      'Change-Id: I0123456789abcdef',
      'Build-Context: windows-x64 | release',
    ].join('\n'),
  ),
};

export const MALFORMED_SHA = 'aaaa000000000000000000000000000000000002';
export const MALFORMED_FIXTURE: CommitFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  sha: MALFORMED_SHA,
  subject: 'Preserve route evidence',
  bodyHtml: escapeHtml(
    ['Body of the malformed specimen.', '', 'Co-authored-via: Juno | Claude Code | Opus 5 | Max', '', 'Co-authored-by: Juno <juno@example.com>'].join(
      '\n',
    ),
  ),
};

export const PLAIN_SHA = 'aaaa000000000000000000000000000000000003';
export const PLAIN_FIXTURE: CommitFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  sha: PLAIN_SHA,
  subject: 'Ordinary commit without trailers',
  bodyHtml: escapeHtml('Just a body paragraph, nothing structured at the end.'),
};

export const TITLE_ONLY_SHA = 'aaaa000000000000000000000000000000000004';
export const TITLE_ONLY_FIXTURE: CommitFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  sha: TITLE_ONLY_SHA,
  subject: 'Update dependencies',
  bodyHtml: null,
};

export const HOSTILE_SHA = 'aaaa000000000000000000000000000000000005';
export const HOSTILE_FIXTURE: CommitFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  sha: HOSTILE_SHA,
  subject: 'Hostile trailer values',
  bodyHtml: escapeHtml(
    [
      'Body.',
      '',
      'Note: <script>window.__tl_xss = 1</script>',
      'Img: <img src=x onerror="window.__tl_xss = 2">',
      'Link: javascript:window.__tl_xss = 3',
    ].join('\n'),
  ),
};

/** Linkified specimen: GitHub shortened a URL into an issue reference. */
export const LINKED_SHA = 'aaaa000000000000000000000000000000000006';
export const LINKED_FIXTURE: CommitFixture = {
  owner: 'fixture-org',
  repo: 'fixture-repo',
  sha: LINKED_SHA,
  subject: 'Fix the reported crash',
  bodyHtml:
    escapeHtml('Body referencing the report.\n\n') +
    '<span class="issue-keyword">Fixes</span> <a class="issue-link" href="https://github.com/fixture-org/fixture-repo/issues/42">#42</a>' +
    escapeHtml('\n\nReviewed-by: Alex Rivera <alex@example.com>'),
};

// ----- Reference-surface fixtures (1.1 device-local memory) -----

export interface ReferenceFixture {
  readonly owner: string;
  readonly repo: string;
  /** Path part after the owner/repo, e.g. `blame/main/README.md`. */
  readonly routePath: string;
  /** Full-OID links rendered as qualified references. */
  readonly fullOids: readonly string[];
  /** Short-SHA links (must never receive a chip). */
  readonly shortShas?: readonly string[];
  /** A full-OID link inside a comment body (must never receive a chip). */
  readonly commentBodyOid?: string;
  readonly colorMode?: 'light' | 'dark';
}

export function referenceFixtureUrl(fixture: ReferenceFixture): string {
  return `https://github.com/${fixture.owner}/${fixture.repo}/${fixture.routePath}`;
}

export function referenceFixtureHtml(fixture: ReferenceFixture): string {
  const mode = fixture.colorMode ?? 'light';
  const rows = fixture.fullOids
    .map(
      (oid, i) => `<div class="ref-row" data-row="${i}">
        <a href="/${fixture.owner}/${fixture.repo}/commit/${oid}" class="ref-commit-link">${oid.slice(0, 7)}</a>
        <span class="ref-title">Referenced commit ${i + 1}</span>
      </div>`,
    )
    .join('\n');
  const shortRows = (fixture.shortShas ?? [])
    .map(
      (sha) => `<div class="ref-row">
        <a href="/${fixture.owner}/${fixture.repo}/commit/${sha}" class="ref-commit-link">${sha.slice(0, 7)}</a>
        <span class="ref-title">Short reference</span>
      </div>`,
    )
    .join('\n');
  const comment = fixture.commentBodyOid
    ? `<div class="comment-body markdown-body">
        Prose mentioning <a href="/${fixture.owner}/${fixture.repo}/commit/${fixture.commentBodyOid}">${fixture.commentBodyOid.slice(0, 7)}</a> inside a comment.
      </div>`
    : '';
  return `<!doctype html>
<html lang="en" data-color-mode="${mode}" data-light-theme="light" data-dark-theme="dark">
<head>
<meta charset="utf-8">
<title>${fixture.routePath} · ${fixture.owner}/${fixture.repo} · fixture</title>
<style>
  :root, [data-color-mode="light"] {
    --fgColor-default: #1f2328; --fgColor-muted: #59636e;
    --borderColor-default: #d1d9e0; --borderColor-muted: #d1d9e0b3;
    --bgColor-default: #ffffff; --bgColor-muted: #f6f8fa;
    --bgColor-attention-muted: #fff8c5; --borderColor-attention-muted: #d4a72c66;
    --focus-outlineColor: #0969da;
    --fontStack-monospace: ui-monospace, Consolas, monospace;
  }
  [data-color-mode="dark"] {
    --fgColor-default: #f0f6fc; --fgColor-muted: #9198a1;
    --borderColor-default: #3d444d; --borderColor-muted: #3d444d80;
    --bgColor-default: #0d1117; --bgColor-muted: #151b23;
    --bgColor-attention-muted: #bb800926; --borderColor-attention-muted: #bb800966;
    --focus-outlineColor: #1f6feb;
  }
  body { margin: 0; padding: 24px; background: var(--bgColor-default); color: var(--fgColor-default);
         font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 14px; }
  .ref-row { display: flex; align-items: center; gap: 10px; padding: 6px 10px;
             border-bottom: 1px solid var(--borderColor-default); }
  a { color: #0969da; text-decoration: none; font-family: var(--fontStack-monospace); font-size: 12px; }
  .comment-body { margin-top: 20px; padding: 12px; border: 1px solid var(--borderColor-default); border-radius: 6px; }
</style>
</head>
<body>
<h1>${fixture.routePath}</h1>
${rows}
${shortRows}
${comment}
</body>
</html>`;
}
