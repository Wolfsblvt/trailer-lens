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
import { loadSettings, saveSettings } from '../settings/storage.ts';

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
const previewHost = byId<HTMLDivElement>('tlo-preview');
const saveButton = byId<HTMLButtonElement>('tlo-save');
const statusLine = byId<HTMLSpanElement>('tlo-status');
const resetButton = byId<HTMLButtonElement>('tlo-reset');

let saved: Settings = defaultSettings();
let draft: Settings = saved;

function setDraft(next: Settings): void {
  draft = next;
  renderDraft();
}

function renderDraft(): void {
  enabledInput.checked = draft.enabled;
  densitySelect.value = draft.detailMode;
  diagnosticsInput.checked = draft.showDiagnostics;
  unknownInput.checked = draft.showUnknownKeys;

  hiddenList.replaceChildren();
  for (const key of draft.hiddenKeys) {
    const item = document.createElement('li');
    const label = document.createElement('code');
    label.textContent = key;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Stop hiding ${key}`);
    remove.addEventListener('click', () => {
      setDraft({ ...draft, hiddenKeys: draft.hiddenKeys.filter((candidate) => candidate !== key) });
    });
    item.append(label, remove);
    hiddenList.append(item);
  }

  const dirty = settingsSignature(draft) !== settingsSignature(saved);
  saveButton.disabled = !dirty;
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
  void saveSettings(toSave).then(() => {
    saved = toSave;
    statusLine.textContent = 'Saved';
    renderDraft();
    statusLine.textContent = 'Saved';
  });
});

resetButton.addEventListener('click', () => {
  if (!window.confirm('Reset all Trailer Lens settings to their defaults?')) return;
  const defaults = defaultSettings();
  void saveSettings(defaults).then(() => {
    saved = defaults;
    setDraft(defaults);
    statusLine.textContent = 'Settings reset';
  });
});

void loadSettings().then((settings) => {
  saved = settings;
  setDraft(settings);
  statusLine.textContent = '';
});
