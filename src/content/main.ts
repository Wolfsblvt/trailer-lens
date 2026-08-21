/**
 * Content-script entry point. Wires settings, the reconciliation engine,
 * and the observer together — nothing more. Injected on all of github.com
 * because GitHub soft-navigates between pages; route gating happens inside
 * the engine on every batch.
 */

import { createEngine } from '../github/reconcile.ts';
import { loadSettings, onSettingsChanged } from '../settings/storage.ts';

declare global {
  interface Window {
    __trailerLensStarted?: boolean;
  }
}

// Duplicate content-script execution (extension reload, double injection)
// must not create a second engine racing the first.
if (window.__trailerLensStarted !== true) {
  window.__trailerLensStarted = true;

  const engine = createEngine(document);
  void loadSettings().then((settings) => {
    engine.applySettings(settings);
    engine.start();
    onSettingsChanged((next) => engine.applySettings(next));
  });
}

export {};
