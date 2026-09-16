import { reactAssessmentBody, reactAssessmentNeedsStorage } from './reactAssessment';
import { reactStorageScenarios } from '../content/reactReferences';
import { ecommerceAssessmentBody, ecommerceAssessmentNeedsStorage } from './ecommerceAssessment';
import { ecommerceStorageScenarios } from '../content/ecommerceReferences';
import { weatherAssessmentBody } from './weatherAssessment';
import { weatherFixtureScript } from '../runtime/weatherApi';
import type { Files } from '../contracts';
import { createSrcdoc, validateFiles } from '../runtime';

const COMPILE_TIMEOUT_MS = 12_000;
const GRADE_TIMEOUT_MS = 5_000;
const MAX_MESSAGE_LENGTH = 4_000;

type CompiledDocument = { html: string; head: string };
type WorkerResponse = { id: number; ok: boolean; html?: string; head?: string; error?: string };
type Pending = { resolve: (document: CompiledDocument) => void; reject: (error: Error) => void; timer: number };
type ActiveGrade = { runId: string; nonce: string; assessmentId: string; frame: HTMLIFrameElement; stopped: boolean; resolve: (value: GradeResult) => void; reject: (error: Error) => void; timer: number };
type FrameResult = GradeResult & { storageValue?: string | null };

export interface GradeCheck { id: string; passed: boolean; message: string }
export interface GradeResult { assessmentId: string; passed: boolean; checks: GradeCheck[]; message: string }
export interface GradeEvent { type: 'grade-status' | 'grade-result' | 'grade-error'; message: string; result?: GradeResult }
export interface ChallengeGrader { grade(files: Files, assessmentId: string): Promise<GradeResult>; cancel(): void; dispose(): void }

function token(): string {
  const values = new Uint32Array(4); globalThis.crypto?.getRandomValues?.(values);
  return Array.from(values, item => item.toString(36)).join('') || `${Date.now()}-${Math.random()}`;
}

function assessmentScript(assessmentId: string, runId: string, nonce: string): string {
  const shared = `
const wait = () => new Promise(resolve => setTimeout(resolve, 0));
const form = document.querySelector('#todo-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const count = document.querySelector('#task-count');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const submit = async (text) => { input.value = text; const event = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(event); await wait(); assert(event.defaultPrevented, 'Prevent the form from navigating on submit.'); return event; };
const items = () => Array.from(list.querySelectorAll('li'));
const label = (item) => item.querySelector('.task-label');
const checkbox = (item) => item.querySelector('input[type="checkbox"]');
const remove = (item) => item.querySelector('button.delete-task');
const contract = () => { assert(form && input && list && count, 'Use form#todo-form, input#task-input, ul#task-list, and p#task-count.'); };
const addChecks = async () => { contract(); assert(items().length === 0, 'Start with an empty task list.'); assert(/0\\s+of\\s+0\\s+complete/i.test(count.textContent), 'Show an initial count such as “0 of 0 complete”.'); await submit('  <strong>Plan</strong>  '); assert(items().length === 1, 'Submitting a task should add one list item.'); assert(label(items()[0]).textContent === '<strong>Plan</strong>', 'Trim and render task text literally, not as HTML.'); assert(input.value === '', 'Clear the input after a successful add.'); await submit('   '); assert(items().length === 1, 'Do not add blank tasks.'); await submit('Ship'); assert(items().length === 2, 'Support more than one task.'); };
const stateChecks = async () => { await addChecks(); assert(checkbox(items()[0]) && remove(items()[0]) && label(items()[0]), 'Every task needs a label, checkbox, and delete button.'); checkbox(items()[0]).checked = true; checkbox(items()[0]).dispatchEvent(new Event('change', { bubbles: true })); await wait(); assert(checkbox(items()[0]).checked, 'Toggling a task should update that task.'); assert(/1\\s+of\\s+2\\s+complete/i.test(count.textContent), 'Show a count such as “1 of 2 complete”.'); checkbox(items()[0]).checked = false; checkbox(items()[0]).dispatchEvent(new Event('change', { bubbles: true })); await wait(); assert(!checkbox(items()[0]).checked && /0\\s+of\\s+2\\s+complete/i.test(count.textContent), 'Toggling again should keep the same task and update the count.'); checkbox(items()[0]).checked = true; checkbox(items()[0]).dispatchEvent(new Event('change', { bubbles: true })); await wait(); remove(items()[1]).dispatchEvent(new Event('click', { bubbles: true })); await wait(); assert(items().length === 1 && label(items()[0]).textContent === '<strong>Plan</strong>', 'Deleting removes only the chosen task after rerendering.'); remove(items()[0]).dispatchEvent(new Event('click', { bubbles: true })); await wait(); assert(items().length === 0 && /0\\s+of\\s+0\\s+complete/i.test(count.textContent), 'Deleting the final task restores the empty count.'); };
const duplicateChecks = async () => { contract(); await submit('Same'); await submit('Same'); assert(items().length === 2, 'Keep duplicate task labels as independent tasks.'); checkbox(items()[1]).checked = true; checkbox(items()[1]).dispatchEvent(new Event('change', { bubbles: true })); await wait(); assert(!checkbox(items()[0]).checked && checkbox(items()[1]).checked, 'Toggle the selected duplicate only.'); remove(items()[0]).dispatchEvent(new Event('click', { bubbles: true })); await wait(); assert(items().length === 1 && checkbox(items()[0]).checked, 'Delete the selected duplicate only.'); };
`;
  const phase3 = assessmentId.replace(/-(guided-[12]|apply|debug|combine)$/, '');
  const check = (body: string) => body;
  const phase3Bodies: Record<string, string> = {
    'todo-scope-and-user-flows': check(`const summary = document.querySelector('#flow-summary'); const flows = Array.from(document.querySelectorAll('#flow-list li')).map(item => item.textContent || ''); assert(summary && /add/i.test(summary.textContent) && /complete/i.test(summary.textContent) && /delete/i.test(summary.textContent) && /empty/i.test(summary.textContent) && /invalid/i.test(summary.textContent) && /filter/i.test(summary.textContent), 'Describe add, complete, delete, empty, invalid-input, and filter states in #flow-summary.'); assert(flows.some(text => /add|trim/i.test(text)) && flows.some(text => /complete|id/i.test(text)) && flows.some(text => /delete|id/i.test(text)), 'Give separate add, complete-by-id, and delete-by-id examples in #flow-list.');`),
    'todo-web-stack-and-file-plan': check(`const rows = Array.from(document.querySelectorAll('#file-plan li')).map(item => item.textContent || ''); const row = (name) => rows.find(text => text.includes(name)) || ''; for (const file of ['index.html', 'styles.css', 'model.js', 'main.js']) assert(row(file), '#file-plan must name ' + file + ' in its own entry.'); assert(/semantic|structure/i.test(row('index.html')), 'The index.html entry must own semantic structure.'); assert(/style|visual/i.test(row('styles.css')), 'The styles.css entry must own presentation.'); assert(/task|data|state/i.test(row('model.js')) && !/visual|style/i.test(row('model.js')), 'The model.js entry must own task data, not visual styles.'); assert(/dom|event|render/i.test(row('main.js')), 'The main.js entry must own DOM events or rendering.');`),
    'todo-setup-and-static-layout': check(`contract(); const taskLabel = document.querySelector('label[for="task-input"]'); assert(taskLabel, 'Connect the visible New task label to input#task-input with for="task-input".'); const event = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(event); await wait(); assert(event.defaultPrevented, 'Prevent the static form from navigating.'); assert(/0\\s+of\\s+0\\s+complete/i.test(count.textContent), 'Show the initial 0 of 0 complete count.'); assert(document.querySelector('#input-error') && document.querySelector('#empty-state'), 'Include #input-error and #empty-state for later feedback.');`),
    'todo-filter-empty-and-input-errors': check(`contract(); const error = document.querySelector('#input-error'); const empty = document.querySelector('#empty-state'); assert(error && empty && document.querySelectorAll('[data-filter]').length >= 3, 'Add filter controls, #input-error, and #empty-state.'); await submit('   '); assert(items().length === 0 && /enter|task|required/i.test(error.textContent), 'Whitespace input must show an error without adding a row.'); await submit('One'); assert(!error.textContent, 'A valid add must clear the earlier input error.'); await submit('Two'); checkbox(items()[0]).checked = true; checkbox(items()[0]).dispatchEvent(new Event('change', { bubbles: true })); await wait(); document.querySelector('[data-filter="active"]').click(); await wait(); assert(items().length === 1 && label(items()[0]).textContent === 'Two', 'Active filter must keep only incomplete tasks visible.'); document.querySelector('[data-filter="completed"]').click(); await wait(); assert(items().length === 1 && label(items()[0]).textContent === 'One', 'Completed filter must keep only complete tasks visible.'); remove(items()[0]).click(); await wait(); assert(items().length === 0 && /no tasks match/i.test(empty.textContent), 'A nonempty source with no completed rows needs a filtered-empty message.'); document.querySelector('[data-filter="all"]').click(); await wait(); assert(items().length === 1 && label(items()[0]).textContent === 'Two' && /0\\s+of\\s+1\\s+complete/i.test(count.textContent), 'Deleting a filtered task must preserve hidden tasks and update count.'); remove(items()[0]).click(); await wait(); assert(items().length === 0 && /no tasks yet/i.test(empty.textContent), 'Deleting the final source task needs the empty-source message.');`),
    'todo-storage-and-recovery': check(`contract(); const status = document.querySelector('#storage-status'); const mode = globalThis.__gradeStorage.mode; assert(status, 'Include #storage-status for storage recovery feedback.'); await wait(); await wait(); await wait(); if (/missing|malformed|invalid-shape|duplicate-id|read-failure/.test(mode)) { assert(items().length === 0 && /unavailable|empty|start|saved/i.test(status.textContent), 'Missing, malformed, duplicate-id, or unreadable saved data must recover to an empty usable list with a status message.'); await submit('Recovered'); assert(items().length === 1, 'Recovery must leave the form usable for a new task.'); } else if (mode === 'save-failure') { assert(items().length === 1 && label(items()[0]).textContent === 'Restored', 'Restore valid data before testing a failed save.'); await submit('Still visible'); await wait(); await wait(); assert(items().length === 2 && /could not save|still visible/i.test(status.textContent), 'A failed write must retain the in-memory task list and report recovery.'); } else if (mode === 'duplicate-labels') { assert(items().length === 2, 'Restore both duplicate-label records.'); const before = items(); checkbox(before[1]).checked = true; checkbox(before[1]).dispatchEvent(new Event('change', { bubbles: true })); await wait(); await wait(); const after = items(); assert(!checkbox(after[0]).checked && checkbox(after[1]).checked, 'Restored duplicate labels must toggle independently by id.'); assert(new Set(JSON.parse(globalThis.__gradeStorage.value).map(task => task.id)).size === 2, 'Restored task ids must remain unique after saving.'); } else if (mode === 'reload') { assert(items().length === 2 && items().some(item => label(item).textContent === 'Persisted'), 'A fresh frame must restore the saved task snapshot after reload.'); } else { assert(items().length === 1 && label(items()[0]).textContent === 'Restored', 'Restore a valid saved task when the app starts.'); await submit('Persisted'); await wait(); await wait(); assert(globalThis.__gradeStorage.value && globalThis.__gradeStorage.value.includes('Persisted') && new Set(JSON.parse(globalThis.__gradeStorage.value).map(task => task.id)).size === 2, 'Persist a successful add with trainingStorage.setItem(\\'tasks\\', ...).'); } assert(typeof globalThis.__gradeStorage.getItem === 'function' && typeof globalThis.__gradeStorage.setItem === 'function' && typeof globalThis.__gradeStorage.removeItem === 'function', 'Use the asynchronous trainingStorage adapter methods.');`),
    'todo-testing-and-export': check(`const run = document.querySelector('#run-smoke-test'); const results = document.querySelector('#test-results'); const prepare = document.querySelector('#prepare-export'); const exported = document.querySelector('#export-status'); assert(run && results && prepare && exported, 'Provide smoke-test and export controls with their status regions.'); await wait(); await wait(); const before = items().length; await submit('Grader verification'); assert(items().length === before + 1 && label(items().at(-1)).textContent === 'Grader verification', 'The app must really add a task before its smoke result can earn credit.'); run.click(); await wait(); await wait(); await wait(); assert(/pass/i.test(results.textContent), 'Running the smoke test must report a passing visible result.'); prepare.click(); await wait(); assert(/index\\.html/i.test(exported.textContent) && /styles\\.css/i.test(exported.textContent) && /model\\.js/i.test(exported.textContent) && /main\\.js/i.test(exported.textContent) && /server|serve/i.test(exported.textContent), 'Export guidance must name all four files and a local static server.');`),
  };
  const firstIncrement = assessmentId.endsWith('-guided-1') || assessmentId.endsWith('-apply');
  const filterBasic = `contract(); const error = document.querySelector('#input-error'); assert(error && document.querySelector('[data-filter="active"]'), 'Add #input-error and an Active filter control.'); await submit('   '); assert(items().length === 0 && /enter|task|required/i.test(error.textContent), 'Whitespace input must show an error without adding a row.'); await submit('One'); await submit('Two'); checkbox(items()[0]).checked = true; checkbox(items()[0]).dispatchEvent(new Event('change', { bubbles: true })); await wait(); document.querySelector('[data-filter="active"]').click(); await wait(); assert(items().length === 1 && label(items()[0]).textContent === 'Two', 'Active filter must show only incomplete tasks.');`;

  const scopeBasic = `const summary = document.querySelector('#flow-summary'); const rows = Array.from(document.querySelectorAll('#flow-list li')).map(row => row.textContent || ''); assert(summary && /add/i.test(summary.textContent) && /complete/i.test(summary.textContent) && /delete/i.test(summary.textContent), 'Describe add, complete and delete in #flow-summary.'); assert(rows.length >= 3 && rows.some(text => /add/i.test(text)) && rows.some(text => /complete/i.test(text)) && rows.some(text => /delete/i.test(text)), 'Give separate add, complete and delete flow entries.');`;
  const stackBasic = `const rows = Array.from(document.querySelectorAll('#file-plan li')).map(row => row.textContent || ''); for (const name of ['index.html', 'styles.css', 'model.js', 'main.js']) assert(rows.some(text => text.includes(name)), 'Include a file-plan entry for ' + name);`;
  const layoutBasic = `contract(); const event = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(event); await wait(); assert(event.defaultPrevented, 'Prevent form navigation on submit.'); assert(/0\\s+of\\s+0\\s+complete/i.test(count.textContent), 'Show the initial 0 of 0 complete count.');`;
  const layoutAccess = `assert(document.querySelector('#input-error').getAttribute('role') === 'alert', 'Use role=alert on the input error.'); for (const node of [count, document.querySelector('#empty-state')]) assert(node.getAttribute('aria-live') === 'polite', 'Use aria-live=polite on count and empty feedback.'); for (const filter of ['all','active','completed']) { const button = document.querySelector('[data-filter="' + filter + '"]'); assert(button && button.getAttribute('type') === 'button', 'Each filter needs a non-submit button.'); }`;
  const smokeChecks = `contract(); const run = document.querySelector('#run-smoke-test'); const results = document.querySelector('#test-results'); assert(run && results, 'Provide #run-smoke-test and #test-results.'); await wait(); await wait(); await submit('Grader verification'); const snapshot = globalThis.__gradeStorage.value; const beforeRows = items().map(row => [label(row).textContent, checkbox(row).checked]); input.value = 'Keep my input'; let submits = 0, changes = 0; form.addEventListener('submit', () => submits++); list.addEventListener('change', () => changes++); results.textContent = ''; run.click(); for (let n = 0; n < 150 && !/passed|failed/i.test(results.textContent); n++) await wait(); assert(/passed/i.test(results.textContent), 'Run actual smoke assertions and report their result.'); assert(submits > 0 && changes > 0, 'A smoke test must exercise real submit and checkbox behavior, not only print passed.'); assert(JSON.stringify(items().map(row => [label(row).textContent, checkbox(row).checked])) === JSON.stringify(beforeRows) && globalThis.__gradeStorage.value === snapshot && input.value === 'Keep my input', 'Smoke cleanup must restore the prior visible tasks, saved data and input.'); assert(!input.disabled && items().every(row => !checkbox(row).disabled && !remove(row).disabled), 'Smoke cleanup must leave current task controls usable.');`;
  const exportChecks = `const prepare = document.querySelector('#prepare-export'), exported = document.querySelector('#export-status'); assert(prepare && exported, 'Add export guidance controls.'); prepare.click(); await wait(); assert(['index.html','styles.css','model.js','main.js'].every(name => exported.textContent.includes(name)) && /server|serve/i.test(exported.textContent), 'Export guidance must name the four files and a static server.');`;
  const weather = weatherAssessmentBody(assessmentId); const react = reactAssessmentBody(assessmentId); const ecommerce = ecommerceAssessmentBody(assessmentId);
  let body: string;
  if (ecommerce !== undefined) body = ecommerce; else if (react !== undefined) body = react; else if (weather !== undefined) body = weather;
  else if (assessmentId === 'todo-dom-guided-add' || assessmentId === 'todo-dom-apply') body = 'await addChecks();';
  else if (assessmentId === 'todo-dom-guided-render' || assessmentId === 'todo-dom-debug' || assessmentId === 'todo-dom-combine') body = 'await stateChecks(); await duplicateChecks();';
  else if (!phase3Bodies[phase3]) body = `throw new Error('Unknown lesson assessment: ${assessmentId}');`;
  else if (phase3 === 'todo-filter-empty-and-input-errors') body = firstIncrement ? filterBasic : `${phase3Bodies[phase3]} ${assessmentId.endsWith('-combine') ? 'await duplicateChecks();' : ''}`;
  else if (phase3 === 'todo-setup-and-static-layout') body = firstIncrement ? layoutBasic : `${phase3Bodies[phase3]} ${layoutAccess} await stateChecks(); await duplicateChecks();`;
  else if (phase3 === 'todo-scope-and-user-flows' || phase3 === 'todo-web-stack-and-file-plan') body = firstIncrement ? phase3 === 'todo-scope-and-user-flows' ? scopeBasic : stackBasic : `${phase3Bodies[phase3]} await stateChecks(); await duplicateChecks();`;
  else if (phase3 === 'todo-testing-and-export') body = `${smokeChecks} ${firstIncrement ? '' : exportChecks}`;
  else body = phase3Bodies[phase3];
  return `<script>\n(() => {\nconst send = (payload) => parent.postMessage({ type: 'lesson-grade', runId: ${JSON.stringify(runId)}, nonce: ${JSON.stringify(nonce)}, ...payload }, '*');\n(async () => { const checks = []; try { ${weather === undefined && react === undefined && ecommerce === undefined ? shared : ''}\n${body}\nchecks.push({ id: ${JSON.stringify(assessmentId)}, passed: true, message: 'All required behavior checks passed.' }); send({ kind: 'result', assessmentId: ${JSON.stringify(assessmentId)}, passed: true, checks, storageValue: globalThis.__gradeStorage ? globalThis.__gradeStorage.value : undefined }); } catch (error) { checks.push({ id: ${JSON.stringify(assessmentId)}, passed: false, message: error instanceof Error ? error.message : String(error) }); send({ kind: 'result', assessmentId: ${JSON.stringify(assessmentId)}, passed: false, checks, storageValue: globalThis.__gradeStorage ? globalThis.__gradeStorage.value : undefined }); } })();\n})();\n</script>`;
}

export function isAcceptedGradeMessage(event: MessageEvent, active: Pick<ActiveGrade, 'runId' | 'nonce' | 'assessmentId' | 'frame'> | undefined): event is MessageEvent<{ type: 'lesson-grade'; runId: string; nonce: string; kind: 'result'; assessmentId: string; passed: boolean; checks: GradeCheck[]; storageValue?: string | null }> {
  const data = event.data;
  return Boolean(active && event.source === active.frame.contentWindow && data && typeof data === 'object' && !Array.isArray(data) && data.type === 'lesson-grade' && data.runId === active.runId && data.nonce === active.nonce && data.kind === 'result' && data.assessmentId === active.assessmentId && typeof data.passed === 'boolean' && (data.storageValue === undefined || data.storageValue === null || typeof data.storageValue === 'string' && data.storageValue.length <= 16_384) && Array.isArray(data.checks) && data.checks.length > 0 && data.checks.length <= 20 && data.checks.every((check: unknown) => check && typeof check === 'object' && typeof (check as GradeCheck).id === 'string' && (check as GradeCheck).id.length <= 200 && typeof (check as GradeCheck).passed === 'boolean' && typeof (check as GradeCheck).message === 'string' && (check as GradeCheck).message.length <= MAX_MESSAGE_LENGTH) && data.passed === data.checks.every((check: GradeCheck) => check.passed));
}

/** Compiles with the normal worker, then runs only authored DOM checks in a fresh opaque iframe. */
export function createChallengeGrader(container: HTMLElement, onEvent: (event: GradeEvent) => void): ChallengeGrader {
  let worker: Worker | undefined;
  let sequence = 0;
  let generation = 0;
  let active: ActiveGrade | undefined;
  const pending = new Map<number, Pending>();
  const report = (type: GradeEvent['type'], message: string, result?: GradeResult) => onEvent({ type, message: message.slice(0, MAX_MESSAGE_LENGTH), ...(result ? { result } : {}) });
  const clearWorker = (reason = new Error('Challenge grading was cancelled.')) => {
    worker?.terminate(); worker = undefined;
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(reason); }
    pending.clear();
  };
  const ensureWorker = () => {
    if (worker) return worker;
    worker = new Worker(new URL('../runtime/compiler.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data; const pendingItem = pending.get(response?.id); if (!pendingItem) return;
      pending.delete(response.id); clearTimeout(pendingItem.timer);
      response.ok && typeof response.html === 'string' ? pendingItem.resolve({ html: response.html, head: typeof response.head === 'string' ? response.head : '' }) : pendingItem.reject(new Error(response.error || 'Challenge compilation failed.'));
    });
    worker.addEventListener('error', () => clearWorker(new Error('The challenge compiler stopped unexpectedly.')));
    return worker;
  };
  const compile = (files: Files) => new Promise<CompiledDocument>((resolve, reject) => {
    const id = ++sequence; const timer = window.setTimeout(() => clearWorker(new Error('Challenge compilation timed out and was restarted.')), COMPILE_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer }); ensureWorker().postMessage({ type: 'compile', id, files });
  });
  const cancel = () => {
    generation += 1;
    if (active) { const running = active; active = undefined; running.stopped = true; clearTimeout(running.timer); running.frame.remove(); running.reject(new Error('Challenge grading was cancelled.')); }
    clearWorker();
  };
  const onMessage = (event: MessageEvent) => {
    if (!isAcceptedGradeMessage(event, active)) return;
    const running = active!; active = undefined; clearTimeout(running.timer); running.frame.remove();
    const result: FrameResult = { assessmentId: event.data.assessmentId, passed: event.data.passed, checks: event.data.checks, message: event.data.passed ? 'Challenge passed.' : event.data.checks.find(check => !check.passed)?.message || 'Challenge did not pass.', storageValue: event.data.storageValue };
    running.resolve(result);
  };
  window.addEventListener('message', onMessage);
  const storageAdapter = (mode: string, seed: string | null, failWrites = false) => { const escapedSeed = JSON.stringify(seed).replace(/</g, '\\u003c'); return `<script>(() => { let value = ${escapedSeed}; const state = { mode: ${JSON.stringify(mode)}, failWrites: ${JSON.stringify(failWrites)}, get value() { return value; } }; const adapter = { async getItem(key) { if (key !== 'tasks') throw new Error('unexpected key'); if (state.mode === 'read-failure') throw new Error('seeded read failure'); return value; }, async setItem(key, next) { if (key !== 'tasks') throw new Error('unexpected key'); if (state.failWrites) throw new Error('seeded write failure'); value = next; }, async removeItem(key) { if (key !== 'tasks') throw new Error('unexpected key'); if (state.failWrites) throw new Error('seeded write failure'); value = null; } }; Object.assign(state, adapter); Object.defineProperty(globalThis, 'trainingStorage', { value: adapter, configurable: true }); Object.defineProperty(globalThis, '__gradeStorage', { value: state, configurable: true }); })();</script>`; };
  // Isolated educational fixture; never reads or mutates the host's saved cart.
  const ecommerceStorageAdapter = (mode: string, seed: string | null, failWrites = false) => `<script>(() => {
    let value = ${JSON.stringify(seed).replace(/</g, '\\u003c')}, writes = 0;
    const events = []; const state = { mode: ${JSON.stringify(mode)}, failWrites: ${JSON.stringify(failWrites)}, get value() { return value; }, events };
    const keyCheck = key => { if (key !== 'cart') throw new Error('Unexpected ecommerce storage key'); };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const adapter = {
      async getItem(key) { keyCheck(key); events.push('get'); await wait(8); if (state.mode === 'read-failure') throw new Error('Seeded cart read failure'); return value; },
      async setItem(key, next) { keyCheck(key); events.push('set'); const write = ++writes; await wait(write % 2 ? 12 : 1); if (state.failWrites) throw new Error('Seeded cart write failure'); if (typeof next !== 'string' || next.length > 16384) throw new Error('Invalid cart snapshot'); value = next; },
      async removeItem(key) { keyCheck(key); events.push('remove'); if (state.failWrites) throw new Error('Seeded cart write failure'); value = null; }
    };
    Object.assign(state, adapter); Object.defineProperty(globalThis, 'trainingStorage', {value:adapter, configurable:true}); Object.defineProperty(globalThis, '__gradeStorage', {value:state, configurable:true});
  })();</script>`;
  const runFrame = (document: CompiledDocument, assessmentId: string, epoch: number, mode?: string, seed?: string | null, failWrites?: boolean) => new Promise<FrameResult>((resolve, reject) => {
    if (epoch !== generation) { reject(new Error('Challenge grading was cancelled.')); return; }
    const runId = token(); const nonce = token(); const frame = window.document.createElement('iframe');
    frame.title = 'Challenge grader'; frame.setAttribute('sandbox', 'allow-scripts allow-forms'); frame.setAttribute('referrerpolicy', 'no-referrer');
    const needsStorage = reactAssessmentNeedsStorage(assessmentId) || assessmentId.startsWith('todo-storage-and-recovery') || assessmentId.startsWith('todo-testing-and-export');
    const cartStorage = ecommerceAssessmentNeedsStorage(assessmentId) ? ecommerceStorageAdapter(mode || 'valid', seed === undefined ? ecommerceStorageScenarios[0].seed : seed, Boolean(failWrites)) : '';
    frame.srcdoc = createSrcdoc(`${assessmentId.startsWith('weather-') ? weatherFixtureScript() : ''}${cartStorage}${needsStorage ? storageAdapter(mode || 'valid', seed === undefined ? (reactAssessmentNeedsStorage(assessmentId) ? reactStorageScenarios[0].seed : JSON.stringify([{ id: 1, text: 'Restored', done: false }])) : seed, Boolean(failWrites)) : ''}${document.html}${assessmentScript(assessmentId, runId, nonce)}`, { id: runId, nonce, stopped: false }, document.head);
    const timer = window.setTimeout(() => { if (active?.runId !== runId) return; active = undefined; frame.remove(); const error = new Error('Challenge checks timed out. Fix the running code and try again.'); report('grade-error', error.message); reject(error); }, GRADE_TIMEOUT_MS);
    active = { runId, nonce, assessmentId, frame, stopped: false, resolve, reject, timer }; container.replaceChildren(frame);
  });
  const finished = (result: FrameResult): GradeResult => ({ assessmentId: result.assessmentId, passed: result.passed, checks: result.checks, message: result.message });
  return {
    async grade(input, assessmentId) {
      cancel(); const files = validateFiles(input); report('grade-status', 'Checking challenge behavior…');
      const epoch = generation;
      const document = await compile(files);
      if (epoch !== generation) throw new Error('Challenge grading was cancelled.');
      const storageLesson = assessmentId.startsWith('todo-storage-and-recovery');
      const fullStorage = assessmentId.endsWith('-guided-2') || assessmentId.endsWith('-debug') || assessmentId.endsWith('-combine');
      let result = await runFrame(document, assessmentId, epoch, 'valid');
      if (result.passed && storageLesson && fullStorage) {
        const restored = result.storageValue;
        if (typeof restored !== 'string' || !restored.includes('Persisted')) result = { ...result, passed: false, checks: [{ id: assessmentId, passed: false, message: 'A valid saved snapshot was not available for reload verification.' }], message: 'A valid saved snapshot was not available for reload verification.' };
        else {
          const seeds: Array<[string, string | null, boolean?]> = [
            ['reload', restored], ['missing', null], ['malformed', '{not json'], ['invalid-shape', JSON.stringify({ tasks: [] })], ['duplicate-id', JSON.stringify([{ id: 7, text: 'One', done: false }, { id: 7, text: 'Two', done: false }])], ['read-failure', JSON.stringify([{ id: 7, text: 'Ignored', done: false }])], ['save-failure', JSON.stringify([{ id: 7, text: 'Restored', done: false }]), true], ['duplicate-labels', JSON.stringify([{ id: 7, text: 'Same', done: false }, { id: 8, text: 'Same', done: false }])]
          ];
          for (const [mode, seed, failWrites] of seeds) { result = await runFrame(document, assessmentId, epoch, mode, seed, failWrites); if (!result.passed) break; }
        }
      }
      if (result.passed && assessmentId.startsWith('react-effects-persistence-and-errors') && fullStorage) {
        const saved = result.storageValue;
        for (const scenario of reactStorageScenarios.slice(1)) {
          result = await runFrame(document, assessmentId, epoch, scenario.mode, scenario.mode === 'reload' ? saved : scenario.seed, scenario.failWrites);
          if (!result.passed) break;
        }
      }
      if (result.passed && assessmentId.startsWith('shop-cart-quantity-and-persistence') && fullStorage) {
        const saved = result.storageValue;
        for (const scenario of ecommerceStorageScenarios.slice(1)) {
          result = await runFrame(document, assessmentId, epoch, scenario.mode, scenario.mode === 'reload' ? saved : scenario.seed, scenario.failWrites);
          if (!result.passed) break;
        }
      }
      const finalResult = finished(result); report('grade-result', finalResult.message, finalResult); return finalResult;
    },
    cancel,
    dispose() { cancel(); window.removeEventListener('message', onMessage); },
  };
}

