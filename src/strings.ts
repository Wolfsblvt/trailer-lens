/**
 * All user-visible English strings, centralized so wording stays reviewable
 * in one place and a future locale catalog has one source to start from.
 * Diagnostic wording is deliberately plain and non-accusatory: a malformed
 * commit message is evidence to inspect, not a browser emergency.
 */

export const STRINGS = {
  panel: {
    summaryLabel: 'Trailers',
    attribution: 'Trailer Lens',
    attributionTooltip: 'Added by Trailer Lens — not part of GitHub',
    viaPrefix: 'via',
    hiddenBySettings: (count: number) =>
      count === 1 ? '1 trailer hidden by your settings' : `${count} trailers hidden by your settings`,
    unknownHidden: (count: number) =>
      count === 1 ? '1 unrecognized trailer hidden by your settings' : `${count} unrecognized trailers hidden by your settings`,
  },
  remembered: {
    chipLabel: (count: number) =>
      count === 1 ? '1 remembered trailer for this commit' : `${count} remembered trailers for this commit`,
    chipTooltip: 'Trailer evidence remembered on this device by Trailer Lens',
    note: (age: string) =>
      `Remembered on this device from the commit page (${age}). Shown from local memory - not re-read from GitHub.`,
  },
  raw: {
    summary: 'Raw trailer lines and parsing details',
    blockHeading: 'Final trailer block, exactly as stored',
    copyBlock: 'Copy block',
    copied: 'Copied',
    copyFailed: 'Copy failed — select the text instead',
    renderedLinksNote:
      'This message contains links rendered by GitHub. A full URL may be displayed in a shortened form; the commit itself remains the source of truth.',
  },
  diagnostics: {
    heading: 'Outside the final trailer block',
    outsideFinalBlock:
      'These lines look like trailers but are separated from the final trailer block, so Git does not include them when it reads this commit’s trailers. They are shown exactly as stored.',
    whitespaceOnlySeparator:
      'The separating line contains only whitespace — invisible here, but still a break for Git.',
    tailTruncated: 'This message is unusually large; only its end was scanned for trailers.',
  },
} as const;
