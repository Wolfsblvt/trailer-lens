/**
 * Reconciliation engine: observe, batch, re-discover, and keep exactly one
 * correct owned element per qualified unit — the evidence panel on commit
 * pages, and (with device-local memory explicitly enabled) remembered-
 * evidence chips beside qualified full-OID commit references.
 *
 * The loop is idempotent by construction: every flush re-discovers units
 * from the current DOM, removes owned elements that no longer correspond
 * to a qualified unit (or are duplicates, or sit in the wrong place), and
 * leaves intact elements untouched via content signatures. The chip pass
 * is asynchronous (storage lookup) and generation-guarded so a stale
 * lookup can never decorate a page the user has already left.
 */

import { parseTrailerEvidence } from '../domain/trailers/parse.ts';
import { hasEvidence } from '../domain/trailers/model.ts';
import { buildPanelViewModel } from '../presentation/view-model.ts';
import {
  COMMIT_ATTR,
  OWNED_ATTR,
  renderPanel,
  renderRememberedChip,
  SIGNATURE_ATTR,
} from '../presentation/render.ts';
import { settingsSignature, type Settings } from '../settings/schema.ts';
import { recallMany, rememberEvidence } from '../memory/store.ts';
import { commitDetailAdapter } from './adapters/commit-detail.ts';
import { discoverReferenceUnits, isReferenceRoute } from './adapters/reference-links.ts';
import { parseCommitRoute } from './routes.ts';

const PANEL_SELECTOR = `[${OWNED_ATTR}="root"]`;
const CHIP_SELECTOR = `[${OWNED_ATTR}="chip"]`;
const ANY_OWNED_SELECTOR = `[${OWNED_ATTR}]`;

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
  let chipGeneration = 0;

  const win = doc.defaultView;

  function schedule(): void {
    if (flushScheduled || win === null) return;
    flushScheduled = true;
    const run = (): void => {
      flushScheduled = false;
      flush();
    };
    // requestAnimationFrame never fires while the tab is hidden, and a hidden
    // tab must still reconcile — settings changes and memory learning would
    // otherwise stall until the tab is next focused. Per-frame coalescing only
    // means anything when frames exist; hidden tabs get a (throttled) timer.
    if (doc.visibilityState === 'hidden') win.setTimeout(run, 0);
    else win.requestAnimationFrame(run);
  }

  function owned(selector: string): HTMLElement[] {
    return [...doc.querySelectorAll<HTMLElement>(selector)];
  }

  function removeAll(selector: string): void {
    for (const element of owned(selector)) element.remove();
  }

  function flush(): void {
    if (settings === null || win === null) return;
    if (!settings.enabled) {
      chipGeneration++;
      removeAll(ANY_OWNED_SELECTOR);
      return;
    }

    flushPanels();
    flushChips();
  }

  // ----- Commit-detail panels (and, when enabled, learning) -----

  function flushPanels(): void {
    if (settings === null || win === null) return;
    const pathname = win.location.pathname;
    if (parseCommitRoute(pathname) === null) {
      removeAll(PANEL_SELECTOR);
      return;
    }

    const units = commitDetailAdapter.discover(doc, pathname);
    const unitByCommit = new Map(units.map((unit) => [unit.commitId, unit]));

    const kept = new Map<string, HTMLElement>();
    for (const root of owned(PANEL_SELECTOR)) {
      const commitId = root.getAttribute(COMMIT_ATTR);
      const unit = commitId !== null ? unitByCommit.get(commitId) : undefined;
      if (unit === undefined || kept.has(unit.commitId) || root.previousElementSibling !== unit.insertAfter) {
        root.remove();
        continue;
      }
      kept.set(unit.commitId, root);
    }

    for (const unit of units) {
      const signature = panelSignature(unit.commitId, unit.message, unit.hasRenderedLinks, settings);
      const existing = kept.get(unit.commitId);
      if (existing !== undefined && existing.getAttribute(SIGNATURE_ATTR) === signature) {
        continue;
      }
      existing?.remove();
      const evidence = parseTrailerEvidence(unit.message);

      // Device-local memory learns only here: a qualified commit-detail
      // page whose complete message the signed-in user already sees.
      if (settings.memoryEnabled && hasEvidence(evidence)) {
        const route = parseCommitRoute(pathname);
        if (route !== null) {
          void rememberEvidence(
            { host: win.location.hostname.toLowerCase(), owner: route.owner, repo: route.repo, oid: unit.commitId },
            evidence,
            unit.hasRenderedLinks,
            Date.now(),
          );
        }
      }

      const model = buildPanelViewModel(evidence, settings, unit.hasRenderedLinks);
      if (model === null) continue;
      const panel = renderPanel(doc, model, unit.commitId, signature);
      unit.insertAfter.after(panel);
    }
  }

  // ----- Remembered-evidence chips on reference surfaces -----

  function flushChips(): void {
    if (settings === null || win === null) return;
    const generation = ++chipGeneration;
    const pathname = win.location.pathname;

    if (!settings.memoryEnabled || !isReferenceRoute(pathname)) {
      removeAll(CHIP_SELECTOR);
      return;
    }

    const units = discoverReferenceUnits(doc, win.location.hostname);
    if (units.length === 0) {
      removeAll(CHIP_SELECTOR);
      return;
    }

    const currentSettings = settings;
    void recallMany(units.map((unit) => unit.identity)).then((found) => {
      // The page may have navigated or re-flushed while storage answered.
      if (generation !== chipGeneration || settings !== currentSettings) return;

      const unitByKey = new Map(units.map((unit) => [unit.storageKey, unit]));
      const kept = new Map<string, HTMLElement>();
      for (const chip of owned(CHIP_SELECTOR)) {
        const key = chip.getAttribute(COMMIT_ATTR);
        const unit = key !== null ? unitByKey.get(key) : undefined;
        const entry = key !== null ? found.get(key) : undefined;
        if (
          unit === undefined ||
          entry === undefined ||
          kept.has(unit.storageKey) ||
          chip.previousElementSibling !== unit.anchor ||
          !unit.anchor.isConnected
        ) {
          chip.remove();
          continue;
        }
        kept.set(unit.storageKey, chip);
      }

      for (const unit of units) {
        const entry = found.get(unit.storageKey);
        if (entry === undefined) continue;
        const signature = chipSignature(unit.storageKey, entry.storedAt, entry.hasRenderedLinks, currentSettings);
        const existing = kept.get(unit.storageKey);
        if (existing !== undefined && existing.getAttribute(SIGNATURE_ATTR) === signature) continue;
        existing?.remove();
        const model = buildPanelViewModel(entry.evidence, currentSettings, entry.hasRenderedLinks);
        if (model === null) continue;
        const chip = renderRememberedChip(doc, model, unit.storageKey, signature, entry.storedAt);
        unit.anchor.after(chip);
      }
    });
  }

  function panelSignature(commitId: string, message: string, hasRenderedLinks: boolean, current: Settings): string {
    return fnv1a(
      `${commitDetailAdapter.id}|${commitId}|${hasRenderedLinks ? '1' : '0'}|${settingsSignature(current)}|${message}`,
    );
  }

  function chipSignature(storageKey: string, storedAt: number, hasRenderedLinks: boolean, current: Settings): string {
    return fnv1a(`chip@1|${storageKey}|${storedAt}|${hasRenderedLinks ? '1' : '0'}|${settingsSignature(current)}`);
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
        if (target !== null && target.closest(ANY_OWNED_SELECTOR) !== null) continue;
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
