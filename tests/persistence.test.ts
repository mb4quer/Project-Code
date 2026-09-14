import { describe, expect, it, vi } from 'vitest';
import { createInitialSession } from '../src/data/demos';
import { checkpointWorkspace, migrateSession, resetWorkspace, SessionStore, SessionStoreError } from '../src/persistence/store';

const KEY = 'project-code.session.v1';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe('SessionStore', () => {
  it('saves and reloads the complete versioned workspace/progress envelope', () => {
    const storage = memoryStorage();
    const first = new SessionStore(storage);
    const draft = first.load();
    draft.workspaces.vanilla.files['main.js'] = 'console.log("saved draft")';
    draft.progress.completedActivityIds.push('welcome');

    const saved = first.save(draft);
    const reloaded = new SessionStore(storage).load();

    expect(saved.revision).toBe(1);
    expect(reloaded).toMatchObject({ schemaVersion: 1, revision: 1 });
    expect(reloaded.workspaces.vanilla.files['main.js']).toContain('saved draft');
    expect(reloaded.progress.completedActivityIds).toEqual(['welcome']);
  });

  it('does not overwrite malformed saved records', () => {
    const storage = memoryStorage();
    storage.setItem(KEY, '{definitely not json');
    const store = new SessionStore(storage);

    expect(() => store.load()).toThrow(/malformed JSON/i);
    expect(() => store.save(createInitialSession())).toThrow(/malformed JSON/i);
    expect(storage.getItem(KEY)).toBe('{definitely not json');
  });

  it('migrates a schema-1 snapshot without learning progress and rejects malformed learning data', () => {
    const legacy = createInitialSession();
    delete legacy.learning;
    const migrated = migrateSession(legacy);
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.learning).toMatchObject({ version: 1, location: { view: 'lab' } });
    const malformed = createInitialSession();
    malformed.learning = { ...malformed.learning!, location: { view: 'not-a-view' as 'lab' } };
    expect(() => new SessionStore(memoryStorage()).importSession(JSON.stringify(malformed))).toThrow(/versioned workspace\/progress format/i);
  });

  it('blocks a stale tab before it can overwrite a newer draft', () => {
    const storage = memoryStorage();
    const first = new SessionStore(storage);
    const second = new SessionStore(storage);
    const firstDraft = first.load();
    const staleDraft = second.load();
    firstDraft.workspaces.vanilla.files['main.js'] = 'newer draft';
    first.save(firstDraft);

    staleDraft.workspaces.vanilla.files['main.js'] = 'stale draft';
    expect(() => second.save(staleDraft)).toThrow(/another tab/i);
    expect(new SessionStore(storage).load().workspaces.vanilla.files['main.js']).toBe('newer draft');
  });

  it('reports write failures without claiming the draft was saved', () => {
    const storage = memoryStorage();
    storage.setItem = vi.fn(() => { throw new DOMException('full', 'QuotaExceededError'); });
    const store = new SessionStore(storage);

    expect(() => store.save(store.load())).toThrow(/storage is full/i);
  });

  it('exports and validates backups before returning imported sessions', () => {
    const store = new SessionStore(memoryStorage());
    const source = createInitialSession();
    const backup = store.exportSession(source);

    expect(store.importSession(backup)).toEqual(source);
    expect(() => store.importSession('{"schemaVersion":2}')).toThrow(/versioned workspace\/progress format/i);
  });

  it('rejects imported workspaces with unsafe paths or a missing active file', () => {
    const store = new SessionStore(memoryStorage());
    const unsafePath = createInitialSession();
    unsafePath.workspaces.vanilla.files['../escape.js'] = 'bad';
    expect(() => store.importSession(JSON.stringify(unsafePath))).toThrow(/versioned workspace\/progress format/i);

    const missingActiveFile = createInitialSession();
    missingActiveFile.workspaces.react.activeFile = 'missing.jsx';
    expect(() => store.importSession(JSON.stringify(missingActiveFile))).toThrow(/versioned workspace\/progress format/i);
  });

  it('checkpoints and resets only the requested demo draft', () => {
    const session = createInitialSession();
    session.workspaces.vanilla.files['main.js'] = 'checkpoint me';
    const checkpointed = checkpointWorkspace(session, 'vanilla');
    checkpointed.workspaces.vanilla.files['main.js'] = 'discard this';
    checkpointed.workspaces.react.files['App.jsx'] = 'keep this react draft';

    const reset = resetWorkspace(checkpointed, 'vanilla');
    expect(reset.workspaces.vanilla.files['main.js']).toBe('checkpoint me');
    expect(reset.workspaces.react.files['App.jsx']).toBe('keep this react draft');
  });

  it('notifies subscribers after a successful local save', () => {
    const store = new SessionStore(memoryStorage());
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    store.save(store.load());
    stop();
    store.save(store.load());

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('uses descriptive error instances', () => {
    const store = new SessionStore(memoryStorage());
    expect(() => store.importSession('bad')).toThrow(SessionStoreError);
  });
});
