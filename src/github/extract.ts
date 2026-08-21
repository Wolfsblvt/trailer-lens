/**
 * Text extraction from GitHub-rendered message elements.
 *
 * GitHub renders commit messages into `white-space: pre-wrap` spans whose
 * text nodes preserve the original newlines, with linkified references as
 * inline anchors and keyword tooltips as inline spans. Extraction walks the
 * rendered nodes and reconstructs the visible text exactly.
 *
 * One honest limitation, surfaced instead of hidden: GitHub may shorten a
 * github.com URL's display text (`https://github.com/o/r/issues/1` renders
 * as `#1`) while keeping the target in `href`. Rendered text and raw commit
 * bytes are then indistinguishable from the page alone, so extraction
 * reports `hasRenderedLinks` and the UI says exactly that, rather than
 * guessing which form the author wrote.
 */

export interface ExtractedText {
  readonly text: string;
  /** True when the extracted region contained rendered link elements. */
  readonly hasRenderedLinks: boolean;
}

/** Reconstruct the visible text of a rendered message element. */
export function extractRenderedText(element: Element): ExtractedText {
  let text = '';
  let hasRenderedLinks = false;

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node as Text).data;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') return;
    if (tag === 'BR') {
      text += '\n';
      return;
    }
    if (tag === 'A') hasRenderedLinks = true;
    for (const child of el.childNodes) walk(child);
  };
  for (const child of element.childNodes) walk(child);

  return { text, hasRenderedLinks };
}
