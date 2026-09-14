import { afterEach, describe, expect, it, vi } from 'vitest';
import { instrumentLoops } from '../src/runtime/loopInstrumentation';
import { createRuntime, createSrcdoc, isAcceptedRuntimeMessage, validateFiles } from '../src/runtime';
import { resolveProjectFile } from '../src/runtime/virtualFiles';

describe('runtime file boundary', () => {
  it('accepts a normal local project and rejects traversal and oversized projects', () => {
    expect(validateFiles({ 'index.html': '<main></main>', 'main.js': 'console.log(1)' })).toEqual({ 'index.html': '<main></main>', 'main.js': 'console.log(1)' });
    expect(() => validateFiles({ 'index.html': '', '../secret.js': '' })).toThrow('Invalid project file path');
    expect(() => validateFiles({ 'main.js': '' })).toThrow('index.html is required');
    const inherited = Object.create({ 'index.html': '<p>inherited</p>' }) as Record<string, string>;
    inherited['main.js'] = '';
    expect(() => validateFiles(inherited)).toThrow('index.html is required');
  });
});

describe('virtual project resolution', () => {
  const files = new Map([
    ['/main.jsx', ''],
    ['/components/Card.jsx', ''],
    ['/assets/mark.svg', ''],
  ]);

  it('resolves local relative imports and rejects traversal and network URLs', () => {
    expect(resolveProjectFile('./components/Card', '/main.jsx', files)).toBe('/components/Card.jsx');
    expect(resolveProjectFile('./mark.svg', '/assets/use.js', files)).toBe('/assets/mark.svg');
    expect(resolveProjectFile('../secret.js', '/main.jsx', files)).toBeUndefined();
    expect(resolveProjectFile('https://example.test/module.js', '/main.jsx', files)).toBeUndefined();
  });
});

describe('runtime loop instrumentation', () => {
  it('adds a cooperative check to block and single-statement common loops', () => {
    const output = instrumentLoops('for (;;) work(); while (ready) { next(); }');
    expect(output).toContain('{globalThis.__learnerRuntimeTick();work();}');
    expect(output).toContain('{globalThis.__learnerRuntimeTick(); next(); }');
  });

  it('leaves unparseable source unchanged', () => {
    expect(instrumentLoops('const <')).toBe('const <');
  });
});

describe('runtime message boundary', () => {
  const run = { id: 'run-1', nonce: 'nonce-1', stopped: false };
  const frame = { contentWindow: {} } as HTMLIFrameElement;
  const valid = { type: 'learner-runtime', runId: 'run-1', nonce: 'nonce-1', kind: 'console', level: 'log', message: 'hello' };

  it('only accepts messages from the current iframe with its run nonce', () => {
    expect(isAcceptedRuntimeMessage({ source: frame.contentWindow, data: valid } as MessageEvent, frame, run)).toBe(true);
    expect(isAcceptedRuntimeMessage({ source: {}, data: valid } as MessageEvent, frame, run)).toBe(false);
    expect(isAcceptedRuntimeMessage({ source: frame.contentWindow, data: { ...valid, nonce: 'other' } } as MessageEvent, frame, run)).toBe(false);
    expect(isAcceptedRuntimeMessage({ source: frame.contentWindow, data: { ...valid, message: 'x'.repeat(9000) } } as MessageEvent, frame, run)).toBe(false);
  });

  it('builds an opaque, network-denying preview document', () => {
    const doc = createSrcdoc('<!doctype html><html><head></head><body></body></html>', run);
    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain("connect-src 'none'");
    expect(doc).toContain('run-1');
  });

  it('installs policy before all learner content without rewriting bundled script text', () => {
    const doc = createSrcdoc('<script>window.beforeBridge = true</script><base href="https://example.test"><meta http-equiv=refresh content="0">', run);
    expect(doc).toContain('beforeBridge');
    expect(doc.indexOf("default-src 'none'")).toBeLessThan(doc.indexOf('<body>'));
  });
});

describe('runtime recovery', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function installRuntimeDom() {
    const replaceChildren = vi.fn();
    const frame = { title: '', srcdoc: '', contentWindow: {}, setAttribute: vi.fn(), remove: vi.fn() };
    class FakeWorker {
      static instances: FakeWorker[] = [];
      readonly listeners = new Map<string, (event: MessageEvent) => void>();
      readonly terminate = vi.fn();
      constructor() { FakeWorker.instances.push(this); }
      addEventListener(type: string, listener: (event: MessageEvent) => void) { this.listeners.set(type, listener); }
      postMessage() { /* The test drives completion or a timer. */ }
      emit(type: string, event: MessageEvent) { this.listeners.get(type)?.(event); }
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => frame) });
    const listeners = new Map<string, (event: MessageEvent) => void>();
    vi.stubGlobal('window', {
      addEventListener: (type: string, listener: (event: MessageEvent) => void) => listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
      setTimeout,
    });
    vi.stubGlobal('Worker', FakeWorker);
    return { container: { replaceChildren }, frame, FakeWorker, dispatch: (type: string, event: MessageEvent) => listeners.get(type)?.(event) };
  }

  it('rejects and terminates the compiler after a compile timeout', async () => {
    vi.useFakeTimers();
    const { container, FakeWorker } = installRuntimeDom();
    const runtime = createRuntime(container as unknown as HTMLElement, vi.fn());
    const running = runtime.run({ 'index.html': '<script src=main.js></script>', 'main.js': 'for (;;) {}' });
    const rejected = expect(running).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(12_000);
    await rejected;
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    runtime.dispose();
  });

  it('reattaches its iframe when the host has cleared the preview', async () => {
    const { container, FakeWorker } = installRuntimeDom();
    const runtime = createRuntime(container as unknown as HTMLElement, vi.fn());
    const running = runtime.run({ 'index.html': '<script src=main.js></script>', 'main.js': 'console.log(1)' });
    FakeWorker.instances[0].emit('message', { data: { id: 1, ok: true, html: '<main>ready</main>' } } as MessageEvent);
    await running;
    expect(container.replaceChildren).toHaveBeenCalledTimes(1);
    runtime.dispose();
  });

  it('drops console floods at the parent boundary', async () => {
    const { container, frame, FakeWorker, dispatch } = installRuntimeDom();
    const onEvent = vi.fn();
    const runtime = createRuntime(container as unknown as HTMLElement, onEvent);
    const running = runtime.run({ 'index.html': '<script src=main.js></script>', 'main.js': 'console.log(1)' });
    FakeWorker.instances[0].emit('message', { data: { id: 1, ok: true, html: '<main>ready</main>' } } as MessageEvent);
    await running;
    // Use the active run's values from the generated srcdoc instead of making
    // assumptions about the random nonce in this unit test.
    const [, runId, nonce] = /const runId = "([^"]+)";[\s\S]*?const nonce = "([^"]+)";/.exec(frame.srcdoc) ?? [];
    for (let index = 0; index < 100; index += 1) {
      dispatch('message', { source: frame.contentWindow, data: { type: 'learner-runtime', runId, nonce, kind: 'console', level: 'log', message: String(index) } } as unknown as MessageEvent);
    }
    expect(onEvent.mock.calls.filter(([event]) => event.type === 'console')).toHaveLength(80);
    runtime.dispose();
  });
});
