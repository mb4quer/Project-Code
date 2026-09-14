import { describe, it, expect } from 'vitest';
import { acceptedTrainingRequest, applyTrainingRequest, validTrainingData, type TrainingRequest } from '../src/runtime/trainingStorage';
import { createInitialSession } from '../src/data/demos';
import { isSession, migrateSession } from '../src/persistence/store';
import { zipFiles } from '../src/exportProject';

describe('scoped training persistence', () => {
  const request: TrainingRequest = { type: 'training-storage', runId: 'run', nonce: 'nonce', requestId: 1, operation: 'setItem', key: 'tasks', value: '[]' };
  const frame = { contentWindow: {} } as HTMLIFrameElement;
  const run = { id: 'run', nonce: 'nonce', stopped: false };
  it('requires the active frame, nonce, operation, safe key and bounded value', () => {
    const event = { source: frame.contentWindow, data: request } as MessageEvent;
    expect(acceptedTrainingRequest(event, frame, run)).toBe(true);
    for (const patch of [{ nonce: 'forged' }, { key: '__proto__' }, { key: '../session' }, { operation: 'clear' }, { value: 'x'.repeat(16385) }, { requestId: -1 }]) expect(acceptedTrainingRequest({ ...event, data: { ...request, ...patch } } as MessageEvent, frame, run)).toBe(false);
    expect(acceptedTrainingRequest({ ...event, source: {} } as MessageEvent, frame, run)).toBe(false);
    expect(acceptedTrainingRequest(event, frame, { ...run, stopped: true })).toBe(false);
  });
  it('copies writes, bounds total data, and never reads inherited values', () => {
    const original = { tasks: 'old' };
    expect(applyTrainingRequest(original, request).data).toEqual({ tasks: '[]' });
    expect(original.tasks).toBe('old');
    expect(applyTrainingRequest({}, { ...request, operation: 'getItem', key: 'toString', value: undefined }).value).toBeNull();
    expect(applyTrainingRequest(original, { ...request, operation: 'removeItem', value: undefined }).data).toEqual({});
    expect(validTrainingData(Object.fromEntries(Array.from({ length: 33 }, (_, n) => ['key' + n, ''])))).toBe(false);
    expect(() => applyTrainingRequest({ a: 'x'.repeat(16384), b: 'x'.repeat(16384), c: 'x'.repeat(16384) }, { ...request, value: 'x'.repeat(16384) })).toThrow('limit');
  });
  it('preserves old drafts and roundtrips additive data without accepting invalid imports', () => {
    const old = createInitialSession(); old.workspaces.vanilla.files['main.js'] = 'my draft';
    const migrated = migrateSession(old);
    expect(migrated.workspaces).toEqual(old.workspaces);
    migrated.workspaces.vanilla.trainingData = { tasks: '[{"id":1}]' };
    expect(isSession(JSON.parse(JSON.stringify(migrated)))).toBe(true);
    migrated.workspaces.vanilla.trainingData.tasks = 'x'.repeat(16385);
    expect(isSession(migrated)).toBe(false);
  });
});

describe('runnable ZIP boundary', () => {
  it('writes UTF-8 file bytes and rejects archive traversal', () => {
    const data = zipFiles({ 'source/main.js': 'const name = "café";' });
    const view = new DataView(data.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const nameLength = view.getUint16(26, true), length = view.getUint32(18, true);
    expect(new TextDecoder().decode(data.slice(30 + nameLength, 30 + nameLength + length))).toBe('const name = "café";');
    expect(() => zipFiles({ '../outside.js': '' })).toThrow('Unsupported export path');
  });
});
