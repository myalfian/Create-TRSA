// Setup minimal headless DOM environment for Node
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {}
};
globalThis.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};
globalThis.window.localStorage = globalThis.localStorage;
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { defaultTRSAProject } from '../src/data/defaultTRSA.js';
import {
  DRAFT_HISTORY_KEY,
  getDraftHistory,
  getDraftById,
  saveDraftToHistory,
  deleteDraftFromHistory,
  clearDraftHistory,
  exportDraftHistoryJSON
} from '../src/js/draftHistoryService.js';
import { TRSAStore, AUTO_SAVE_INTERVAL_MS } from '../src/js/app.js';

describe('TRSA LocalStorage Draft History Tests', () => {
  test('Saves and retrieves TRSA draft snapshots in localStorage', () => {
    globalThis.localStorage.clear();

    const draft1 = JSON.parse(JSON.stringify(defaultTRSAProject));
    draft1.id = 'trsa-draft-1';
    draft1.documentInfo.title = 'Semarang Fryer Line Draft 1';

    const saved = saveDraftToHistory(draft1, {
      user: { name: 'Refin A Putra', role: 'Project Engineer', initials: 'RAP' },
      builderStep: 3,
      progress: 71,
      label: 'Fryer specs checkpoint',
      isAutoSave: false
    });

    assert.ok(saved.id, 'Saved draft must have a unique ID');
    assert.strictEqual(saved.projectId, 'trsa-draft-1');
    assert.strictEqual(saved.title, 'Semarang Fryer Line Draft 1');
    assert.strictEqual(saved.builderStep, 3);
    assert.strictEqual(saved.progress, 71);
    assert.strictEqual(saved.label, 'Fryer specs checkpoint');
    assert.strictEqual(saved.isAutoSave, false);

    // Verify persisted in localStorage
    const raw = globalThis.localStorage.getItem(DRAFT_HISTORY_KEY);
    assert.ok(raw, 'Draft history must be persisted under DRAFT_HISTORY_KEY');
    const history = getDraftHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(getDraftById(saved.id).title, 'Semarang Fryer Line Draft 1');

    // Snapshot isolation: mutating original object must not mutate stored snapshot
    draft1.documentInfo.title = 'Mutated After Save';
    assert.strictEqual(getDraftById(saved.id).snapshot.documentInfo.title, 'Semarang Fryer Line Draft 1');
  });

  test('Coalesces rapid auto-saves for the same project while preserving manual checkpoints', () => {
    globalThis.localStorage.clear();

    const proj = JSON.parse(JSON.stringify(defaultTRSAProject));
    proj.id = 'trsa-auto-1';

    saveDraftToHistory(proj, { builderStep: 1, label: 'Initial Manual Save', isAutoSave: false });
    saveDraftToHistory(proj, { builderStep: 2, label: 'Auto-Saved Draft', isAutoSave: true });

    proj.documentInfo.title = 'Updated While Typing';
    saveDraftToHistory(proj, { builderStep: 2, label: 'Auto-Saved Draft', isAutoSave: true });

    const history = getDraftHistory('trsa-auto-1');
    assert.strictEqual(history.length, 2, 'Rapid auto-saves should coalesce into one auto-save entry plus the manual entry');
    assert.strictEqual(history[0].isAutoSave, true);
    assert.strictEqual(history[0].title, 'Updated While Typing');
    assert.strictEqual(history[1].isAutoSave, false);
  });

  test('TRSAStore saves drafts on create/saveRevisionHistory and resumes draft at exact step', () => {
    globalThis.localStorage.clear();

    const store = new TRSAStore();
    const created = store.createProject('Cikupa Seasoning Upgrade', 'Refin A Putra', 'Cikupa Plant');
    assert.ok(getDraftHistory(created.id).length >= 1, 'Creating a project should record an initial draft in history');

    // Modify draft at Step 4 and save a named checkpoint
    store.builderStep = 4;
    created.documentInfo.title = 'Cikupa Seasoning Upgrade - Rev A';
    store.saveDraftSnapshot({
      project: created,
      builderStep: 4,
      label: 'Before changing vendor scope',
      isAutoSave: false
    });

    const historyBeforeEdit = getDraftHistory(created.id);
    const checkpoint = historyBeforeEdit.find(d => d.label === 'Before changing vendor scope');
    assert.ok(checkpoint, 'Manual checkpoint must exist in draft history');

    // Mutate project afterward
    created.documentInfo.title = 'Cikupa Seasoning Upgrade - Experimental Edit';
    store.builderStep = 6;
    store.saveProjects();

    // Resume the earlier saved checkpoint
    const resumed = store.resumeDraft(checkpoint.id, 'replace');
    assert.ok(resumed, 'Resuming draft should return restored project');
    assert.strictEqual(resumed.documentInfo.title, 'Cikupa Seasoning Upgrade - Rev A');
    assert.strictEqual(store.currentView, 'builder', 'Resuming draft should open the Builder');
    assert.strictEqual(store.builderStep, 4, 'Resuming draft should restore the saved builder step');
  });

  test('Resuming draft as a new copy preserves existing active project', () => {
    globalThis.localStorage.clear();

    const store = new TRSAStore();
    const active = store.getActiveProject();
    const originalTitle = active.documentInfo.title;

    const saved = store.saveDraftSnapshot({
      project: active,
      builderStep: 2,
      label: 'Branch point',
      isAutoSave: false
    });

    active.documentInfo.title = 'Current Modified Title';
    const copied = store.resumeDraft(saved.id, 'new');

    assert.notStrictEqual(copied.id, active.id, 'Open as Copy must create a distinct project ID');
    assert.ok(copied.documentInfo.title.includes(originalTitle));
    assert.strictEqual(store.builderStep, 2);
    assert.strictEqual(store.projects.find(p => p.id === active.id).documentInfo.title, 'Current Modified Title');
  });

  test('Deletes individual drafts, exports JSON, and clears history', () => {
    globalThis.localStorage.clear();

    const p1 = JSON.parse(JSON.stringify(defaultTRSAProject));
    p1.id = 'trsa-del-1';
    const d1 = saveDraftToHistory(p1, { label: 'Draft One', isAutoSave: false });
    const d2 = saveDraftToHistory(p1, { label: 'Draft Two', isAutoSave: false });

    assert.strictEqual(getDraftHistory().length, 2);
    const exported = JSON.parse(exportDraftHistoryJSON());
    assert.strictEqual(exported.length, 2);

    const delRes = deleteDraftFromHistory(d1.id);
    assert.strictEqual(delRes.deleted, true);
    assert.strictEqual(getDraftHistory().length, 1);
    assert.strictEqual(getDraftHistory()[0].id, d2.id);

    clearDraftHistory();
    assert.strictEqual(getDraftHistory().length, 0);
  });

  test('30-second periodic auto-save persists form progress and restores across sessions', async () => {
    globalThis.localStorage.clear();

    assert.strictEqual(AUTO_SAVE_INTERVAL_MS, 30000, 'Default auto-save interval must be 30 seconds (30000ms)');

    const store = new TRSAStore();
    assert.strictEqual(store.autoSaveIntervalMs, 30000);
    assert.strictEqual(store.autoSaveEnabled, true);

    const created = store.createProject('Agro Line Auto-Save Test', 'Refin A Putra', 'Agro Plant');
    store.builderStep = 5;
    created.documentInfo.subTitle = 'Auto-Saved Subtitle Value';

    // Run periodic auto-save with a short test interval to verify timer-driven persistence
    store.startAutoSave(25);
    await new Promise(resolve => setTimeout(resolve, 60));
    store.stopAutoSave();

    assert.ok(store.lastAutoSavedAt, 'Periodic auto-save must record lastAutoSavedAt');

    const rawProgress = globalThis.localStorage.getItem(store.PROGRESS_STORAGE_KEY);
    assert.ok(rawProgress, 'Form progress metadata must be saved to localStorage');
    const parsedProgress = JSON.parse(rawProgress);
    assert.strictEqual(parsedProgress.activeProjectId, created.id);
    assert.strictEqual(parsedProgress.builderStep, 5);

    // Simulate page reload into a fresh TRSAStore instance
    const reloadedStore = new TRSAStore();
    reloadedStore.restoreFormProgress();
    assert.strictEqual(reloadedStore.activeProjectId, created.id, 'Reloaded store must restore active project ID');
    assert.strictEqual(reloadedStore.builderStep, 5, 'Reloaded store must restore saved builder step');
    assert.strictEqual(
      reloadedStore.getActiveProject().documentInfo.subTitle,
      'Auto-Saved Subtitle Value',
      'Reloaded store must preserve auto-saved form field values'
    );

    // Verify toggleAutoSave pauses and re-enables
    const pausedState = reloadedStore.toggleAutoSave();
    assert.strictEqual(pausedState, false);
    assert.strictEqual(reloadedStore.autoSaveIntervalId, null);
    const resumedState = reloadedStore.toggleAutoSave();
    assert.strictEqual(resumedState, true);
    assert.ok(reloadedStore.autoSaveIntervalId !== null);
    reloadedStore.stopAutoSave();
  });
});
