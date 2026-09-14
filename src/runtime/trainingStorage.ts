export type TrainingData = Record<string, string>;
export type TrainingRequest = { type: 'training-storage'; runId: string; nonce: string; requestId: number; operation: 'getItem' | 'setItem' | 'removeItem'; key: string; value?: string };
export type TrainingCapability = (request: TrainingRequest) => string | null;
export function validTrainingKey(key: unknown): key is string {
  return typeof key === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(key) && !['constructor', 'prototype', '__proto__'].includes(key);
}
export function validTrainingData(data: unknown): data is TrainingData {
  return !!data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length <= 32 && Object.entries(data).every(([key, value]) => validTrainingKey(key) && typeof value === 'string' && value.length <= 16384) && JSON.stringify(data).length <= 65536;
}
export function acceptedTrainingRequest(event: MessageEvent, frame: HTMLIFrameElement, run: { id: string; nonce: string; stopped: boolean }): event is MessageEvent<TrainingRequest> {
  const d = event.data;
  return !run.stopped && event.source === frame.contentWindow && !!d && typeof d === 'object' && !Array.isArray(d) && d.type === 'training-storage' && d.runId === run.id && d.nonce === run.nonce && Number.isSafeInteger(d.requestId) && d.requestId > 0 && validTrainingKey(d.key) && ['getItem', 'setItem', 'removeItem'].includes(d.operation) && (d.operation === 'setItem' ? typeof d.value === 'string' && d.value.length <= 16384 : d.value === undefined);
}
/** Only a copied, bounded map belonging to the selected workspace is exposed. */
export function applyTrainingRequest(data: TrainingData, request: TrainingRequest): { data: TrainingData; value: string | null } {
  if (!validTrainingKey(request.key)) throw new Error('Invalid training storage key.');
  if (request.operation === 'getItem') return { data, value: Object.hasOwn(data, request.key) ? data[request.key] : null };
  const next = { ...data };
  if (request.operation === 'removeItem') delete next[request.key];
  else next[request.key] = request.value!;
  if (!validTrainingData(next)) throw new Error('Training storage limit exceeded (32 keys, 16384 characters per value, 65536 total).');
  return { data: next, value: null };
}
export function trainingStorageScript(runId: string, nonce: string): string {
  return `<script>(() => {
const runId = ${JSON.stringify(runId)}, nonce = ${JSON.stringify(nonce)};
let sequence = 0; const pending = new Map();
addEventListener('message', event => {
  const d = event.data;
  if (event.source !== parent || !d || d.type !== 'training-storage-result' || d.runId !== runId || d.nonce !== nonce || !pending.has(d.requestId)) return;
  if (typeof d.ok !== 'boolean' || (d.ok ? d.value !== null && typeof d.value !== 'string' : typeof d.error !== 'string')) return;
  const item = pending.get(d.requestId); pending.delete(d.requestId); clearTimeout(item.timer);
  d.ok ? item.resolve(d.value) : item.reject(new Error(d.error));
});
const request = (operation, key, value) => new Promise((resolve, reject) => {
  if (typeof key !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(key) || ['constructor','prototype','__proto__'].includes(key) || (operation === 'setItem' && (typeof value !== 'string' || value.length > 16384))) return reject(new Error('Invalid training storage key or value.'));
  if (pending.size >= 32) return reject(new Error('Too many pending training storage requests.'));
  const requestId = ++sequence;
  const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('Training storage request timed out.')); }, 3000);
  pending.set(requestId, { resolve, reject, timer });
  parent.postMessage({ type: 'training-storage', runId, nonce, requestId, operation, key, ...(value === undefined ? {} : {value}) }, '*');
});
Object.defineProperty(window, 'trainingStorage', { value: Object.freeze({ getItem: key => request('getItem', key), setItem: (key, value) => request('setItem', key, value), removeItem: key => request('removeItem', key) }) });
})();</script>`;
}
