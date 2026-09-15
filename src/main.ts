import { fetchLiveWeather } from './runtime/weatherApi';
import { applyTrainingRequest } from './runtime/trainingStorage';
import { buildProjectZip } from './exportProject';
import './style.css';
import type { DemoId, RuntimeEvent, Session } from './contracts';
import { createInitialSession, demos } from './data/demos';
import { SessionStore } from './persistence/store';
import { createRuntime } from './runtime';
import { createLessonUI } from './lesson/ui';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header class="topbar"><div class="brand"><img src="/favicon.svg" alt=""><span>project<span>code</span></span></div><div class="top-meta"><span class="badge">LOCAL WORKSPACE</span><span id="save-state" class="save-state" role="status">Ready to save locally</span><span class="avatar" title="Guest workspace">PC</span></div></header>
<div class="app-layout">
 <aside class="sidebar" aria-label="Learning navigation"><div><p class="eyebrow">Your workspace</p><button class="nav-item active" id="lab-nav" aria-current="page"><span class="nav-mark">⌘</span>Runtime lab</button><button class="nav-item" id="roadmap"><span class="nav-mark">▤</span>Learning path</button></div><div><p class="eyebrow">The project path</p><ol class="project-list"><li><span class="number">01</span><span>Vanilla Todo App<small>DOM · events · state</small></span></li><li><span class="number">02</span><span>Async Weather App<small>Modules · fetch · async</small></span></li><li><span class="number">03</span><span>React Task Dashboard<small>Components · effects</small></span></li><li><span class="number">04</span><span>Ecommerce Store<small>Your independent capstone</small></span></li></ol></div><div class="sidebar-note"><strong>A foundation to build on.</strong>Build Todo and Weather through readings, code, and behavior checks.</div></aside>
 <main class="main"><div class="breadcrumbs">Workspace <span>/</span> <strong>Runtime lab</strong></div>
 <div id="save-banner" class="banner hidden" role="alert"><div id="save-problem"></div><button id="conflict-export">Download this tab’s backup</button><button id="reload-saved">Load saved version</button><button id="retry-save">Retry save</button><button id="raw-export">Download stored data</button></div>
 <div class="page-heading"><div><h1>A small project. A real workspace.</h1><p>Edit a file, run your code, and see what changes.</p></div><div class="mode-switch" aria-label="Runtime examples"><button data-demo="vanilla" aria-pressed="true">Vanilla JavaScript</button><button data-demo="react" aria-pressed="false">React + JSX</button></div></div>
 <section class="workspace" aria-label="Coding workspace">
  <article class="reading"><div class="panel-heading"><span>Field notes</span><span>01 / Runtime proof</span></div><div class="reading-content" id="reading"></div><div class="reading-footer">Practice space · no lesson credit</div></article>
  <div class="splitter" id="reading-splitter" role="separator" tabindex="0" aria-label="Resize reading panel" aria-orientation="vertical" aria-valuemin="190" aria-valuemax="440" aria-valuenow="280"></div>
  <section class="editor-panel" aria-label="File editor"><div class="editor-toolbar"><span><span aria-hidden="true">⌑</span> Explorer</span><button id="add-file" class="quiet">+ New file</button></div><div class="file-tabs" id="file-tabs" role="tablist" aria-label="Open files"></div><div class="editor-body"><nav class="file-tree" aria-label="Project files"><div class="file-tree-title" id="tree-title">TODO-APP</div><div id="file-tree"></div></nav><div class="code-area"><pre id="line-numbers" class="line-numbers" aria-hidden="true"></pre><label for="code" class="sr-only">File contents</label><textarea class="code-input" id="code" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-describedby="editor-help"></textarea></div></div><div class="editor-status"><span id="file-status">index.html</span><span id="editor-help">Plain text · UTF-8</span></div></section>
  <div class="splitter" id="editor-splitter" role="separator" tabindex="0" aria-label="Resize editor panel" aria-orientation="vertical" aria-valuemin="280" aria-valuemax="900" aria-valuenow="420"></div>
  <section class="preview-panel" aria-label="Live preview"><div class="preview-heading"><strong>Live preview</strong><div class="run-controls"><button id="stop" disabled>Stop</button><button id="run" class="primary">▶ Run</button></div></div><div class="preview-address"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor"/><path d="M5 7V4a3 3 0 0 1 6 0v3" stroke="currentColor"/></svg><span id="runtime-status" role="status">Isolated preview · ready to run</span></div><div id="preview" class="preview-container"></div><section class="console" aria-label="Runtime console"><div class="console-head"><span>Console <span id="log-count" class="muted">(0)</span></span><button id="clear-console" class="quiet">Clear</button></div><div id="console-output" class="console-output" role="log" aria-live="polite"></div></section></section>
 </section>
 <div id="weather-live-option" class="hidden"><label><input type="checkbox" id="allow-live-weather"> Allow optional live weather for this Run</label><p>Default: deterministic fixtures. Enabling sends searched cities to Open-Meteo; then choose Live inside the preview. No key or account. Noncommercial learning use; service may be unavailable. <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo data</a> · <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames locations</a></p></div><div class="workspace-footer"><div class="footer-actions"><button id="checkpoint">Save checkpoint</button><button id="restore">Restore checkpoint</button><button id="reset">Reset example</button><button id="export-project">Export runnable ZIP</button><button id="clear-training">Clear preview data</button><button id="backup">↓ Backup</button><button id="import">Restore backup</button></div><span><kbd class="shortcut">Ctrl</kbd> + <kbd class="shortcut">Enter</kbd> to run</span></div>
 <div class="under-workspace"><strong>Make a change. See it work. Keep going.</strong><span>Phase 1 · Local execution proof <button class="quiet" id="limits">Runtime limits ↗</button></span></div>
 </main>
</div><dialog id="dialog" aria-labelledby="dialog-title"><h2 id="dialog-title"></h2><div id="dialog-content"></div><div class="dialog-actions"><button id="dialog-cancel">Cancel</button><button id="dialog-confirm" class="primary">Continue</button></div></dialog><input type="file" id="import-file" accept=".json,application/json" class="hidden">`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const code = $<HTMLTextAreaElement>('#code');
const store = new SessionStore();
let session: Session;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saveBlocked = false;
let isSaving = false;
let runtimeGeneration = 0;
let dialogAction: (() => void) | undefined;
let logs: RuntimeEvent[] = [];
let lessonUI: ReturnType<typeof createLessonUI> | undefined;
try { session = store.load(); } catch (error) { session = createInitialSession(); showSaveError(error); }

function current() { return lessonUI?.workspace() ?? session.workspaces[session.currentWorkspace]; }
function status(message: string, error = false) { $('#save-state').textContent = message; $('#save-state').classList.toggle('error', error); }
function showSaveError(error: unknown) { saveBlocked = true; status('Not saved · action needed', true); $('#save-problem').textContent = error instanceof Error ? error.message : String(error); $('#save-banner').classList.remove('hidden'); }
function save(): boolean {
  clearTimeout(saveTimer);
  if (saveBlocked) return false;
  isSaving = true;
  try { session = store.save(session); status('Saved locally · this browser'); $('#save-banner').classList.add('hidden'); return true; }
  catch (error) { showSaveError(error); return false; }
  finally { isSaving = false; }
}
function scheduleSave() { if (saveBlocked) return; status('Saving locally…'); clearTimeout(saveTimer); saveTimer = setTimeout(save, 450); }
function edited() { current().version++; current().updatedAt = new Date().toISOString(); updateFileStatus(); scheduleSave(); }
function updateFileStatus() { $('#file-status').textContent = `${current().activeFile} · v${current().version}`; }
function renderLines() { $('#line-numbers').textContent = Array.from({ length: code.value.split('\n').length }, (_, i) => i + 1).join('\n'); }
function selectFile(name: string) { current().activeFile = name; renderFiles(); scheduleSave(); }
function renderFiles() {
  $('#weather-live-option').classList.toggle('hidden', session.learning?.location.view !== 'topic' || session.learning?.location.projectId !== 'async-weather');
  if (!Object.hasOwn(current().files, current().activeFile)) current().activeFile = Object.keys(current().files)[0];
  const name = current().activeFile;
  for (const target of ['#file-tabs', '#file-tree']) {
    const container = $(target); container.replaceChildren();
    Object.keys(current().files).forEach(file => {
      const button = document.createElement('button'); button.textContent = file; button.title = file;
      if (target === '#file-tabs') { button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(file === name)); button.setAttribute('aria-controls', 'code'); button.tabIndex = file === name ? 0 : -1; }
      else button.setAttribute('aria-current', String(file === name));
      button.addEventListener('click', () => selectFile(file)); container.append(button);
    });
  }
  code.value = current().files[name] ?? ''; code.setAttribute('aria-label', `Edit ${name}`); code.scrollTop = 0;
  $('#line-numbers').scrollTop = 0; renderLines(); updateFileStatus();
}
function renderReading() {
  if (lessonUI?.render()) return;
  const react = session.currentWorkspace === 'react';
  $('#tree-title').textContent = react ? 'REACT-TASKS' : 'TODO-APP';
  $('#reading').innerHTML = react
    ? `<div class="eyebrow">Experiment / React</div><h2>Same browser.<br>A different way to build.</h2><p>JSX describes the interface. React updates it when state changes. This example uses real React, bundled in your browser.</p><ol class="lesson-steps"><li><span><strong>Run the example.</strong><br>Add a task and toggle a checkbox. Watch the completed count change.</span></li><li><span><strong>Make it yours.</strong><br>Open <code>App.jsx</code> and change the heading.</span></li><li><span><strong>Run it again.</strong><br>Your edits become a fresh, working preview.</span></li></ol><div class="note"><strong>One workspace per example</strong>Your vanilla files are kept separately. Switching examples never replaces your code.</div>`
    : `<div class="eyebrow">Experiment / Vanilla JavaScript</div><h2>From a few files<br>to a working app.</h2><p>A page gives your app structure. Styles give it shape. JavaScript makes it respond.</p><ol class="lesson-steps"><li><span><strong>Run the example.</strong><br>Add a task, mark it done, or remove it.</span></li><li><span><strong>Change one thing.</strong><br>Open <code>index.html</code> and give your list a new heading.</span></li><li><span><strong>Connect the pieces.</strong><br>Explore how <code>main.js</code> imports task operations from <code>model.js</code>.</span></li></ol><div class="note"><strong>Your files stay with you</strong>Edits save in this browser. Run refreshes the preview; it does not replace your files.</div>`;
  document.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demo === session.currentWorkspace)));
}
function emptyPreview(message = 'Run your files to see the app here.') { $('#preview').innerHTML = `<div class="preview-empty"><div class="empty-symbol" aria-hidden="true">&lt;/&gt;</div><strong>A place to see it work</strong><span></span></div>`; $('#preview .preview-empty span').textContent = message; }
function log(event: RuntimeEvent) {
  if (event.type === 'status') { $('#runtime-status').textContent = event.message; return; }
  logs.push(event); if (logs.length > 150) logs.shift();
  $('#console-output').replaceChildren(...logs.map(item => { const row = document.createElement('div'); row.className = `log ${item.type === 'error' ? 'error' : item.level ?? ''}`; row.textContent = `${item.type === 'error' ? '×' : '›'} ${item.message}`; return row; }));
  $('#log-count').textContent = `(${logs.length})`; $('#console-output').scrollTop = $('#console-output').scrollHeight;
}
const runtime = createRuntime($('#preview'), log);
async function run() {
  save(); const generation = ++runtimeGeneration;
  $<HTMLButtonElement>('#run').disabled = true; $<HTMLButtonElement>('#stop').disabled = false;
  logs = []; $('#console-output').replaceChildren(); $('#log-count').textContent = '(0)';
  const target = current();
  const locationAtRun = JSON.stringify(session.learning?.location);
  const demoAtRun = session.currentWorkspace;
  try { await runtime.run({ ...target.files }, request => {
    if (JSON.stringify(session.learning?.location) !== locationAtRun || session.currentWorkspace !== demoAtRun) throw new Error('Workspace changed. Run the current draft again.');
    if (saveBlocked) throw new Error('Preview storage unavailable until the host save problem is resolved.');
    const live = current();
    const previous = live.trainingData;
    const result = applyTrainingRequest(previous ?? {}, request);
    if (request.operation !== 'getItem') {
      live.trainingData = result.data;
      if (!save()) { live.trainingData = previous; throw new Error('Preview data was not saved. Resolve the host save problem and retry.'); }
    }
    return result.value;
  }, session.learning?.location.view === 'topic' && session.learning.location.projectId === 'async-weather' ? { live: $<HTMLInputElement>('#allow-live-weather').checked ? fetchLiveWeather : undefined } : undefined); }
  catch (error) { log({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
  finally { if (generation === runtimeGeneration) $<HTMLButtonElement>('#run').disabled = false; }
}
function stop(message = 'Preview stopped. Your code is safe to edit.') { $<HTMLInputElement>('#allow-live-weather').checked = false; lessonUI?.cancelGrading(); runtimeGeneration++; runtime.stop(); emptyPreview(message); $('#runtime-status').textContent = 'Isolated preview · stopped'; $<HTMLButtonElement>('#run').disabled = false; $<HTMLButtonElement>('#stop').disabled = true; }
function switchDemo(id: DemoId) { lessonUI?.showLab(); if (id === session.currentWorkspace) return; stop(); session.currentWorkspace = id; renderReading(); renderFiles(); scheduleSave(); }
function showDialog(title: string, content: string, confirm = 'Got it', action?: () => void) {
  $('#dialog-title').textContent = title; $('#dialog-content').innerHTML = content; $('#dialog-confirm').textContent = confirm;
  $('#dialog-cancel').classList.toggle('hidden', !action); dialogAction = action; $<HTMLDialogElement>('#dialog').showModal();
}
function download(text: string, filename: string) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
// Preserve the in-memory draft even when it exceeds the normal storage limits.
function backup() { try { download(JSON.stringify(session, null, 2), `project-code-backup-${Date.now()}.json`); } catch (error) { showSaveError(error); } }
function replaceFiles(files: Record<string, string>) { stop(); current().files = { ...files }; current().activeFile = Object.keys(files)[0]; edited(); renderFiles(); save(); }

code.addEventListener('input', () => { current().files[current().activeFile] = code.value; renderLines(); edited(); });
code.addEventListener('scroll', () => { $('#line-numbers').scrollTop = code.scrollTop; });
code.addEventListener('keydown', event => { if (event.key === 'Tab' && !event.shiftKey) { event.preventDefault(); code.setRangeText('  ', code.selectionStart, code.selectionEnd, 'end'); code.dispatchEvent(new Event('input')); } });
$('#file-tabs').addEventListener('keydown', event => { const key = (event as KeyboardEvent).key; if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) return; event.preventDefault(); const names = Object.keys(current().files); const index = names.indexOf(current().activeFile); const next = key === 'Home' ? 0 : key === 'End' ? names.length - 1 : (index + (key === 'ArrowRight' ? 1 : -1) + names.length) % names.length; selectFile(names[next]); $('#file-tabs [aria-selected="true"]').focus(); });
$('#allow-live-weather').addEventListener('change', () => { runtime.stop(); emptyPreview('Run again to apply the weather capability choice.'); });
$('#run').addEventListener('click', run); $('#stop').addEventListener('click', () => stop());
$('#lab-nav').addEventListener('click', () => { lessonUI?.showLab(); code.focus(); });
document.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach(button => button.addEventListener('click', () => switchDemo(button.dataset.demo as DemoId)));
$('#clear-console').addEventListener('click', () => { logs = []; $('#console-output').replaceChildren(); $('#log-count').textContent = '(0)'; });
$('#checkpoint').addEventListener('click', () => { current().checkpoint = { files: { ...current().files }, createdAt: new Date().toISOString() }; edited(); if (save()) log({ type: 'console', level: 'info', message: 'Checkpoint saved for this example.' }); });
$('#restore').addEventListener('click', () => { const checkpoint = current().checkpoint; if (!checkpoint) { showDialog('No checkpoint yet', '<p>Save a checkpoint before restoring one.</p>'); return; } showDialog('Restore this example’s checkpoint?', `<p>This replaces the current example’s files with its saved checkpoint. The other example stays intact. Download a backup first if you want to keep both versions.</p>`, 'Restore checkpoint', () => replaceFiles(checkpoint.files)); });
$('#reset').addEventListener('click', () => showDialog('Reset this workspace?', '<p>This replaces only the current workspace’s files with its original starter. Other drafts and saved checkpoints are preserved.</p>', 'Reset workspace', () => replaceFiles(lessonUI?.starterFiles() ?? demos[session.currentWorkspace].files)));
$('#export-project').addEventListener('click', async () => {
  const button = $<HTMLButtonElement>('#export-project'); button.disabled = true;
  const files = { ...current().files }; const name = session.learning?.location.view === 'topic' ? session.learning.location.challengeId ?? session.learning.location.projectId ?? 'todo' : session.currentWorkspace;
  try {
    const bytes = await buildProjectZip(files, name);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
    const link = document.createElement('a'); link.href = url; link.download = `${name}-project.zip`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    log({ type: 'console', level: 'info', message: 'Runnable ZIP exported from your draft snapshot. Extract and read README.md. Behavior checks remain separate.' });
  } catch (error) { log({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
  finally { button.disabled = false; }
});
$('#clear-training').addEventListener('click', () => showDialog('Clear this workspace data preview data?', '<p>This clears only the current preview storage map. Source files, progress, checkpoints, and other workspaces stay saved.</p>', 'Clear preview data', () => {
  stop(); const target = current(), previous = target.trainingData; target.trainingData = {};
  if (!save()) target.trainingData = previous;
}));
$('#backup').addEventListener('click', backup); $('#conflict-export').addEventListener('click', backup);
$('#raw-export').addEventListener('click', () => { try { download(localStorage.getItem('project-code.session.v1') ?? 'null', 'project-code-stored-recovery.json'); } catch (error) { showSaveError(error); } });
$('#retry-save').addEventListener('click', () => { saveBlocked = false; save(); });
$('#reload-saved').addEventListener('click', () => showDialog('Load the saved version?', '<p>This discards this tab’s unsaved edits and loads the latest saved session. Download this tab’s backup first if you need to keep its changes.</p>', 'Load saved version', () => { try { const loaded = store.load(); clearTimeout(saveTimer); stop(); session = loaded; saveBlocked = false; $('#save-banner').classList.add('hidden'); status('Saved locally · this browser'); renderReading(); renderFiles(); } catch (error) { showSaveError(error); } }));
$('#import').addEventListener('click', () => $<HTMLInputElement>('#import-file').click());
$('#import-file').addEventListener('change', async () => {
  const input = $<HTMLInputElement>('#import-file'); const file = input.files?.[0]; if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('This backup exceeds the 5 MB import limit.');
    const imported = store.importSession(await file.text());
    showDialog('Restore this backup?', '<p>This replaces both examples and the local progress record in this tab. Download a backup of the current session first if you want to keep it.</p>', 'Restore backup', () => {
      const revision = session.revision; const writerId = session.writerId;
      stop(); session = { ...imported, revision, writerId }; renderReading(); renderFiles(); save();
    });
  } catch (error) { showDialog('Backup could not be read', '<p id="import-error"></p>'); $('#import-error').textContent = error instanceof Error ? error.message : String(error); }
  finally { input.value = ''; }
});
$('#add-file').addEventListener('click', () => {
  showDialog('Add a project file', '<p>Use a relative path, such as <code>helpers.js</code> or <code>assets/icon.svg</code>. Import it from your code to use it.</p><label for="new-file-name">File path</label><input id="new-file-name" class="dialog-input" placeholder="helpers.js" maxlength="120"><p id="file-error" role="alert"></p>', 'Create file', () => {
    const name = $<HTMLInputElement>('#new-file-name').value.trim();
    if (!/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(html|css|js|jsx|ts|tsx|json|svg|txt)$/.test(name) || name.split('/').some(part => part === '..' || part === '.') || Object.hasOwn(current().files, name) || Object.keys(current().files).length >= 40) { showDialog('File could not be added', '<p>Use a new relative path with a supported extension. There is a limit of 40 files.</p>'); return; }
    current().files[name] = ''; current().activeFile = name; edited(); renderFiles();
  });
  $<HTMLInputElement>('#new-file-name').focus();
});
$('#roadmap').addEventListener('click', () => showDialog('A path from syntax to projects', '<p>Todo and Weather lessons are available through Dashboard; later projects remain drafts.</p><ol class="roadmap-list"><li><strong>Vanilla Todo App</strong><br>Plan the app, compare stacks, build with DOM and events, manage state, filter, persist, test, and export.</li><li><strong>Async Weather App</strong><br>Organize modules, understand promises, fetch data, handle loading and errors, and prevent outdated responses.</li><li><strong>React Task Dashboard</strong><br>Revisit familiar requirements through components, props, state, and effects.</li><li><strong>Ecommerce Store</strong><br>Build an original catalog, routes, search, cart, and simulated checkout, with increasingly independent work.</li></ol><p>Each published topic will require guided practice, 10 distinct correct answers, and exactly three coding challenges.</p>'));
$('#limits').addEventListener('click', () => showDialog('What this runtime supports', '<p><strong>Runs locally:</strong> HTML, CSS, JavaScript modules, text/SVG assets, and React JSX using bundled dependencies. Use relative imports and the included React packages.</p><p><strong>Isolation:</strong> Learner code runs in an opaque sandboxed frame. It cannot read the app’s storage or credentials. Direct network requests, external packages, forms that navigate, and server execution are not supported. Weather fixtures run offline. An explicit host opt-in enables only bounded Open-Meteo city lookups through the weather capability.</p><p><strong>Recovery:</strong> Stop discards the preview. Common infinite loops are guarded; this is not a hardened runtime for hostile code. If the whole tab stalls, close it and reopen the app. Saved code is never run automatically.</p><p><strong>Persistence:</strong> Source files and workspace checkpoints save in this browser. Preview state persists only when learner code uses the scoped async trainingStorage API; ordinary in-memory state resets on Run. Clear preview data resets only this workspace training data. Nothing is synced to an account. Backups are JSON session records. Export runnable ZIP compiles the current files and includes their original sources plus local run/deployment instructions.</p><p><strong>Lessons:</strong> The Vanilla Todo, Async Weather and React Task Dashboard curricula have local mastery tracking and behavior checks. Client-visible checks are educational and can be tampered with. Accounts, a terminal, and server execution remain future scope.</p>'));
$('#dialog-cancel').addEventListener('click', () => $<HTMLDialogElement>('#dialog').close());
$('#dialog-confirm').addEventListener('click', () => { const action = dialogAction; $<HTMLDialogElement>('#dialog').close(); dialogAction = undefined; action?.(); });
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !$<HTMLDialogElement>('#dialog').open) { event.preventDefault(); if (!$<HTMLButtonElement>('#run').disabled) void run(); } if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); save(); } });
store.subscribe(() => { if (!isSaving) { clearTimeout(saveTimer); showSaveError(new Error('Another tab changed the saved session. Download this tab’s backup or load the saved version before continuing.')); } });
window.addEventListener('pagehide', () => { clearTimeout(saveTimer); if (!saveBlocked) save(); runtime.dispose(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && !saveBlocked) save(); });

function setupSplitter(id: string, column: 'reading' | 'editor', min: number, max: number) {
  const handle = $(id); const workspace = $('.workspace');
  function resize(value: number) {
    const size = Math.round(Math.min(max, Math.max(min, value))); handle.setAttribute('aria-valuenow', String(size));
    // Keep the preview usable; narrow screens use the responsive stacked layout.
    const available = workspace.clientWidth;
    const readingWidth = column === 'reading' ? size : $('.reading').getBoundingClientRect().width;
    const editorWidth = column === 'editor' ? size : $('.editor-panel').getBoundingClientRect().width;
    if (available - readingWidth - editorWidth < 240) return;
    workspace.style.gridTemplateColumns = `${readingWidth}px 7px ${editorWidth}px 7px minmax(220px,1fr)`;
  }
  handle.addEventListener('pointerdown', event => { const start = event.clientX; const width = $(column === 'reading' ? '.reading' : '.editor-panel').getBoundingClientRect().width; handle.setPointerCapture(event.pointerId); const move = (e: PointerEvent) => resize(width + e.clientX - start); const end = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); }; handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); });
  handle.addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); resize($(column === 'reading' ? '.reading' : '.editor-panel').getBoundingClientRect().width + (event.key === 'ArrowRight' ? 20 : -20)); });
}
setupSplitter('#reading-splitter', 'reading', 190, 440); setupSplitter('#editor-splitter', 'editor', 280, 900);
window.addEventListener('resize', () => { $('.workspace').style.gridTemplateColumns = ''; });
lessonUI = createLessonUI({ getSession: () => session, setSession: value => { session = value; }, save, refresh: () => { renderReading(); renderFiles(); }, stop });
renderReading(); renderFiles(); emptyPreview();
if (!saveBlocked) status(session.revision > 0 ? 'Saved locally · this browser' : 'Ready to save locally');


