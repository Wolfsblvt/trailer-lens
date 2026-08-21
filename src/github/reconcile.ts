/**
 * Reconciliation engine: observe, batch, re-discover, and keep exactly one
 * correct owned panel per qualified commit unit.
 *
 * The loop is idempotent by construction: every flush re-discovers units
 * from the current DOM, removes owned roots that no longer correspond to a
 * qualified unit (or are duplicates, or sit in the wrong place), and leaves
 * intact roots untouched via a content signature. GitHub replacing, moving,
 * or re-rendering its subtree therefore converges to the correct state on
 * the next animation frame, and the observer ignoring mutations inside
 * owned roots keeps the engine from reacting to its own rendering.
 */

import { parseTrailerEvidence } from '../domain/trailers/parse.ts';
import { buildPanelViewModel } from '../presentation/view-model.ts';
import { COMMIT_ATTR, OWNED_ATTR, renderPanel, SIGNATURE_ATTR } from '../presentation/render.ts';
import { settingsSignature, type Settings } from '../settings/schema.ts';
import { commitDetailAdapter } from './adapters/commit-detail.ts';
import { parseCommitRoute } from './routes.ts';

const OWNED_SELECTOR = `[${OWNED_ATTR}="root"]`;

export interface Engine {
  /** Apply new settings and reconcile on the next batch. */
  applySettings(settings: Settings): void;
  /** Request a reconciliation batch (coalesced per animation frame). */
  schedule(): void;
  /** Begin observing DOM mutations and soft-navigation hints. */
  start(): void;
}

export function createEngine(doc: Document): Engine {
  let settings: Settings | null = null;
  let flushScheduled = false;

  const win = doc.defaultView;

  function schedule(): void {
    if (flushScheduled || win === null) return;
    flushScheduled = true;
    win.requestAnimationFrame(() => {
      flushScheduled = false;
      flush();
    });
  }

  function ownedRoots(): HTMLElement[] {
    return [...doc.querySelectorAll<HTMLElement>(OWNED_SELECTOR)];
  }

  function removeAllOwned(): void {
    for (const root of ownedRoots()) root.remove();
  }

  function flush(): void {
    if (settings === null || win === null) return;
    if (!settings.enabled) {
      removeAllOwned();
      return;
    }
    const pathname = win.location.pathname;
    if (parseCommitRoute(pathname) === null) {
      removeAllOwned();
      return;
    }

    const units = commitDetailAdapter.discover(doc, pathname);
    const unitByCommit = new Map(units.map((unit) => [unit.commitId, unit]));

    // Remove roots that are stale, orphaned, misplaced, or duplicated.
    const kept = new Map<string, HTMLElement>();
    for (const root of ownedRoots()) {
      const commitId = root.getAttribute(COMMIT_ATTR);
      const unit = commitId !== null ? unitByCommit.get(commitId) : undefined;
      if (unit === undefined || kept.has(unit.commitId) || root.previousElementSibling !== unit.insertAfter) {
        root.remove();
        continue;
      }
      kept.set(unit.commitId, root);
    }

    for (const unit of units) {
      const signature = unitSignature(unit.commitId, unit.message, unit.hasRenderedLinks, settings);
      const existing = kept.get(unit.commitId);
      if (existing !== undefined) {
        if (existing.getAttribute(SIGNATURE_ATTR) === signature) continue;
        existing.remove();
      }
      const evidence = parseTrailerEvidence(unit.message);
      const model = buildPanelViewModel(evidence, settings, unit.hasRenderedLinks);
      if (model === null) continue;
      const panel = renderPanel(doc, model, unit.commitId, signature);
      unit.insertAfter.after(panel);
    }
  }

  function unitSignature(
    commitId: string,
    message: string,
    hasRenderedLinks: boolean,
    current: Settings,
  ): string {
    return fnv1a(
      `${commitDetailAdapter.id}|${commitId}|${hasRenderedLinks ? '1' : '0'}|${settingsSignature(current)}|${message}`,
    );
  }

  function start(): void {
    if (win === null) return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target =
          mutation.target.nodeType === Node.ELEMENT_NODE
            ? (mutation.target as Element)
            : mutation.target.parentElement;
        // Our own rendering must never feed the loop.
        if (target !== null && target.closest(OWNED_SELECTOR) !== null) continue;
        schedule();
        return;
      }
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });

    // Soft-navigation hints; the URL comparison in discovery stays the
    // authority, these only accelerate reconciliation.
    for (const eventName of ['turbo:load', 'turbo:render', 'pjax:end', 'popstate']) {
      win.addEventListener(eventName, () => schedule());
    }
  }

  return {
    applySettings(next: Settings): void {
      settings = next;
      schedule();
    },
    schedule,
    start,
  };
}

/** Tiny non-cryptographic content hash for idempotency signatures. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
