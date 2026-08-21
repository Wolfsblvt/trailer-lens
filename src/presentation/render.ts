/**
 * Panel renderer: one extension-owned `<section>` built exclusively from
 * `createElement`/`textContent`. Commit content is untrusted input; nothing
 * here may interpret it as HTML, create links from it, or move focus around
 * on the reader's behalf.
 */

import { STRINGS } from '../strings.ts';
import type { PanelViewModel } from './view-model.ts';

export const OWNED_ATTR = 'data-trailer-lens';
export const COMMIT_ATTR = 'data-trailer-lens-commit';
export const SIGNATURE_ATTR = 'data-trailer-lens-signature';

/** Build the owned panel root for one commit unit. */
export function renderPanel(doc: Document, model: PanelViewModel, commitId: string, signature: string): HTMLElement {
  const root = doc.createElement('section');
  root.setAttribute(OWNED_ATTR, 'root');
  root.setAttribute(COMMIT_ATTR, commitId);
  root.setAttribute(SIGNATURE_ATTR, signature);
  root.className = 'tl-root';
  root.setAttribute('aria-label', STRINGS.panel.attributionTooltip);

  const details = el(doc, 'details', 'tl-panel');
  if (model.open) details.setAttribute('open', '');
  root.append(details);

  const summary = el(doc, 'summary', 'tl-summary');
  summary.append(lensIcon(doc));
  const summaryLabel = el(doc, 'span', 'tl-summary-label');
  summaryLabel.textContent =
    model.entryCount > 0 ? `${STRINGS.panel.summaryLabel} · ${model.entryCount}` : STRINGS.panel.summaryLabel;
  summary.append(summaryLabel);
  const attribution = el(doc, 'span', 'tl-attribution');
  attribution.textContent = STRINGS.panel.attribution;
  attribution.title = STRINGS.panel.attributionTooltip;
  summary.append(attribution);
  details.append(summary);

  const content = el(doc, 'div', 'tl-content');
  details.append(content);

  if (model.rows.length > 0) {
    const rowList = el(doc, 'dl', 'tl-rows');
    for (const row of model.rows) {
      const label = el(doc, 'dt', 'tl-label');
      label.textContent = row.label;
      const value = el(doc, 'dd', row.monospace ? 'tl-value tl-mono' : 'tl-value');
      const valueText = el(doc, 'span', 'tl-value-text');
      valueText.textContent = row.value;
      value.append(valueText);
      if (row.routeContext !== null && row.routeContext.length > 0) {
        const route = el(doc, 'span', 'tl-route');
        route.textContent = `${STRINGS.panel.viaPrefix} ${row.routeContext}`;
        value.append(route);
      }
      rowList.append(label, value);
    }
    content.append(rowList);
  }

  for (const note of hiddenNotes(model)) {
    const noteEl = el(doc, 'p', 'tl-note');
    noteEl.textContent = note;
    content.append(noteEl);
  }

  if (model.candidates.length > 0) {
    const section = el(doc, 'div', 'tl-diagnostics');
    const heading = el(doc, 'p', 'tl-diagnostics-heading');
    heading.append(infoIcon(doc));
    heading.append(text(doc, STRINGS.diagnostics.heading));
    section.append(heading);
    const explain = el(doc, 'p', 'tl-diagnostics-text');
    explain.textContent = STRINGS.diagnostics.outsideFinalBlock;
    section.append(explain);
    if (model.whitespaceOnlySeparator) {
      const ws = el(doc, 'p', 'tl-diagnostics-text');
      ws.textContent = STRINGS.diagnostics.whitespaceOnlySeparator;
      section.append(ws);
    }
    const pre = el(doc, 'pre', 'tl-raw-lines');
    pre.textContent = model.candidates.map((candidate) => candidate.rawLine).join('\n');
    section.append(pre);
    content.append(section);
  }

  if (model.tailTruncated) {
    const note = el(doc, 'p', 'tl-note');
    note.textContent = STRINGS.diagnostics.tailTruncated;
    content.append(note);
  }

  if (model.rawBlock !== null) {
    const raw = el(doc, 'details', 'tl-raw');
    const rawSummary = el(doc, 'summary', 'tl-raw-summary');
    rawSummary.textContent = STRINGS.raw.summary;
    raw.append(rawSummary);

    const rawHeading = el(doc, 'p', 'tl-raw-heading');
    rawHeading.textContent = STRINGS.raw.blockHeading;
    raw.append(rawHeading);

    const pre = el(doc, 'pre', 'tl-raw-lines');
    pre.textContent = model.rawBlock;
    raw.append(pre);

    if (model.hasRenderedLinks) {
      const note = el(doc, 'p', 'tl-note');
      note.textContent = STRINGS.raw.renderedLinksNote;
      raw.append(note);
    }

    const copyRow = el(doc, 'div', 'tl-copy-row');
    const button = el(doc, 'button', 'tl-copy');
    button.setAttribute('type', 'button');
    button.textContent = STRINGS.raw.copyBlock;
    const status = el(doc, 'span', 'tl-copy-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    copyRow.append(button, status);
    raw.append(copyRow);

    const rawBlock = model.rawBlock;
    button.addEventListener('click', () => {
      void copyText(rawBlock).then((ok) => {
        status.textContent = ok ? STRINGS.raw.copied : STRINGS.raw.copyFailed;
        button.classList.toggle('tl-copy-failed', !ok);
      });
    });

    content.append(raw);
  }

  return root;
}

/** Copy on user gesture; report failure honestly instead of guessing. */
async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function hiddenNotes(model: PanelViewModel): string[] {
  const notes: string[] = [];
  if (model.hiddenBySettings > 0) notes.push(STRINGS.panel.hiddenBySettings(model.hiddenBySettings));
  if (model.unknownHidden > 0) notes.push(STRINGS.panel.unknownHidden(model.unknownHidden));
  return notes;
}

function el(doc: Document, tag: string, className: string): HTMLElement {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
}

function text(doc: Document, value: string): Text {
  return doc.createTextNode(value);
}

/** Small inline lens mark, drawn with fixed geometry — never from content. */
function lensIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('tl-icon');
  const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '6.5');
  circle.setAttribute('cy', '6.5');
  circle.setAttribute('r', '4.25');
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', 'currentColor');
  circle.setAttribute('stroke-width', '1.5');
  const handle = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  handle.setAttribute('d', 'M9.8 9.8 L13.6 13.6');
  handle.setAttribute('stroke', 'currentColor');
  handle.setAttribute('stroke-width', '1.7');
  handle.setAttribute('stroke-linecap', 'round');
  const lineA = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  lineA.setAttribute('d', 'M4.6 5.6 H8.4');
  lineA.setAttribute('stroke', 'currentColor');
  lineA.setAttribute('stroke-width', '1.1');
  lineA.setAttribute('stroke-linecap', 'round');
  const lineB = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  lineB.setAttribute('d', 'M4.6 7.6 H7.2');
  lineB.setAttribute('stroke', 'currentColor');
  lineB.setAttribute('stroke-width', '1.1');
  lineB.setAttribute('stroke-linecap', 'round');
  svg.append(circle, lineA, lineB, handle);
  return svg;
}

/** Info glyph for the diagnostics heading — icon plus text, never color alone. */
function infoIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('tl-icon');
  const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '8');
  circle.setAttribute('cy', '8');
  circle.setAttribute('r', '6.25');
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', 'currentColor');
  circle.setAttribute('stroke-width', '1.5');
  const dot = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  dot.setAttribute('d', 'M8 5 V5.01 M8 7.2 V11');
  dot.setAttribute('stroke', 'currentColor');
  dot.setAttribute('stroke-width', '1.5');
  dot.setAttribute('stroke-linecap', 'round');
  svg.append(circle, dot);
  return svg;
}
