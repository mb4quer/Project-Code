import { acceptedTrainingRequest, trainingStorageScript, type TrainingCapability } from './trainingStorage';
import { acceptedWeatherRequest, weatherBridgeScript, type WeatherCapability } from './weatherApi';
import type { Files, RuntimeController, RuntimeEvent } from '../contracts';

const MAX_FILES = 128;
const MAX_FILE_SIZE = 512 * 1024;
const MAX_TOTAL_SIZE = 2 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 8 * 1024;
const MAX_MESSAGES_PER_SECOND = 80;
const COMPILE_TIMEOUT_MS = 12_000;
const LOOP_LIMIT = 100_000;

type RunIdentity = { id: string; nonce: string; stopped: boolean };
type ActiveRun = RunIdentity & { messageWindowStarted: number; messageCount: number; storage?: TrainingCapability; storageWindow: number; storageCount: number; lastStorageId: number; liveWeather?: WeatherCapability; weatherWindow: number; weatherCount: number; lastWeatherId: number; weatherRequests: Set<AbortController> };
type CompiledDocument = { html: string; head: string };
type WorkerResponse = { id: number; ok: boolean; html?: string; head?: string; error?: string };
type Pending = { resolve: (document: CompiledDocument) => void; reject: (error: Error) => void; timer: number };

function createToken(): string {
  const bytes = new Uint32Array(4);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (item) => item.toString(36)).join('') || `${Date.now()}${Math.random()}`;
}

export function validateFiles(input: Files): Files {
  const entries = Object.entries(input);
  if (!entries.length) throw new Error('Add at least index.html before running.');
  if (entries.length > MAX_FILES) throw new Error(`A preview can contain at most ${MAX_FILES} files.`);
  let total = 0;
  const files: Files = Object.create(null) as Files;
  for (const [path, contents] of entries) {
    const normalized = path.replaceAll('\\', '/');
    if (!normalized || normalized.startsWith('/') || normalized.split('/').some((part) => part === '..' || !part)) {
      throw new Error(`Invalid project file path: ${path}`);
    }
    if (typeof contents !== 'string') throw new Error(`File ${path} must contain text.`);
    if (contents.length > MAX_FILE_SIZE) throw new Error(`File ${path} is too large for the preview.`);
    total += contents.length;
    files[normalized] = contents;
  }
  if (total > MAX_TOTAL_SIZE) throw new Error('The preview project is too large.');
  if (!Object.hasOwn(files, 'index.html')) throw new Error('index.html is required.');
  return files;
}

export function createSrcdoc(html: string, run: RunIdentity, head = '', training = false, weather?: { live: boolean }): string {
  const bridge = `
<script>
(() => {
  const runId = ${JSON.stringify(run.id)};
  const nonce = ${JSON.stringify(run.nonce)};
  const cap = ${MAX_MESSAGE_LENGTH};
  const maxPerSecond = ${MAX_MESSAGES_PER_SECOND};
  let messageWindowStarted = performance.now();
  let messageCount = 0;
  const send = (kind, level, value) => {
    const now = performance.now();
    if (now - messageWindowStarted >= 1000) { messageWindowStarted = now; messageCount = 0; }
    if (messageCount >= maxPerSecond) return;
    messageCount += 1;
    let message;
    try { message = typeof value === 'string' ? value : String(value); } catch { message = '[unprintable value]'; }
    parent.postMessage({ type: 'learner-runtime', runId, nonce, kind, level, message: message.slice(0, cap) }, '*');
  };
  const tick = () => {
    const next = (globalThis.__learnerRuntimeTicks || 0) + 1;
    globalThis.__learnerRuntimeTicks = next;
    if (next > ${LOOP_LIMIT}) throw new Error('Preview stopped a loop after ${LOOP_LIMIT} iterations.');
  };
  Object.defineProperty(globalThis, '__learnerRuntimeTick', { value: tick, configurable: true });
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level];
    console[level] = (...items) => { send('console', level, items.map((item) => { try { return typeof item === 'string' ? item : JSON.stringify(item); } catch { return String(item); } }).join(' ')); original.apply(console, items); };
  }
  addEventListener('error', (event) => send('error', 'error', event.message || 'Uncaught error'));
  addEventListener('unhandledrejection', (event) => send('error', 'error', event.reason && event.reason.message ? event.reason.message : String(event.reason)));
})();
</script>`;
  const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  // The CSP and bridge precede every byte of learner HTML. Wrapping the source
  // also handles malformed documents that place scripts before a head element.
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}">${bridge}${training ? trainingStorageScript(run.id, run.nonce) : ''}${weather ? weatherBridgeScript(run.id, run.nonce, weather.live) : ''}${head}</head><body>${html}</body></html>`;
}

export function isAcceptedRuntimeMessage(event: MessageEvent, frame: HTMLIFrameElement, run: RunIdentity | undefined): event is MessageEvent<{ type: 'learner-runtime'; runId: string; nonce: string; kind: 'console' | 'error'; level?: RuntimeEvent['level']; message: string }> {
  const data = event.data;
  return Boolean(
    run && event.source === frame.contentWindow && data && typeof data === 'object' && !Array.isArray(data) &&
    data.type === 'learner-runtime' && data.runId === run.id && data.nonce === run.nonce &&
    (data.kind === 'console' || data.kind === 'error') && typeof data.message === 'string' && data.message.length <= MAX_MESSAGE_LENGTH &&
    (data.level === undefined || ['log', 'info', 'warn', 'error'].includes(data.level)),
  );
}

export function createRuntime(container: HTMLElement, onEvent: (event: RuntimeEvent) => void): RuntimeController {
  let frame = document.createElement('iframe');
  frame.title = 'Learner preview';
  frame.setAttribute('sandbox', 'allow-scripts allow-forms');
  frame.setAttribute('referrerpolicy', 'no-referrer');

  let worker: Worker | undefined;
  let sequence = 0;
  let active: ActiveRun | undefined;
  const pending = new Map<number, Pending>();
  const report = (type: RuntimeEvent['type'], message: string, level?: RuntimeEvent['level']) => onEvent({ type, message: message.slice(0, MAX_MESSAGE_LENGTH), ...(level ? { level } : {}) });

  const clearWorker = (reason?: Error) => {
    worker?.terminate();
    worker = undefined;
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(reason ?? new Error('Preview compilation was stopped.'));
    }
    pending.clear();
  };
  const ensureWorker = () => {
    if (worker) return worker;
    worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const request = pending.get(response?.id);
      if (!request) return;
      pending.delete(response.id);
      clearTimeout(request.timer);
      if (response.ok && typeof response.html === 'string') request.resolve({ html: response.html, head: typeof response.head === 'string' ? response.head : '' });
      else request.reject(new Error(response.error || 'Preview compilation failed.'));
    });
    worker.addEventListener('error', () => clearWorker(new Error('The preview compiler stopped unexpectedly.')));
    return worker;
  };
  const compile = (files: Files) => new Promise<CompiledDocument>((resolve, reject) => {
    const id = ++sequence;
    const timer = window.setTimeout(() => {
      clearWorker(new Error('Preview compilation timed out and was restarted.'));
    }, COMPILE_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    ensureWorker().postMessage({ type: 'compile', id, files });
  });
  const onMessage = (event: MessageEvent) => {
    const current = active;
    if (!current) return;
    if (current.liveWeather && acceptedWeatherRequest(event, frame, current)) {
      if (event.data.requestId <= current.lastWeatherId) return;
      current.lastWeatherId = event.data.requestId;
      const now = performance.now();
      if (now - current.weatherWindow >= 60000) { current.weatherWindow = now; current.weatherCount = 0; }
      const targetFrame = frame, reply = { type: 'weather-result', runId: current.id, nonce: current.nonce, requestId: event.data.requestId };
      const send = (data: object) => { if (active === current && !current.stopped && frame === targetFrame) targetFrame.contentWindow?.postMessage({ ...reply, ...data }, '*'); };
      if (++current.weatherCount > 6 || current.weatherRequests.size >= 4) { send({ ok: false, error: 'Live weather limit reached. Use fixtures or retry in a minute.' }); return; }
      const controller = new AbortController(); current.weatherRequests.add(controller);
      void current.liveWeather(event.data.city, controller.signal).then(value => {
        if (!value || typeof value.ok !== 'boolean' || !Number.isInteger(value.status) || JSON.stringify(value).length > 2048) throw new Error('Invalid weather capability response.');
        send({ ok: true, value });
      }).catch(error => send({ ok: false, error: error instanceof Error ? error.message.slice(0, 300) : 'Live weather unavailable. Try fixture mode.' })).finally(() => current.weatherRequests.delete(controller));
      return;
    }
    if (current.storage && acceptedTrainingRequest(event, frame, current)) {
      if (event.data.requestId <= current.lastStorageId) return;
      current.lastStorageId = event.data.requestId;
      const now = performance.now();
      if (now - current.storageWindow >= 1000) { current.storageWindow = now; current.storageCount = 0; }
      const reply = { type: 'training-storage-result', runId: current.id, nonce: current.nonce, requestId: event.data.requestId };
      try {
        if (++current.storageCount > 30) throw new Error('Training storage rate limit exceeded. Try again shortly.');
        const value = current.storage(event.data);
        frame.contentWindow?.postMessage({ ...reply, ok: true, value }, '*');
      } catch (error) { frame.contentWindow?.postMessage({ ...reply, ok: false, error: error instanceof Error ? error.message.slice(0, 300) : 'Training save failed.' }, '*'); }
      return;
    }
    if (!isAcceptedRuntimeMessage(event, frame, current)) return;
    const now = performance.now();
    if (now - current.messageWindowStarted >= 1000) {
      current.messageWindowStarted = now;
      current.messageCount = 0;
    }
    if (current.messageCount >= MAX_MESSAGES_PER_SECOND) return;
    current.messageCount += 1;
    report(event.data.kind === 'error' ? 'error' : 'console', event.data.message, event.data.level);
  };
  window.addEventListener('message', onMessage);

  const stop = () => {
    if (active) { active.stopped = true; for (const request of active.weatherRequests) request.abort(); }
    active = undefined;
    clearWorker();
    frame.remove();
    report('status', 'Preview stopped.');
  };

  return {
    async run(input: Files, storage?: TrainingCapability, weather?: { live?: WeatherCapability }): Promise<void> {
      const files = validateFiles(input);
      if (active) stop();
      const run: ActiveRun = { id: createToken(), nonce: createToken(), stopped: false, messageWindowStarted: performance.now(), messageCount: 0, storage, storageWindow: performance.now(), storageCount: 0, lastStorageId: 0, liveWeather: weather?.live, weatherWindow: performance.now(), weatherCount: 0, lastWeatherId: 0, weatherRequests: new Set() };
      active = run;
      report('status', 'Compiling preview…');
      try {
        const compiled = await compile(files);
        if (run.stopped || active !== run) throw new Error('Preview run was stopped.');
        frame = document.createElement('iframe');
        frame.title = 'Learner preview';
        frame.setAttribute('sandbox', 'allow-scripts allow-forms');
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.srcdoc = createSrcdoc(compiled.html, run, compiled.head, !!storage, weather ? { live: !!weather.live } : undefined);
        container.replaceChildren(frame);
        report('status', 'Preview mounted.');
      } catch (error) {
        if (active === run) report('error', error instanceof Error ? error.message : String(error), 'error');
        throw error;
      }
    },
    stop,
    dispose() {
      stop();
      window.removeEventListener('message', onMessage);
      frame.remove();
    },
  };
}
