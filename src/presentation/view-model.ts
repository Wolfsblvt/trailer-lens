/**
 * Pure view-model construction: evidence + settings in, renderable rows out.
 * Keeping this DOM-free makes the presentation rules unit-testable and the
 * renderer a dumb, text-node-only builder.
 *
 * Friendly rows preserve source order; a matched `Co-authored-via` collapses
 * into its co-author's row as route context instead of occupying its own.
 * The raw view is untouched by any of this — it always shows the exact
 * block in original order.
 */

import { classifyKey } from '../domain/trailers/classify.ts';
import type { TrailerEntry, TrailerEvidence } from '../domain/trailers/model.ts';
import { pairCoAuthorVia } from '../domain/trailers/pair-coauthor-via.ts';
import { parsePersonValue } from '../domain/trailers/people.ts';
import type { Settings } from '../settings/schema.ts';

export interface PanelRow {
  /** Friendly label (known keys) or the exact raw key (unknown keys). */
  readonly label: string;
  /** Compact display value (person name for person-shaped values). */
  readonly value: string;
  /** Route context line for paired co-authors (`Claude Code · Opus 5 · …`). */
  readonly routeContext: string | null;
  /** Monospace hint for hashes, ids, and references. */
  readonly monospace: boolean;
}

export interface CandidateView {
  readonly rawLine: string;
}

export interface PanelViewModel {
  /** Total entries in the strict block (before any filtering). */
  readonly entryCount: number;
  readonly rows: readonly PanelRow[];
  /** Entries hidden via the hidden-keys setting. */
  readonly hiddenBySettings: number;
  /** Unknown-key entries hidden because unknown keys are disabled. */
  readonly unknownHidden: number;
  readonly open: boolean;
  readonly rawBlock: string | null;
  readonly hasRenderedLinks: boolean;
  readonly candidates: readonly CandidateView[];
  readonly whitespaceOnlySeparator: boolean;
  readonly tailTruncated: boolean;
}

const MONOSPACE_KINDS = new Set(['change-id', 'reference', 'link', 'unknown']);

export function buildPanelViewModel(
  evidence: TrailerEvidence,
  settings: Settings,
  hasRenderedLinks: boolean,
): PanelViewModel | null {
  const block = evidence.strictBlock;
  const showDiagnostics = settings.showDiagnostics;
  const candidates = showDiagnostics
    ? evidence.nearbyCandidates.map((candidate) => ({ rawLine: candidate.rawLine }))
    : [];

  if (block === null && candidates.length === 0) return null;

  const pairing = pairCoAuthorVia(evidence);
  const viaByPartner = new Map<TrailerEntry, (typeof pairing.pairs)[number]>();
  const consumedVia = new Set<TrailerEntry>();
  for (const pair of pairing.pairs) {
    viaByPartner.set(pair.byEntry, pair);
    consumedVia.add(pair.viaEntry);
  }

  const rows: PanelRow[] = [];
  let hiddenBySettings = 0;
  let unknownHidden = 0;

  for (const entry of block?.entries ?? []) {
    if (consumedVia.has(entry)) continue;
    if (settings.hiddenKeys.includes(entry.normalizedKey)) {
      hiddenBySettings++;
      continue;
    }
    const info = classifyKey(entry.normalizedKey);
    if (info.kind === 'unknown' && !settings.showUnknownKeys) {
      unknownHidden++;
      continue;
    }

    const pair = viaByPartner.get(entry);
    if (pair !== undefined) {
      rows.push({
        label: info.label,
        value: pair.person.displayName,
        routeContext: pair.route.segments.join(' · '),
        monospace: false,
      });
      continue;
    }

    const person = info.personValue ? parsePersonValue(entry.unfoldedValue) : null;
    rows.push({
      label: info.kind === 'unknown' ? entry.rawKey : info.label,
      value: person !== null ? person.displayName : entry.unfoldedValue,
      routeContext: null,
      monospace: MONOSPACE_KINDS.has(info.kind),
    });
  }

  const entryCount = block?.entries.length ?? 0;
  if (rows.length === 0 && hiddenBySettings === 0 && unknownHidden === 0 && candidates.length === 0) {
    return null;
  }

  const open =
    settings.detailMode === 'expanded' ||
    (settings.detailMode === 'auto' && rows.length > 0 && rows.length <= 4);

  const diagnosticCodes = new Set(evidence.diagnostics.map((diagnostic) => diagnostic.code));

  return {
    entryCount,
    rows,
    hiddenBySettings,
    unknownHidden,
    open,
    rawBlock: block?.rawText ?? null,
    hasRenderedLinks,
    candidates,
    whitespaceOnlySeparator: showDiagnostics && diagnosticCodes.has('whitespace-only-separator'),
    tailTruncated: showDiagnostics && diagnosticCodes.has('tail-truncated'),
  };
}
