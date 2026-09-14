import { validTrainingData } from '../runtime/trainingStorage';
import type { ChallengeResult, DemoId, Files, LearningSession, LessonWorkspace, Session, Workspace } from '../contracts';
import { createInitialSession, demos } from '../data/demos';

const STORAGE_KEY = 'project-code.session.v1';
const MAX_FILES_PER_WORKSPACE = 100;
const MAX_FILE_CHARACTERS = 250_000;
const MAX_WORKSPACE_CHARACTERS = 1_000_000;

export class SessionStoreError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SessionStoreError';
  }
}

function describeStorageFailure(action: 'read' | 'write', error: unknown): SessionStoreError {
  const name = error instanceof Error ? error.name : '';
  const quota = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
  return new SessionStoreError(
    quota
      ? 'Unable to save your session because browser storage is full. Export a backup and free some space before trying again.'
      : `Unable to ${action} the local session. Browser storage may be unavailable in this preview.`,
    error,
  );
}

function randomWriterId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `writer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validPath(path: string): boolean {
  return path.length > 0 && path.length <= 240 && !path.startsWith('/') && !path.includes('\\') && !path.includes('\0') && path.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}

function files(value: unknown): value is Files {
  if (!plainRecord(value)) return false;
  const entries = Object.entries(value);
  if (entries.length > MAX_FILES_PER_WORKSPACE) return false;
  let totalCharacters = 0;
  return entries.every(([path, contents]) => {
    if (!validPath(path) || typeof contents !== 'string' || contents.length > MAX_FILE_CHARACTERS) return false;
    totalCharacters += contents.length;
    return totalCharacters <= MAX_WORKSPACE_CHARACTERS;
  });
}

function workspace(value: unknown, expectedId: DemoId): value is Workspace {
  if (!plainRecord(value) || (value.trainingData !== undefined && !validTrainingData(value.trainingData)) || value.id !== expectedId || !files(value.files) || typeof value.activeFile !== 'string' || !Object.hasOwn(value.files, value.activeFile) || typeof value.version !== 'number' || !Number.isSafeInteger(value.version) || value.version < 1 || typeof value.updatedAt !== 'string') return false;
  if (value.checkpoint === undefined) return true;
  return plainRecord(value.checkpoint) && files(value.checkpoint.files) && typeof value.checkpoint.createdAt === 'string';
}

function lessonWorkspace(value: unknown): value is LessonWorkspace {
  if (!plainRecord(value) || (value.trainingData !== undefined && !validTrainingData(value.trainingData)) || !files(value.files) || typeof value.activeFile !== 'string' || !Object.hasOwn(value.files, value.activeFile) || typeof value.version !== 'number' || !Number.isSafeInteger(value.version) || value.version < 1 || typeof value.updatedAt !== 'string') return false;
  return value.checkpoint === undefined || (plainRecord(value.checkpoint) && files(value.checkpoint.files) && typeof value.checkpoint.createdAt === 'string');
}

function stringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every(item => typeof item === 'string'); }
function learning(value: unknown): value is LearningSession {
  if (!plainRecord(value) || value.version !== 1 || !plainRecord(value.location) || !plainRecord(value.topics) || !plainRecord(value.projectWorkspaces) || !plainRecord(value.challengeWorkspaces)) return false;
  const location = value.location;
  if (!['dashboard', 'topic', 'lab'].includes(location.view as string)) return false;
  if (!['projectId', 'topicId', 'stepId', 'challengeId'].every(key => location[key] === undefined || typeof location[key] === 'string')) return false;
  if (!Object.values(value.projectWorkspaces).every(lessonWorkspace) || !Object.values(value.challengeWorkspaces).every(lessonWorkspace)) return false;
  return Object.values(value.topics).every(progress => {
    if (!plainRecord(progress) || !stringArray(progress.activityIds) || !plainRecord(progress.blankAttempts) || !plainRecord(progress.questionAttempts) || !Array.isArray(progress.reveals) || !stringArray(progress.revealedQuestionIdentities) || !stringArray(progress.creditedQuestionIds) || !stringArray(progress.creditedQuestionIdentities) || !plainRecord(progress.challengeResults) || !plainRecord(progress.challengeAttempts) || (progress.lastMissQuestionId !== undefined && typeof progress.lastMissQuestionId !== 'string') || (progress.pendingEquivalentGroup !== undefined && typeof progress.pendingEquivalentGroup !== 'string')) return false;
    const attempts = (entry: unknown, keys: string[]) => Array.isArray(entry) && entry.every(item => plainRecord(item) && keys.every(key => typeof item[key] === (key === 'correct' || key === 'revealedBeforeAttempt' ? 'boolean' : 'string')));
    return Object.values(progress.blankAttempts).every(entry => attempts(entry, ['blankId', 'answer', 'correct', 'at'])) &&
      Object.values(progress.questionAttempts).every(entry => attempts(entry, ['questionId', 'identity', 'answer', 'correct', 'revealedBeforeAttempt', 'at'])) &&
      progress.reveals.every(item => plainRecord(item) && typeof item.questionId === 'string' && typeof item.identity === 'string' && typeof item.at === 'string') &&
      Object.values(progress.challengeResults).every(item => plainRecord(item) && typeof item.challengeId === 'string' && typeof item.passed === 'boolean' && typeof item.at === 'string' && (item.message === undefined || typeof item.message === 'string') && (item.checks === undefined || stringArray(item.checks))) &&
      Object.values(progress.challengeAttempts).every(entry => Array.isArray(entry) && entry.every(item => plainRecord(item) && typeof item.challengeId === 'string' && typeof item.passed === 'boolean' && typeof item.at === 'string' && (item.message === undefined || typeof item.message === 'string') && (item.checks === undefined || stringArray(item.checks))));
  });
}

function initialLearning(): LearningSession {
  return { version: 1, location: { view: 'lab' }, topics: {}, projectWorkspaces: {}, challengeWorkspaces: {} };
}

/** Phase-1 schema version stays 1; this is an additive, typed extension. */
export function migrateSession(session: Session): Session {
  const next = cloneSession(session);
  if (!next.learning) next.learning = initialLearning();
  return next;
}

/** Validates JSON-derived data at the persistence boundary; it never trusts a type assertion. */
export function isSession(value: unknown): value is Session {
  if (!plainRecord(value) || value.schemaVersion !== 1 || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0 || typeof value.writerId !== 'string' || !value.writerId || (value.currentWorkspace !== 'vanilla' && value.currentWorkspace !== 'react')) return false;
  if (!plainRecord(value.workspaces) || !workspace(value.workspaces.vanilla, 'vanilla') || !workspace(value.workspaces.react, 'react')) return false;
  const location = value.location;
  if (!plainRecord(location) || !['projectId', 'topicId', 'activityId'].every(key => typeof location[key] === 'string')) return false;
  if (!plainRecord(value.progress) || !plainRecord(value.progress.attempts) || !plainRecord(value.progress.creditedQuestionIds) || !plainRecord(value.progress.challengeResults) || !Array.isArray(value.progress.completedActivityIds) || !Array.isArray(value.progress.completedMilestoneIds)) return false;
  return value.progress.completedActivityIds.every(item => typeof item === 'string') && value.progress.completedMilestoneIds.every(item => typeof item === 'string') && Object.values(value.progress.attempts).every(item => Array.isArray(item)) && Object.values(value.progress.creditedQuestionIds).every(item => Array.isArray(item) && item.every(questionId => typeof questionId === 'string')) && (value.learning === undefined || learning(value.learning));
}

function cloneSession(session: Session): Session {
  return JSON.parse(JSON.stringify(session)) as Session;
}

function parseSession(raw: string): Session {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new SessionStoreError('The saved session is malformed JSON. It was left untouched so you can recover it from browser storage.', error);
  }
  if (!isSession(parsed)) {
    throw new SessionStoreError('The saved session does not match this app’s versioned workspace/progress format. It was left untouched to avoid data loss.');
  }
  return migrateSession(parsed);
}

/** Checkpoint one workspace without touching the other demo’s draft. */
export function checkpointWorkspace(session: Session, id: DemoId): Session {
  const next = cloneSession(session);
  const target = next.workspaces[id];
  target.checkpoint = { files: { ...target.files }, createdAt: new Date().toISOString() };
  target.updatedAt = new Date().toISOString();
  return next;
}

/** Reset only the selected demo, preferring its checkpoint and otherwise its shipped files. */
export function resetWorkspace(session: Session, id: DemoId): Session {
  const next = cloneSession(session);
  const target = next.workspaces[id];
  target.files = { ...(target.checkpoint?.files ?? demos[id].files) };
  target.activeFile = Object.keys(target.files)[0] ?? 'index.html';
  target.version += 1;
  target.updatedAt = new Date().toISOString();
  return next;
}

export class SessionStore {
  private readonly storage: Storage | undefined;
  private readonly writerId = randomWriterId();
  private readonly listeners = new Set<() => void>();
  private readonly onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) this.emit();
  };

  constructor(storage?: Storage) {
    this.storage = storage ?? this.browserStorage();
    if (typeof window !== 'undefined') window.addEventListener('storage', this.onStorage);
  }

  private browserStorage(): Storage | undefined {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }

  private emit(): void {
    this.listeners.forEach(listener => listener());
  }

  private readExisting(): Session | undefined {
    if (!this.storage) return undefined;
    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch (error) {
      throw describeStorageFailure('read', error);
    }
    return raw === null ? undefined : parseSession(raw);
  }

  /**
   * Phase 1 stores local workspace drafts and the reserved progress envelope only.
   * Syncing learner records across devices belongs to a later persistence phase.
   */
  load(): Session {
    const stored = this.readExisting();
    return migrateSession(stored ?? createInitialSession());
  }

  save(session: Session): Session {
    if (!isSession(session)) throw new SessionStoreError('Cannot save an invalid session. The workspace/progress envelope failed validation.');
    if (!this.storage) throw new SessionStoreError('Cannot save the session because browser storage is unavailable in this preview.');

    const current = this.readExisting(); // Fresh read makes stale tabs fail before they overwrite data.
    const expected = current ?? createInitialSession();
    if (session.revision !== expected.revision || session.writerId !== expected.writerId) {
      throw new SessionStoreError('This session was changed in another tab. Reload it or export your conflict copy before saving.');
    }

    const next: Session = { ...migrateSession(session), revision: session.revision + 1, writerId: this.writerId };
    let serialized: string;
    try {
      serialized = JSON.stringify(next);
    } catch (error) {
      throw new SessionStoreError('Cannot save this session because it contains data that cannot be serialized.', error);
    }
    try {
      this.storage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      throw describeStorageFailure('write', error);
    }
    this.emit();
    return cloneSession(next);
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  exportSession(session: Session): string {
    if (!isSession(session)) throw new SessionStoreError('Cannot export an invalid session backup.');
    try {
      return JSON.stringify(session, null, 2);
    } catch (error) {
      throw new SessionStoreError('Cannot export this session because it contains data that cannot be serialized.', error);
    }
  }

  importSession(json: string): Session {
    if (typeof json !== 'string') throw new SessionStoreError('Cannot import a backup that is not text.');
    return cloneSession(parseSession(json));
  }

  dispose(): void {
    if (typeof window !== 'undefined') window.removeEventListener('storage', this.onStorage);
    this.listeners.clear();
  }
}
