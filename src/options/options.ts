/**
 * Options page logic: load, edit, validate, save. Editing happens on an
 * in-memory draft; Save persists atomically and the status line reports the
 * result. The preview renders the real panel component against an example
 * commit with the current draft, so what you configure is what ships.
 */

import { parseTrailerEvidence } from '../domain/trailers/parse.ts';
import { renderPanel } from '../presentation/render.ts';
import { buildPanelViewModel } from '../presentation/view-model.ts';
import {
  defaultSettings,
  normalizeHiddenKey,
  settingsSignature,
  type DetailMode,
  type Settings,
} from '../settings/schema.ts';
import { loadSettingsEnvelope, saveSettings } from '../settings/storage.ts';
import { MEMORY_LIMITS } from '../memory/model.ts';
import { memoryStats, purgeAll, purgeRepository } from '../memory/store.ts';

const EXAMPLE_MESSAGE = [
  'Improve session recovery',
  '',
  'Body of the example commit.',
  '',
  'Co-authored-via: Claude | Claude Code | Opus 5 | High',
  'Co-authored-by: Claude <noreply@anthropic.com>',
  'Reviewed-by: Alex Rivera <alex@example.com>',
  'Build-Context: windows-x64 | release',
].join('\n');

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`options page is missing #${id}`);
  return element as T;
}

const enabledInput = byId<HTMLInputElement>('tlo-enabled');
const densitySelect = byId<HTMLSelectElement>('tlo-density');
const diagnosticsInput = byId<HTMLInputElement>('tlo-diagnostics');
const unknownInput = byId<HTMLInputElement>('tlo-unknown');
const hiddenList = byId<HTMLUListElement>('tlo-hidden-list');
const hiddenForm = byId<HTMLFormElement>('tlo-hidden-form');
const hiddenInput = byId<HTMLInputElement>('tlo-hidden-input');
const hiddenError = byId<HTMLParagraphElement>('tlo-hidden-error');
const memoryInput = byId<HTMLInputElement>('tlo-memory');
const memoryStatsLine = byId<HTMLParagraphElement>('tlo-memory-stats');
const memoryCap = byId<HTMLSpanElement>('tlo-memory-cap');
const memoryBudget = byId<HTMLSpanElement>('tlo-memory-budget');
const purgeRepoForm = byId<HTMLFormElement>('tlo-purge-repo-form');
const purgeRepoInput = byId<HTMLInputElement>('tlo-purge-repo-input');
const purgeRepoError = byId<HTMLParagraphElement>('tlo-purge-repo-error');
const purgeAllButton = byId<HTMLButtonElement>('tlo-purge-all');
const previewHost = byId<HTMLDivElement>('tlo-preview');
const saveButton = byId<HTMLButtonElement>('tlo-save');
const statusLine = byId<HTMLSpanElement>('tlo-status');
const resetButton = byId<HTMLButtonElement>('tlo-reset');

let saved: Settings = defaultSettings();
let draft: Settings = saved;

// One initialization owner: every control stays disabled until the stored
// snapshot resolves, so no edit or write can ever act on a default-derived
// draft (an early save would clobber stored fields the user never touched).
// 'newer-version' keeps writes disabled forever: a record written by a
// newer schema version stays under that version's custody.
type WriteGate = 'loading' | 'ready' | 'newer-version' | 'load-failed';
let writeGate: WriteGate = 'loading';

const gatedControls: readonly (HTMLInputElement | HTMLSelectElement | HTMLButtonElement)[] = [
  enabledInput,
  densitySelect,
  diagnosticsInput,
  unknownInput,
  hiddenInput,
  hiddenForm.querySelector('button') as HTMLButtonElement,
  memoryInput,
  purgeRepoInput,
  purgeRepoForm.querySelector('button') as HTMLButtonElement,
  purgeAllButton,
  resetButton,
];

function applyWriteGate(): void {
  const editable = writeGate === 'ready';
  for (const control of gatedControls) control.disabled = !editable;
}

function setDraft(next: Settings): void {
  draft = next;
  renderDraft();
}

function renderDraft(): void {
  enabledInput.checked = draft.enabled;
  densitySelect.value = draft.detailMode;
  diagnosticsInput.checked = draft.showDiagnostics;
  unknownInput.checked = draft.showUnknownKeys;
  memoryInput.checked = draft.memoryEnabled;

  hiddenList.replaceChildren();
  for (const key of draft.hiddenKeys) {
    const item = document.createElement('li');
    const label = document.createElement('code');
    label.textContent = key;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.disabled = writeGate !== 'ready';
    remove.setAttribute('aria-label', `Stop hiding ${key}`);
    remove.addEventListener('click', () => {
      setDraft({ ...draft, hiddenKeys: draft.hiddenKeys.filter((candidate) => candidate !== key) });
    });
    item.append(label, remove);
    hiddenList.append(item);
  }

  const dirty = settingsSignature(draft) !== settingsSignature(saved);
  saveButton.disabled = !dirty || writeGate !== 'ready';
  if (dirty) statusLine.textContent = 'Unsaved changes';
  else if (statusLine.textContent === 'Unsaved changes') statusLine.textContent = '';

  renderPreview();
}

function renderPreview(): void {
  previewHost.replaceChildren();
  const evidence = parseTrailerEvidence(EXAMPLE_MESSAGE);
  const model = buildPanelViewModel(evidence, { ...draft, enabled: true }, false);
  if (model === null) {
    const note = document.createElement('p');
    note.className = 'tlo-hint';
    note.textContent = 'Nothing to show with these settings.';
    previewHost.append(note);
    return;
  }
  previewHost.append(renderPanel(document, model, 'example', 'preview'));
}

enabledInput.addEventListener('change', () => setDraft({ ...draft, enabled: enabledInput.checked }));
densitySelect.addEventListener('change', () =>
  setDraft({ ...draft, detailMode: densitySelect.value as DetailMode }),
);
diagnosticsInput.addEventListener('change', () =>
  setDraft({ ...draft, showDiagnostics: diagnosticsInput.checked }),
);
unknownInput.addEventListener('change', () => setDraft({ ...draft, showUnknownKeys: unknownInput.checked }));
memoryInput.addEventListener('change', () => setDraft({ ...draft, memoryEnabled: memoryInput.checked }));

hiddenForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const key = normalizeHiddenKey(hiddenInput.value);
  if (key === null) {
    hiddenError.hidden = false;
    return;
  }
  hiddenError.hidden = true;
  hiddenInput.value = '';
  if (!draft.hiddenKeys.includes(key)) {
    setDraft({ ...draft, hiddenKeys: [...draft.hiddenKeys, key] });
  }
});

saveButton.addEventListener('click', () => {
  const toSave = draft;
  void saveSettings(toSave).then((ok) => {
    if (!ok) {
      statusLine.textContent = 'Save failed — Chrome storage rejected the change';
      return;
    }
    saved = toSave;
    statusLine.textContent = 'Saved';
    renderDraft();
    statusLine.textContent = 'Saved';
  });
});

// Reset uses a two-step inline confirmation instead of a native dialog:
// the first activation arms the button, the second performs the reset, and
// anything else (blur, timeout) disarms it.
let resetArmed = false;
let disarmTimer: number | undefined;

function disarmReset(): void {
  resetArmed = false;
  if (disarmTimer !== undefined) window.clearTimeout(disarmTimer);
  resetButton.textContent = 'Reset to defaults';
  resetButton.classList.remove('tlo-reset-armed');
}

resetButton.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    resetButton.textContent = 'Really reset all settings?';
    resetButton.classList.add('tlo-reset-armed');
    disarmTimer = window.setTimeout(disarmReset, 8000);
    return;
  }
  disarmReset();
  const defaults = defaultSettings();
  void saveSettings(defaults).then((ok) => {
    if (!ok) {
      statusLine.textContent = 'Reset failed — Chrome storage rejected the change';
      return;
    }
    saved = defaults;
    setDraft(defaults);
    statusLine.textContent = 'Settings reset';
  });
});

resetButton.addEventListener('blur', disarmReset);

function refreshMemoryStats(): void {
  void memoryStats().then((stats) => {
    memoryStatsLine.textContent =
      stats.entries === 0
        ? 'Nothing remembered yet.'
        : `Remembered: ${stats.entries} commit${stats.entries === 1 ? '' : 's'} · about ${Math.max(1, Math.round(stats.approximateBytes / 1024))} KB on this device.`;
  });
}

purgeRepoForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(purgeRepoInput.value.trim());
  if (match === null) {
    purgeRepoError.hidden = false;
    return;
  }
  purgeRepoError.hidden = true;
  const owner = match[1] as string;
  const repo = match[2] as string;
  void purgeRepository('github.com', owner, repo).then((removed) => {
    if (removed === null) {
      statusLine.textContent = 'Purge failed — Chrome storage rejected the removal';
      refreshMemoryStats();
      return;
    }
    purgeRepoInput.value = '';
    statusLine.textContent = removed === 0 ? `Nothing remembered for ${owner}/${repo}` : `Purged ${removed} remembered commit${removed === 1 ? '' : 's'} for ${owner}/${repo}`;
    refreshMemoryStats();
  });
});

// Purge-everything uses the same two-step arming as reset: first activation
// arms, second performs, blur or timeout disarms.
let purgeArmed = false;
let purgeDisarmTimer: number | undefined;
function disarmPurge(): void {
  purgeArmed = false;
  if (purgeDisarmTimer !== undefined) window.clearTimeout(purgeDisarmTimer);
  purgeAllButton.textContent = 'Purge everything remembered';
  purgeAllButton.classList.remove('tlo-reset-armed');
}
purgeAllButton.addEventListener('click', () => {
  if (!purgeArmed) {
    purgeArmed = true;
    purgeAllButton.textContent = 'Really purge all remembered evidence?';
    purgeAllButton.classList.add('tlo-reset-armed');
    purgeDisarmTimer = window.setTimeout(disarmPurge, 8000);
    return;
  }
  disarmPurge();
  void purgeAll().then((removed) => {
    if (removed === null) {
      statusLine.textContent = 'Purge failed — Chrome storage rejected the removal';
      refreshMemoryStats();
      return;
    }
    statusLine.textContent = removed === 0 ? 'Nothing was remembered' : `Purged ${removed} remembered commit${removed === 1 ? '' : 's'}`;
    refreshMemoryStats();
  });
});

memoryCap.textContent = String(MEMORY_LIMITS.maxEntries);
memoryBudget.textContent = `${Math.round(MEMORY_LIMITS.maxTotalBytes / 1_000_000)} MB`;
applyWriteGate();
statusLine.textContent = 'Loading settings…';
renderDraft();
refreshMemoryStats();

void loadSettingsEnvelope().then((envelope) => {
  saved = envelope.settings;
  if (envelope.loadFailed) {
    writeGate = 'load-failed';
    applyWriteGate();
    setDraft(envelope.settings);
    statusLine.textContent = 'Could not read settings from Chrome storage — close and reopen this page to retry.';
    return;
  }
  if (envelope.ownedByNewerVersion) {
    writeGate = 'newer-version';
    applyWriteGate();
    setDraft(envelope.settings);
    statusLine.textContent =
      'A newer Trailer Lens version owns these settings — editing here is disabled so nothing is lost.';
    return;
  }
  writeGate = 'ready';
  applyWriteGate();
  setDraft(envelope.settings);
  statusLine.textContent = '';
});
