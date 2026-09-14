import type { Files } from '../contracts';

const css = String.raw`
:root { font-family: system-ui, sans-serif; color: #182230; background: #f4f7fb; }
* { box-sizing: border-box; } body { margin: 0; } main { max-width: 46rem; margin: 2rem auto; padding: 1.25rem; background: white; border-radius: .75rem; }
form, .filters, .sync-controls { display: flex; flex-wrap: wrap; gap: .5rem; align-items: end; } label { display: grid; gap: .25rem; } input, button { font: inherit; padding: .5rem; }
ul { list-style: none; padding: 0; } li { display: flex; align-items: center; gap: .5rem; padding: .4rem 0; } .task-label { flex: 1; overflow-wrap: anywhere; } .done { text-decoration: line-through; color: #596579; }
.hint { color: #526176; } [role="alert"] { color: #a32121; } #empty-state, #task-count, #save-status, #sync-status, #react-smoke-status { min-height: 1.35em; }
`;

const index = String.raw`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>React task dashboard</title><link rel="stylesheet" href="./styles.css"></head><body><div id="root"></div><script type="module" src="./main.jsx"></script></body></html>`;
const main = String.raw`import { createRoot } from 'react-dom/client';
import App from './App.jsx';
createRoot(document.querySelector('#root')).render(<App />);`;
const setupIndex = index.replace('<div id="root"></div>', '<div id="root"></div><section id="stack-plan" aria-label="Stack tradeoffs"><p>Vanilla JavaScript uses browser DOM APIs with little setup. React with Vite uses JSX, components, dependencies, and a bundling entry point. A full-stack framework adds server rendering and routing when the product needs them.</p></section>');

const scopeHtml = String.raw`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dashboard component plan</title><link rel="stylesheet" href="./styles.css"></head><body><main><h1>React task dashboard plan</h1><p id="dashboard-scope">A small accessible dashboard adds, completes, deletes, and filters tasks. It has no account, server, or package install inside this course preview.</p><section aria-labelledby="component-map-title"><h2 id="component-map-title">Component map</h2><ul id="component-map"><li>App owns tasks, the selected filter, and shared status.</li><li>TaskForm receives onAdd and reports draft input.</li><li>TaskList receives visible tasks and callbacks.</li><li>TaskRow receives one task plus onToggle and onDelete.</li></ul></section><p id="stack-plan">Vanilla JavaScript is smallest; Vite React transforms JSX for components; a full-stack framework adds server conventions this local dashboard does not need.</p></main></body></html>`;
const scopeBasic = scopeHtml.replace('App owns tasks, the selected filter, and shared status.', 'App coordinates the dashboard.').replace('TaskRow receives one task plus onToggle and onDelete.', 'TaskRow displays one task.').replace('<p id="stack-plan">Vanilla JavaScript is smallest; Vite React transforms JSX for components; a full-stack framework adds server conventions this local dashboard does not need.</p>', '');

const layoutApp = String.raw`const tasks = [{ id: 'plan', text: 'Plan components', done: false }, { id: 'access', text: 'Check accessible labels', done: true }];
export default function App() {
  return <main>
    <h1>Task dashboard</h1>
    <p id="task-count" role="status" aria-live="polite">0 of {tasks.length} complete</p>
    <form onSubmit={event => event.preventDefault()}><label htmlFor="task-input">New task<input id="task-input" defaultValue="" /></label><button>Add task</button></form><p id="input-error" role="alert"></p>
    <div className="filters" aria-label="Task filters"><button type="button" aria-pressed="true">All</button><button type="button" aria-pressed="false">Active</button><button type="button" aria-pressed="false">Completed</button></div>
    <TaskList tasks={tasks} onToggle={() => {}} onDelete={() => {}} />
    <p id="empty-state" aria-live="polite"></p>
  </main>;
}
export function TaskForm({ draft, onDraftChange, onAdd, disabled = false }) { return <form onSubmit={event => { event.preventDefault(); onAdd(); }}><label htmlFor="task-input">New task<input id="task-input" disabled={disabled} value={draft} onChange={event => onDraftChange(event.target.value)} /></label><button disabled={disabled}>Add task</button></form>; }
export function TaskList({ tasks, onToggle, onDelete }) { return <ul id="task-list">{tasks.map(task => <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />)}</ul>; }
export function TaskRow({ task, onToggle, onDelete }) { return <li><label className={task.done ? 'task-label done' : 'task-label'}><input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} /> {task.text}</label><button type="button" onClick={() => onDelete(task.id)}>Delete {task.text}</button></li>; }`;

const stateApp = String.raw`import { useState } from 'react';
import { TaskForm, TaskList } from './components.jsx';

const initialTasks = [{ id: 1, text: 'Plan components', done: false }, { id: 2, text: 'Check accessible states', done: true }];
export default function App() {
  const [tasks, setTasks] = useState(initialTasks); const [draft, setDraft] = useState(''); const [filter, setFilter] = useState('all'); const [error, setError] = useState('');
  const shown = tasks.filter(task => filter === 'active' ? !task.done : filter === 'completed' ? task.done : true); const complete = tasks.filter(task => task.done).length;
  function addTask() { const text = draft.trim(); if (!text) { setError('Enter a task before adding it.'); return; } const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); setTasks(previous => [...previous, { id, text, done: false }]); setDraft(''); setError(''); }
  function toggleTask(id) { setTasks(previous => previous.map(task => task.id === id ? { ...task, done: !task.done } : task)); }
  function deleteTask(id) { setTasks(previous => previous.filter(task => task.id !== id)); }
  return <main><h1>Task dashboard</h1><p id="task-count" role="status" aria-live="polite">{complete} of {tasks.length} complete</p><TaskForm draft={draft} onDraftChange={setDraft} onAdd={addTask} /><p id="input-error" role="alert">{error}</p><div className="filters" aria-label="Task filters">{['all', 'active', 'completed'].map(name => <button key={name} type="button" data-filter={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</div><TaskList tasks={shown} onToggle={toggleTask} onDelete={deleteTask} /><p id="empty-state" aria-live="polite">{shown.length ? '' : tasks.length ? 'No tasks match this filter.' : 'No tasks yet.'}</p></main>;
}`;

const components = String.raw`export function TaskForm({ draft, onDraftChange, onAdd, disabled = false }) { return <form onSubmit={event => { event.preventDefault(); onAdd(); }}><label htmlFor="task-input">New task<input id="task-input" disabled={disabled} value={draft} onChange={event => onDraftChange(event.target.value)} /></label><button disabled={disabled}>Add task</button></form>; }
export function TaskList({ tasks, onToggle, onDelete }) { return <ul id="task-list">{tasks.map(task => <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />)}</ul>; }
export function TaskRow({ task, onToggle, onDelete }) { return <li><label className={task.done ? 'task-label done' : 'task-label'}><input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} /> {task.text}</label><button type="button" onClick={() => onDelete(task.id)}>Delete {task.text}</button></li>; }`;

/** This local learner module is deterministic, supports effect cancellation, and has no network dependency. */
export const taskApi = String.raw`const delay = name => ['Slow', 'SlowError', 'IgnoreSlow'].includes(name) ? 80 : 5;
const values = { Fast: [{ id: 'fast', text: 'Fast response', done: false }], Slow: [{ id: 'slow', text: 'Slow response', done: false }], IgnoreSlow: [{ id: 'ignored-slow', text: 'Ignored slow response', done: false }], Empty: null };
const events = () => globalThis.__taskApiEvents || (globalThis.__taskApiEvents = []);
export function load(name, signal) { events().push({ type: 'start', name }); return new Promise((resolve, reject) => { const timer = setTimeout(() => { if (name === 'Error' || name === 'SlowError') { events().push({ type: 'error', name }); reject(new Error('Task service is unavailable.')); return; } events().push({ type: 'resolve', name }); resolve(Object.hasOwn(values, name) ? values[name] : values.Fast); }, delay(name)); if (name !== 'IgnoreSlow') signal?.addEventListener('abort', () => { clearTimeout(timer); events().push({ type: 'abort', name }); reject(Object.assign(new Error('Request aborted.'), { name: 'AbortError' })); }, { once: true }); }); }`;

export const taskStorage = String.raw`const KEY = 'tasks'; const VERSION = 2; const events = () => globalThis.__taskStorageEvents || (globalThis.__taskStorageEvents = []);
function validTasks(value) { return Array.isArray(value) && value.every(task => task && (typeof task.id === 'string' && task.id || Number.isSafeInteger(task.id) && task.id >= 0) && typeof task.text === 'string' && task.text.trim() && typeof task.done === 'boolean') && new Set(value.map(task => String(task.id))).size === value.length; }
export function parseSnapshot(raw) { if (raw === null) return { version: VERSION, tasks: [] }; const parsed = JSON.parse(raw); const snapshot = Array.isArray(parsed) ? { version: VERSION, tasks: parsed } : parsed; if (!snapshot || snapshot.version !== VERSION || !validTasks(snapshot.tasks)) throw new Error('Saved tasks are unavailable. Start with an empty dashboard.'); return { version: VERSION, tasks: snapshot.tasks.map(task => ({ ...task })) }; }
export async function restoreTasks() { events().push('get'); return parseSnapshot(await trainingStorage.getItem(KEY)); }
export async function saveTasks(tasks) { events().push('set'); await trainingStorage.setItem(KEY, JSON.stringify({ version: VERSION, tasks })); }`;

const effectsApp = String.raw`import { useEffect, useRef, useState } from 'react';
import { TaskForm, TaskList } from './components.jsx';
import { load } from './taskApi.js';
import { restoreTasks, saveTasks } from './taskStorage.js';
export default function App() {
  const [tasks, setTasks] = useState([]); const [draft, setDraft] = useState(''); const [filter, setFilter] = useState('all'); const [error, setError] = useState(''); const [ready, setReady] = useState(false); const [saveStatus, setSaveStatus] = useState('Loading saved tasks…'); const [requestName, setRequestName] = useState(''); const [syncStatus, setSyncStatus] = useState('Choose a deterministic sync fixture.'); const latest = useRef(0);
  useEffect(() => { let cancelled = false; restoreTasks().then(snapshot => { if (!cancelled) { setTasks(snapshot.tasks); setSaveStatus(snapshot.tasks.length ? 'Saved tasks restored.' : 'No saved tasks yet.'); setReady(true); } }).catch(() => { if (!cancelled) { setTasks([]); setSaveStatus('Saved tasks are unavailable. You can start with an empty dashboard.'); setReady(true); } }); return () => { cancelled = true; }; }, []);
  useEffect(() => { if (!ready) return; saveTasks(tasks).then(() => setSaveStatus('Saved locally.')).catch(() => setSaveStatus('Could not save changes; tasks are still visible.')); }, [tasks, ready]);
  useEffect(() => { if (!requestName) return; const controller = new AbortController(); const request = ++latest.current; setSyncStatus('Loading ' + requestName + '…'); load(requestName, controller.signal).then(snapshot => { if (request !== latest.current) return; if (snapshot === null) { setSyncStatus('No tasks were returned.'); return; } setTasks(snapshot); setSyncStatus('Loaded ' + requestName + '.'); }).catch(caught => { if (caught.name === 'AbortError' || request !== latest.current) return; setSyncStatus('Task service is unavailable. Try again.'); }); return () => controller.abort(); }, [requestName]);
  const shown = tasks.filter(task => filter === 'active' ? !task.done : filter === 'completed' ? task.done : true); const complete = tasks.filter(task => task.done).length;
  const addTask = () => { const text = draft.trim(); if (!text) { setError('Enter a task before adding it.'); return; } const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); setTasks(previous => [...previous, { id, text, done: false }]); setDraft(''); setError(''); };
  return <main><h1>Task dashboard</h1><p id="task-count" role="status" aria-live="polite">{complete} of {tasks.length} complete</p><TaskForm draft={draft} onDraftChange={setDraft} onAdd={addTask} /><p id="input-error" role="alert">{error}</p><div className="filters" aria-label="Task filters">{['all','active','completed'].map(name => <button key={name} type="button" data-filter={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</div><TaskList tasks={shown} onToggle={id => setTasks(previous => previous.map(task => task.id === id ? { ...task, done: !task.done } : task))} onDelete={id => setTasks(previous => previous.filter(task => task.id !== id))} /><p id="empty-state" aria-live="polite">{shown.length ? '' : tasks.length ? 'No tasks match this filter.' : 'No tasks yet.'}</p><p id="save-status" role="status" aria-live="polite">{saveStatus}</p><section aria-labelledby="sync-title"><h2 id="sync-title">Effect fixture</h2><div className="sync-controls"><button type="button" onClick={() => setRequestName('Slow')}>Load Slow</button><button type="button" onClick={() => setRequestName('Fast')}>Load Fast</button><button type="button" onClick={() => setRequestName('SlowError')}>Load SlowError</button><button type="button" onClick={() => setRequestName('Empty')}>Load Empty</button><button type="button" onClick={() => setRequestName('Error')}>Load Error</button></div><p id="sync-status" role="status" aria-live="polite">{syncStatus}</p></section></main>;
}`;

const durableEffectsApp = String.raw`import { useEffect, useRef, useState } from 'react';
import { TaskForm, TaskList } from './components.jsx';
import { load } from './taskApi.js';
import { restoreTasks, saveTasks } from './taskStorage.js';
export default function App() {
  const [tasks, setTasks] = useState([]); const [draft, setDraft] = useState(''); const [filter, setFilter] = useState('all'); const [error, setError] = useState(''); const [ready, setReady] = useState(false); const [fault, setFault] = useState(false); const [restoreAttempt, setRestoreAttempt] = useState(0); const [saveStatus, setSaveStatus] = useState('Loading saved tasks…'); const [request, setRequest] = useState({ name: '', generation: 0 }); const [syncStatus, setSyncStatus] = useState('Choose a deterministic sync fixture.'); const latest = useRef(0); const writes = useRef(Promise.resolve());
  useEffect(() => { let cancelled = false; setReady(false); restoreTasks().then(snapshot => { if (!cancelled) { setTasks(snapshot.tasks); setFault(false); setSaveStatus(snapshot.tasks.length ? 'Saved tasks restored.' : 'No saved tasks yet.'); setReady(true); } }).catch(() => { if (!cancelled) { setFault(true); setSaveStatus('Saved tasks are unavailable. Recover explicitly to start empty.'); setReady(true); } }); return () => { cancelled = true; }; }, [restoreAttempt]);
  useEffect(() => { if (!ready || fault) return; writes.current = writes.current.catch(() => undefined).then(() => saveTasks(tasks)).then(() => setSaveStatus('Saved locally.'), () => setSaveStatus('Could not save changes; tasks are still visible.')); }, [tasks, ready, fault]);
  useEffect(() => { if (!request.name) return; const controller = new AbortController(); const requestId = ++latest.current; setSyncStatus('Loading ' + request.name + '…'); load(request.name, controller.signal).then(snapshot => { if (requestId !== latest.current) return; if (snapshot === null) { setSyncStatus('No tasks were returned.'); return; } setTasks(snapshot); setSyncStatus('Loaded ' + request.name + '.'); }).catch(caught => { if (caught.name === 'AbortError' || requestId !== latest.current) return; setSyncStatus('Task service is unavailable. Try again.'); }); return () => { controller.abort(); }; }, [request]);
  const recover = () => { setTasks([]); setFault(false); setSaveStatus('Recovery started with an empty dashboard.'); };
  const addTask = () => { const text = draft.trim(); if (!text) { setError('Enter a task before adding it.'); return; } const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); setTasks(previous => [...previous, { id, text, done: false }]); setDraft(''); setError(''); };
  const shown = tasks.filter(task => filter === 'active' ? !task.done : filter === 'completed' ? task.done : true); const complete = tasks.filter(task => task.done).length; const disabled = !ready || fault;
  return <main><h1>Task dashboard</h1><p id="task-count" role="status" aria-live="polite">{complete} of {tasks.length} complete</p><TaskForm draft={draft} onDraftChange={setDraft} onAdd={addTask} disabled={disabled} /><p id="input-error" role="alert">{error}</p><div className="filters" aria-label="Task filters">{['all','active','completed'].map(name => <button key={name} type="button" disabled={disabled} data-filter={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</div><TaskList tasks={shown} onToggle={id => setTasks(previous => previous.map(task => task.id === id ? { ...task, done: !task.done } : task))} onDelete={id => setTasks(previous => previous.filter(task => task.id !== id))} /><p id="empty-state" aria-live="polite">{shown.length ? '' : tasks.length ? 'No tasks match this filter.' : 'No tasks yet.'}</p><p id="save-status" role="status" aria-live="polite">{saveStatus}</p>{fault && <div><button id="recover-storage" type="button" onClick={recover}>Recover with empty dashboard</button><button id="retry-restore" type="button" onClick={() => setRestoreAttempt(value => value + 1)}>Retry saved tasks</button></div>}<section aria-labelledby="sync-title"><h2 id="sync-title">Effect fixture</h2><div className="sync-controls">{['Slow','Fast','SlowError','IgnoreSlow','Empty','Error'].map(name => <button key={name} type="button" disabled={disabled} onClick={() => setRequest(current => ({ name, generation: current.generation + 1 }))}>Load {name}</button>)}<button id="retry-sync" type="button" disabled={disabled || !request.name} onClick={() => setRequest(current => ({ ...current, generation: current.generation + 1 }))}>Retry load</button></div><p id="sync-status" role="status" aria-live="polite">{syncStatus}</p></section></main>;
}`;

const smokeApp = durableEffectsApp.replace("const shown = tasks.filter", String.raw`const [smokeStatus, setSmokeStatus] = useState(''); const runSmoke = async () => { const prior = tasks.map(task => ({ ...task })); const priorDraft = draft; const priorFilter = filter; const priorSaved = await trainingStorage.getItem('tasks'); try { setTasks([{ id: 'smoke', text: 'Smoke task', done: false }]); setFilter('all'); await new Promise(resolve => setTimeout(resolve, 0)); setTasks([{ id: 'smoke', text: 'Smoke task', done: true }]); await saveTasks([{ id: 'smoke', text: 'Smoke task', done: true }]); setSmokeStatus('Smoke test passed: add, complete, and saved state were observed.'); } catch (caught) { setSmokeStatus('Smoke test failed: ' + (caught instanceof Error ? caught.message : String(caught))); } finally { setTasks(prior); setDraft(priorDraft); setFilter(priorFilter); try { if (priorSaved === null) await trainingStorage.removeItem('tasks'); else await trainingStorage.setItem('tasks', priorSaved); } catch { setSmokeStatus('Smoke test failed: cleanup could not restore saved state.'); } } };
  const shown = tasks.filter`).replace('<p id="save-status"', '<section><button type="button" id="run-react-smoke" onClick={runSmoke}>Run React smoke test</button><p id="react-smoke-status" role="status" aria-live="polite">{smokeStatus}</p><p className="hint" id="react-export-handoff">Export runnable ZIP creates a compiled root index.html plus exact source files. Keep index.html, styles.css, main.jsx, App.jsx, components.jsx, taskApi.js, and taskStorage.js together in source; edit in Project Code and export again to rebuild the root. Serve the extracted root with python -m http.server 8080.</p></section><p id="save-status"');

const scope: Files = { 'index.html': scopeHtml, 'styles.css': css };
const setup: Files = { 'index.html': setupIndex, 'styles.css': css, 'main.jsx': main, 'App.jsx': layoutApp };
const presentation: Files = { 'index.html': index, 'styles.css': css, 'main.jsx': main, 'App.jsx': layoutApp };
const presentationBasic: Files = { ...presentation, 'App.jsx': layoutApp.replace('id="input-error" role="alert"', 'id="input-message"') };
const state: Files = { 'index.html': index, 'styles.css': css, 'main.jsx': main, 'App.jsx': stateApp, 'components.jsx': components };
const effects: Files = { ...state, 'App.jsx': durableEffectsApp, 'taskApi.js': taskApi, 'taskStorage.js': taskStorage };
export const testFiles: Files = { ...effects, 'App.jsx': smokeApp };

export const reactReferenceByTopic: Record<string, Files> = {
  'react-dashboard-scope-and-component-map': scope,
  'react-stack-and-project-setup': setup,
  'react-components-props-and-layout': presentation,
  'react-task-state-and-interactions': state,
  'react-effects-persistence-and-errors': effects,
  'react-testing-and-export': testFiles,
};

/** First guided increments intentionally stop before the second objective of each topic. */
export const reactBasicReferenceByTopic: Record<string, Files> = {
  'react-dashboard-scope-and-component-map': { ...scope, 'index.html': scopeBasic },
  'react-stack-and-project-setup': { ...setup, 'index.html': index },
  'react-components-props-and-layout': presentationBasic,
  'react-task-state-and-interactions': { ...state, 'App.jsx': stateApp.replace('task.id === id ? { ...task, done: !task.done } : task', '{ ...task, done: !task.done }') },
  'react-effects-persistence-and-errors': { ...effects, 'App.jsx': durableEffectsApp.replace('return () => { controller.abort(); };', 'return () => {};') },
  'react-testing-and-export': { ...testFiles, 'App.jsx': testFiles['App.jsx'].replace('id="react-export-handoff"', 'id="react-handoff"') },
};

function copy(files: Files): Files { return Object.fromEntries(Object.entries(files).map(([name, value]) => [name, value])); }
/** Returns an actually broken starter, rather than a placeholder plan. */
export function reactStarter(topicId: string, kind: 'apply' | 'debug' | 'combine'): Files {
  const files = copy(reactReferenceByTopic[topicId] ?? {});
  if (!files['index.html']) throw new Error('Unknown React topic: ' + topicId);
  if (topicId === 'react-dashboard-scope-and-component-map') files['index.html'] = files['index.html'].replace(kind === 'apply' ? 'adds, completes, deletes, and filters' : kind === 'debug' ? 'TaskForm receives onAdd' : 'App owns tasks', kind === 'apply' ? 'adds tasks' : kind === 'debug' ? 'TaskForm has no callback' : 'App displays tasks');
  else if (topicId === 'react-stack-and-project-setup') files[kind === 'apply' ? 'main.jsx' : 'index.html'] = kind === 'apply' ? 'document.querySelector(\'#root\').textContent = \'No React mount\';' : files['index.html'].replace(kind === 'debug' ? 'id="root"' : 'Vite React', kind === 'debug' ? 'id="app"' : 'plain script');
  else if (topicId === 'react-components-props-and-layout') files['App.jsx'] = files['App.jsx'].replace(kind === 'apply' ? 'htmlFor="task-input"' : kind === 'debug' ? "{task.text}" : 'aria-live="polite"', kind === 'apply' ? 'htmlFor="missing-input"' : kind === 'debug' ? "{'row'}" : '');
  else if (topicId === 'react-task-state-and-interactions') files['App.jsx'] = files['App.jsx'].replace(kind === 'apply' ? 'setTasks(previous => [...previous, { id, text, done: false }]);' : kind === 'debug' ? 'task.id === id ? { ...task, done: !task.done } : task' : 'previous.filter(task => task.id !== id)', kind === 'apply' ? 'setTasks(previous => previous);' : kind === 'debug' ? '{ ...task, done: !task.done }' : 'previous.filter(() => false)');
  else if (topicId === 'react-effects-persistence-and-errors') files['App.jsx'] = files['App.jsx'].replace(kind === 'apply' ? 'id="save-status"' : kind === 'debug' ? 'setFault(true)' : 'return () => { controller.abort(); };', kind === 'apply' ? 'id="save-message"' : kind === 'debug' ? 'setFault(false)' : 'return () => {};');
  else files['App.jsx'] = files['App.jsx'].replace(kind === 'apply' ? 'id="run-react-smoke"' : kind === 'debug' ? "setSmokeStatus('Smoke test passed: add, complete, and saved state were observed.');" : 'id="react-export-handoff"', kind === 'apply' ? 'id="missing-smoke"' : kind === 'debug' ? "setSmokeStatus('Smoke test passed.');" : 'id="missing-handoff"');
  return files;
}

export type ReactStorageScenario = { mode: 'valid' | 'reload' | 'legacy' | 'missing' | 'malformed' | 'invalid-version' | 'duplicate-id' | 'read-failure' | 'save-failure'; seed: string | null; failWrites?: boolean };
export const reactStorageScenarios: ReactStorageScenario[] = [
  { mode: 'valid', seed: JSON.stringify({ version: 2, tasks: [{ id: 'restored', text: 'Restored', done: false }] }) },
  { mode: 'reload', seed: JSON.stringify({ version: 2, tasks: [{ id: 'persisted', text: 'Persisted', done: true }] }) },
  { mode: 'legacy', seed: JSON.stringify([{ id: 'legacy', text: 'Legacy task', done: false }]) },
  { mode: 'missing', seed: null }, { mode: 'malformed', seed: '{broken' }, { mode: 'invalid-version', seed: JSON.stringify({ version: 99, tasks: [] }) },
  { mode: 'duplicate-id', seed: JSON.stringify({ version: 2, tasks: [{ id: 'same', text: 'One', done: false }, { id: 'same', text: 'Two', done: true }] }) },
  { mode: 'read-failure', seed: JSON.stringify({ version: 2, tasks: [] }) }, { mode: 'save-failure', seed: JSON.stringify({ version: 2, tasks: [{ id: 'restored', text: 'Restored', done: false }] }), failWrites: true },
];
