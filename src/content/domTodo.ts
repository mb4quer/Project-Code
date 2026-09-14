import { domQuestions } from './domQuestions';
import type { Files } from '../contracts';
import type { Topic } from './schema';

const projectId = 'vanilla-todo';
const topicId = 'todo-dom-events-and-task-state';
const topicPath = `projects/${projectId}/topics/${topicId}`;
const activityPath = (id: string) => `${topicPath}/activities/${id}`;
const blankPath = (id: string) => `${topicPath}/blanks/${id}`;
const questionPath = (id: string) => `${topicPath}/questions/${id}`;
const challengePath = (id: string) => `${topicPath}/challenges/${id}`;

const htmlScaffold = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Small steps Todo</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="todo-app">
      <h1>Small steps</h1>
      <form id="todo-form">
        <label for="task-input">New task</label>
        <div class="task-entry">
          <input id="task-input" type="text" autocomplete="off" />
          <button type="submit">Add task</button>
        </div>
      </form>
      <p id="task-count" aria-live="polite">0 of 0 complete</p>
      <ul id="task-list" aria-live="polite"></ul>
    </main>
    <script type="module" src="./main.js"></script>
  </body>
</html>`;

const cssScaffold = `:root {
  font-family: system-ui, sans-serif;
  color: #172033;
  background: #f5f7fb;
}

body { margin: 0; }

.todo-app {
  max-width: 34rem;
  margin: 2rem auto;
  padding: 1.25rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 10px 30px #17203318;
}

.task-entry { display: flex; gap: .5rem; }
#task-input { flex: 1; min-width: 0; padding: .55rem; }
button { padding: .55rem .8rem; }
#task-list { padding: 0; list-style: none; }
#task-list li { display: flex; align-items: center; gap: .5rem; padding: .6rem 0; border-bottom: 1px solid #e6e9f0; }
.task-label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.task-label.done { color: #667085; text-decoration: line-through; }
.delete-task { flex: none; }
`;

const guidedOneStarter: Files = {
  'index.html': htmlScaffold,
  'styles.css': cssScaffold,
  'model.js': `let nextId = 1;

export function addTask(tasks, rawText) {
  // TODO: trim rawText, reject an empty result, and return a new task array.
  return tasks;
}
`,
  'main.js': `import { addTask } from './model.js';

const form = document.querySelector('#todo-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const count = document.querySelector('#task-count');
let tasks = [];

function render() {
  list.replaceChildren();
  count.textContent = '0 of ' + tasks.length + ' complete';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  // TODO: use addTask, clear the input after a successful add, and render.
});

render();
`,
};

const guidedOneReference: Files = {
  ...guidedOneStarter,
  'model.js': `let nextId = 1;

export function addTask(tasks, rawText) {
  const text = rawText.trim();
  if (!text) return tasks;
  return [...tasks, { id: nextId++, text, done: false }];
}
`,
  'main.js': `import { addTask } from './model.js';

const form = document.querySelector('#todo-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const count = document.querySelector('#task-count');
let tasks = [];

function render() {
  list.replaceChildren(...tasks.map(task => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'task-label';
    label.textContent = task.text;
    item.append(label);
    return item;
  }));
  count.textContent = '0 of ' + tasks.length + ' complete';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const nextTasks = addTask(tasks, input.value);
  if (nextTasks !== tasks) input.value = '';
  tasks = nextTasks;
  render();
});

render();
`,
};

const guidedTwoReference: Files = {
  ...guidedOneReference,
  'model.js': `let nextId = 1;

export function addTask(tasks, rawText) {
  const text = rawText.trim();
  if (!text) return tasks;
  return [...tasks, { id: nextId++, text, done: false }];
}

export function toggleTask(tasks, id) {
  return tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
}

export function deleteTask(tasks, id) {
  return tasks.filter(task => task.id !== id);
}
`,
  'main.js': `import { addTask, deleteTask, toggleTask } from './model.js';

const form = document.querySelector('#todo-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const count = document.querySelector('#task-count');
let tasks = [];

function render() {
  const complete = tasks.filter(task => task.done).length;
  count.textContent = complete + ' of ' + tasks.length + ' complete';
  list.replaceChildren(...tasks.map(task => {
    const item = document.createElement('li');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', 'Complete ' + task.text);
    checkbox.addEventListener('change', () => {
      tasks = toggleTask(tasks, task.id);
      render();
    });
    const label = document.createElement('span');
    label.className = 'task-label' + (task.done ? ' done' : '');
    label.textContent = task.text;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-task';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      tasks = deleteTask(tasks, task.id);
      render();
    });
    item.append(checkbox, label, remove);
    return item;
  }));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const nextTasks = addTask(tasks, input.value);
  if (nextTasks !== tasks) input.value = '';
  tasks = nextTasks;
  render();
});

render();
`,
};

const debugStarter: Files = {
  ...guidedTwoReference,
  'model.js': `let nextId = 1;

export function addTask(tasks, rawText) {
  const text = rawText.trim();
  if (!text) return tasks;
  return [...tasks, { id: nextId++, text, done: false }];
}

export function toggleTask(tasks, id) {
  // Bug: ids are numbers, but this comparison converts the requested id to text.
  return tasks.map(task => task.id === String(id) ? { ...task, done: !task.done } : task);
}

export function deleteTask(tasks, id) {
  return tasks.filter(task => task.id !== id);
}
`,
};

const combineStarter: Files = {
  'index.html': htmlScaffold,
  'styles.css': cssScaffold,
  'model.js': `let nextId = 1;

export function addTask(tasks, rawText) {
  const text = rawText.trim();
  if (!text) return tasks;
  return [...tasks, { id: nextId++, text, done: false }];
}

// Add toggleTask and deleteTask, then connect all three operations to the DOM.
`,
  'main.js': `import { addTask } from './model.js';

const form = document.querySelector('#todo-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const count = document.querySelector('#task-count');
let tasks = [];

function render() {
  // Build each row from its stable task id and update count.
  list.replaceChildren();
  count.textContent = tasks.filter(task => task.done).length + ' of ' + tasks.length + ' complete';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const nextTasks = addTask(tasks, input.value);
  if (nextTasks !== tasks) input.value = '';
  tasks = nextTasks;
  render();
});

render();
`,
};

const combineReference: Files = guidedTwoReference;

const normalization = { trim: true as const, collapseWhitespace: true, caseSensitive: false, lineEndings: 'lf' as const };
const codeNormalization = { trim: true as const, collapseWhitespace: false, caseSensitive: true, lineEndings: 'lf' as const };

const activities = [
  {
    id: 'todo-dom-planning-stack-setup', path: activityPath('todo-dom-planning-stack-setup'), title: 'Plan the Todo DOM and choose the smallest stack', kind: 'reading' as const, order: 1,
    objective: 'Connect a small user flow to stable HTML hooks, shared CSS, and plain browser JavaScript before writing event handlers.',
    outline: 'Start with the add, complete, and delete flow. Compare plain browser files, a Vite vanilla project, and React, then keep this pilot in plain DOM code. Map each required selector to one job so later JavaScript can find the same elements every time.',
    estimatedMinutes: 8,
    explanation: 'A useful Todo pilot has a narrow contract: the form receives input, the list displays rows, and the count reports completion. The HTML ids are the handoff between markup and JavaScript. CSS supplies shared visual constants while JavaScript owns changing task data. Keeping those responsibilities separate lets you change a color without changing state logic and lets a render function rebuild rows without changing the page scaffold.\n\nPlain browser files load one HTML file, one CSS file, and one JavaScript module directly. That is the smallest mental model and makes each DOM event visible, but it gives you fewer build-time conveniences. Vite with vanilla JavaScript adds a development server, fast rebuilds, and a production bundler while keeping the same DOM APIs; the tradeoff is learning a build command and project configuration. React adds components, JSX, and a declarative rendering model that can help a larger changing interface, but it also adds a library, a different state model, and another layer between code and DOM.\n\nThe host already uses Vite and a browser compiler to run project files, so the learner can receive fast feedback without learning host configuration in this activity. The Todo code stays plain DOM code because the purpose here is to see form events, task state, and DOM rendering directly. A module boundary is concrete: model.js can contain export function addTask(tasks, rawText) { const text = rawText.trim(); if (!text) return tasks; return [...tasks, { id: nextId++, text, done: false }]; }, while main.js starts with import { addTask } from "./model.js";. The submit listener owns the browser event, while render owns the DOM projection.',
    instructions: [
      'Read the required DOM contract: form#todo-form, input#task-input, ul#task-list, and p#task-count.',
      'Trace the add flow on paper: submit event, trimmed value, new task object with a stable numeric id, state update, render, and input clear.',
      'Compare plain files, Vite with vanilla JavaScript, and React: name what each supplies, one tradeoff, and why this pilot chooses plain DOM code even though the host uses Vite.',
      'Read the module example: model.js exports addTask and main.js imports it from ./model.js. Identify which file owns data operations and which file owns DOM references.',
      'Record why task labels must be written with textContent and why a row action must carry the task id instead of searching by label text.',
    ],
    hints: ['Treat the selectors as a public contract between HTML and JavaScript.', 'Use one array of task records as the source of truth; the list is a view of that array.'],
  },
  {
    id: 'todo-dom-guided-add', path: activityPath('todo-dom-guided-add'), title: 'Guided: add validated tasks', kind: 'guided-coding' as const, order: 2,
    objective: 'Implement validated task creation and render multiple literal task labels in the supplied Todo scaffold.',
    outline: 'Begin with the supplied HTML and CSS. Complete addTask in model.js, wire the form submit in main.js, and render rows into the required list. This step deliberately keeps completion and deletion for the next guided activity.',
    estimatedMinutes: 15,
    explanation: 'The starter keeps the browser structure ready while leaving the decision points visible in JavaScript. A valid add trims the candidate once, rejects the empty result, creates a fresh object with a unique id, appends it immutably, clears the input, and renders. Returning the original array for invalid input gives the submit handler a deterministic way to leave the text in place.\n\nThe model.js export keeps data work testable and the main.js import keeps DOM work in one place. The spread expression [...tasks, newTask] creates a new array with the old records followed by the new one. The label assignment label.textContent = task.text means input such as <img src=x> appears as text instead of becoming markup. The form handler can compare nextTasks !== tasks to tell a valid add from a rejected one.',
    instructions: [
      'Open the provided starter files and keep the HTML ids and CSS class names unchanged.',
      'In model.js, implement addTask(tasks, rawText): trim rawText, return tasks for whitespace-only input, and otherwise append { id, text, done: false } with a fresh id.',
      'In main.js, prevent the form’s native submit, call addTask, clear #task-input only when a task was added, and call render for both valid and invalid submissions.',
      'In render, create a li and a span.task-label for each task, assign the label with textContent, and derive the count as 0 of {tasks.length} complete; the next activity adds completed flags.',
      'Run the preview with an empty input, whitespace, two different tasks, and the literal string <b>read me</b>. Confirm whitespace is blocked, both tasks remain, and the literal string is not parsed as HTML.',
    ],
    starterFiles: guidedOneStarter,
    validation: { observable: 'The Todo form accepts trimmed non-empty text and displays each accepted task as a literal .task-label row.', checks: ['Initial #task-count reads 0 of 0 complete.', 'Whitespace-only submit creates no li and leaves the input available.', 'A task with surrounding spaces is displayed without those spaces.', 'Two accepted submissions produce two #task-list li rows, including duplicate labels.', 'A string containing markup characters is displayed literally through textContent.'] },
    hints: ['Compare the returned array by identity to decide whether the input should clear.', 'A fresh id must be independent of the text; duplicate labels are valid separate tasks.', 'Use document.createElement and textContent for labels, never innerHTML with learner input.'],
    referenceSolution: guidedOneReference,
  },
  {
    id: 'todo-dom-state-render', path: activityPath('todo-dom-state-render'), title: 'Reading: state, stable ids, and rendering', kind: 'reading' as const, order: 3,
    objective: 'Explain why a task record and one render path keep add, toggle, delete, and count behavior consistent.',
    outline: 'Extend the add-only mental model into full CRUD. Keep tasks in JavaScript, derive the completion count from state, and rebuild each row with controls that close over or carry its stable id.',
    estimatedMinutes: 8,
    explanation: 'State is the durable meaning of the current interface: each task has an id, text, and done flag. Rendering translates that state into DOM nodes. Add, toggle, and delete should change the array first and then render from it. The id is the identity of a row, so two tasks named “Review” can still be toggled or deleted independently.\n\nThe array methods provide small, readable state transitions. Spread copies the array when adding: tasks = [...tasks, newTask]. Map visits every record and uses a ternary to copy only the matching record: tasks.map(task => task.id === id ? { ...task, done: !task.done } : task). Filter keeps every record except one id: tasks.filter(task => task.id !== id). Each callback receives one task; the arrow function attached to a checkbox closes over that task’s id, so checkbox.addEventListener("change", () => { tasks = toggleTask(tasks, task.id); render(); }) still addresses the same record after the list is rebuilt.\n\nA compact render shape is const complete = tasks.filter(task => task.done).length; count.textContent = complete + " of " + tasks.length + " complete"; list.replaceChildren(...tasks.map(task => { const row = document.createElement("li"); const label = document.createElement("span"); label.className = "task-label"; label.textContent = task.text; row.append(label); return row; }));. The row is returned as an li because ul#task-list must contain list items.\n\nKeep nextId as a separate counter. If ids are 1 and 2, deleting id 1 leaves an array of length 1; using tasks.length + 1 would try to reuse id 2. nextId continues to 3, so every new task keeps a distinct identity. Set checkbox.checked = task.done for the live control property; an HTML checked attribute describes the initial markup default and is not the right way to update a control after a user interaction. The count is derived each time from done flags, which prevents a stale counter from disagreeing with the list.',
    instructions: [
      'Read the add reference and identify the single tasks array that survives between event callbacks. Note that model.js exports functions and main.js imports them.',
      'Write a map callback with a ternary: copy the matching task with { ...task, done: !task.done } and return every other task unchanged.',
      'Write a filter callback that keeps task.id !== id, even when another task has the same text. Explain why nextId must not be replaced with tasks.length + 1 after deletion.',
      'Plan render in this order: compute complete count, update #task-count, create each li, add checkbox/input and .task-label, add button.delete-task, set the live checked property, and attach callbacks that close over the captured id.',
      'Predict what happens when two identical labels are added, the first is completed, and the second is deleted; the remaining row must retain its own id and state.',
    ],
    hints: ['Map changes one record at a time and filter by id, never by label text.', 'Rebuilding the list is simple when every visible value is derived from tasks.'],
  },
  {
    id: 'todo-dom-guided-render', path: activityPath('todo-dom-guided-render'), title: 'Guided: render full CRUD state', kind: 'guided-coding' as const, order: 4,
    objective: 'Extend the existing add activity in place with stable-id toggle/delete controls and a derived completion count.',
    outline: 'Continue from the files produced by todo-dom-guided-add. Add model operations and replace the add-only render with full rows. The starter map shows the add implementation as a reference baseline; use the learner’s existing workspace as the working copy and preserve any compatible edits.',
    estimatedMinutes: 20,
    explanation: 'This guided step extends an existing workspace instead of silently starting over. Toggle and delete are pure state transformations keyed by task.id. The render function creates a checkbox, a .task-label, and a button.delete-task for every task, then attaches handlers with that task’s id.\n\nIt derives “complete of total complete” from the current array before rebuilding rows, so deletion and repeated toggles cannot leave the count behind. Set remove.type = "button" so a delete control cannot accidentally submit the add form if it is placed inside that form. Set the checkbox.checked property from task.done each time you create a control; changing a checked HTML attribute would describe the default markup rather than reliably update the live control state.',
    instructions: [
      'Open the files already created in todo-dom-guided-add and extend them in place; keep learner changes that do not conflict with the required selectors and behavior.',
      'Add toggleTask and deleteTask to model.js. Toggle only the matching numeric id and filter only that id; do not compare or delete by label text.',
      'Update render to write “{complete} of {total} complete” into #task-count, then build each li with input[type=checkbox], span.task-label, and button.delete-task.',
      'Set checkbox.checked and the label’s done class from task.done. Use textContent for the label and attach handlers that call the model with task.id before rendering again.',
      'Exercise add, toggle, delete, duplicate labels, and the empty list. Verify the count starts at 0 of 0 complete, changes after one toggle, and returns to 0 of 0 complete after deleting the final row.',
    ],
    starterFiles: guidedOneReference,
    validation: { observable: 'The existing Todo workspace supports add, toggle, delete, literal labels, and a derived completion count keyed by stable task ids.', checks: ['The initial empty UI contains the four required selectors and says 0 of 0 complete.', 'Adding two tasks creates two rows with a checkbox, .task-label, and .delete-task each.', 'Toggling one of two duplicate labels changes only that row and reports 1 of 2 complete.', 'Deleting one duplicate label leaves the other row and its completion state intact.', 'Deleting all rows restores an empty list and 0 of 0 complete.', 'Markup-looking task text remains literal.'] },
    hints: ['Use task.id inside each event callback; the label is display data, not identity.', 'Compute complete with filter(task => task.done).length before mapping rows.', 'Call render after every state change so controls and count are rebuilt from the same array.'],
    referenceSolution: guidedTwoReference,
  },
  {
    id: 'todo-dom-debug-independence', path: activityPath('todo-dom-debug-independence'), title: 'Reading: debug behavior and plan independent CRUD', kind: 'reading' as const, order: 5,
    objective: 'Diagnose a broken id comparison and plan a small independent CRUD extension while keeping the contract focused on in-memory task state.',
    outline: 'Use observable behavior to isolate a regression: add and delete can pass while toggle silently fails. Then plan an independent CRUD improvement that uses the same task state and render contract, while keeping this topic focused on core CRUD.',
    estimatedMinutes: 8,
    explanation: 'A DOM bug is easier to locate when each behavior has a narrow check. If add creates rows and delete removes the requested row but a checkbox changes nothing, inspect the id value at the event boundary and the comparison in the state function. A numeric task id must remain numeric.\n\nAn independent CRUD plan starts with one observable sentence, such as “deleting one of two identically named tasks leaves the other task unchanged.” Then name the state transition, the event that triggers it, and the render details that must change. Reuse stable ids, map or filter, callbacks, and the existing render contract. Keep the plan small enough that add, toggle, delete, and the count can still be checked after the change.\n\nPersistence is a later Todo milestone. Network and asynchronous requests belong to the separate Async Weather project, so this topic stays with deterministic in-memory CRUD.',
    instructions: [
      'Run the debug starter and record which of add, toggle, delete, and count behavior fails before reading its comment.',
      'Trace the checkbox’s requested id and the type of task.id into toggleTask; state the one comparison that prevents the match.',
      'Fix only the id comparison, then rerun add and delete to show they still work and verify a single checkbox now changes the count.',
      'Plan the independent challenge: list the add, toggle, and delete behaviors, identify their state transitions, and describe how one render function keeps controls and count consistent.',
      'Keep this topic limited to deterministic in-memory CRUD. Leave persistence for a later Todo milestone and network or asynchronous work for the Async Weather project.',
    ],
    hints: ['Log the value and typeof at the boundary when a matching operation appears inert.', 'A passing add or delete check does not prove toggle uses the same identity representation.', 'Start an independent feature from an observable sentence, then map it to one state change and one render update.'],
  },
];

const blanks = [
  { id: 'todo-dom-blank-trim-validation', path: blankPath('todo-dom-blank-trim-validation'), kind: 'conceptual' as const, prompt: 'What must be removed from a candidate task before checking whether it is empty?', acceptedAnswers: ['leading and trailing whitespace', 'outer whitespace', 'surrounding whitespace'], explanation: 'Trim the candidate before validation so a whitespace-only submission becomes empty while meaningful internal spaces remain.', normalization },
  { id: 'todo-dom-blank-text-content', path: blankPath('todo-dom-blank-text-content'), kind: 'code' as const, prompt: 'Complete the safe label assignment: label._____ = task.text;', acceptedAnswers: ['textContent'], explanation: 'textContent inserts the task as literal text and does not parse learner input as HTML.', normalization: codeNormalization },
  { id: 'todo-dom-blank-stable-id', path: blankPath('todo-dom-blank-stable-id'), kind: 'conceptual' as const, prompt: 'Which task field lets two tasks with the same label be changed independently?', acceptedAnswers: ['id', 'a stable id', 'stable id'], explanation: 'A unique stable id identifies the record even when display text is duplicated.', normalization },
  { id: 'todo-dom-blank-toggle-return', path: blankPath('todo-dom-blank-toggle-return'), kind: 'code' as const, prompt: 'Complete the matching branch: task.id === id ? { ...task, done: !task.done } : ____;', acceptedAnswers: ['task'], explanation: 'The map must preserve every nonmatching task unchanged.', normalization: codeNormalization },
];

const assessmentQuestions = domQuestions;

const challenges = [
  {
    id: 'todo-dom-apply', path: challengePath('todo-dom-apply'), title: 'Apply: validate and add tasks', order: 1,
    objective: 'Complete a small Todo add flow that rejects whitespace, trims accepted text, preserves literal input, and supports multiple tasks.',
    starterFiles: guidedOneStarter,
    instructions: ['Start from the provided scaffold and TODO functions.', 'Implement the add path with form submit handling, trim validation, fresh ids, input clearing after success, and DOM creation with textContent.', 'Keep the required selectors and classes exactly as supplied, then run the listed behavior checks.'],
    examples: ['Submitting "  Plan lunch  " creates one label reading "Plan lunch" and clears the input.', 'Submitting "   " creates no row and leaves the input unchanged.', 'Submitting "<b>literal</b>" displays those characters as text.'],
    behaviorValidation: { observable: 'A user can add several safe, trimmed task rows through #todo-form.', checks: ['Initial #task-count is 0 of 0 complete.', 'Whitespace-only input is blocked.', 'Accepted text is trimmed and the input clears.', 'Two accepted submissions create two li rows, including identical labels.', 'Each row contains .task-label and learner text is literal via textContent.', 'The required form, input, list, and count selectors remain present.'] },
    hints: ['First make addTask return the unchanged array for an empty trimmed value.', 'Compare the returned array identity before clearing the input.', 'Create the span and assign textContent rather than interpolating input into HTML.'],
    reference: ['todo-dom-planning-stack-setup', 'todo-dom-guided-add'], referenceSolution: guidedOneReference,
  },
  {
    id: 'todo-dom-debug', path: challengePath('todo-dom-debug'), title: 'Debug: fix toggle without breaking CRUD', order: 2,
    objective: 'Find and fix the stable-id type bug in a working Todo program while preserving add, delete, literal labels, and count behavior.',
    starterFiles: debugStarter,
    instructions: ['Run the supplied program and test add, toggle, delete, duplicate labels, and the count before editing.', 'Trace the id passed from the checkbox into toggleTask and correct the one comparison that prevents a match.', 'Retest every existing behavior after the smallest fix; preserve the starter’s add and delete paths and required DOM contract.'],
    examples: ['With tasks Alpha and Beta, checking Alpha changes the count to 1 of 2 complete and leaves Beta incomplete.', 'Deleting Alpha leaves Beta; adding another Beta keeps two distinct rows.', 'A label containing "<i>text</i>" remains literal text.'],
    behaviorValidation: { observable: 'The corrected program toggles exactly the selected stable task while all other CRUD behavior remains intact.', checks: ['Add accepts trimmed values and blocks whitespace.', 'Toggle changes only the selected row and updates #task-count.', 'Delete removes only the selected id, including with duplicate labels.', 'Initial and post-delete-empty count read 0 of 0 complete.', 'Rows contain .task-label, input[type=checkbox], and button.delete-task.', 'Markup-looking input is rendered as literal text.'] },
    hints: ['Inspect typeof task.id and typeof id before changing the algorithm.', 'Strict equality requires the same value type as well as the same value.', 'After fixing toggle, rerun add and delete checks to guard against an accidental shared-state edit.'],
    reference: ['todo-dom-state-render', 'todo-dom-guided-render', 'todo-dom-debug-independence'], referenceSolution: guidedTwoReference,
  },
  {
    id: 'todo-dom-combine', path: challengePath('todo-dom-combine'), title: 'Combine: independently implement Todo CRUD', order: 3,
    objective: 'Build the complete in-memory Todo interaction from the contract, combining validated add, stable-id toggle/delete, safe rendering, and a derived count.',
    starterFiles: combineStarter,
    instructions: ['Read the required DOM contract and the starter’s add implementation before making a plan.', 'Implement toggleTask and deleteTask, then build every row with the required checkbox, .task-label, and .delete-task controls.', 'Wire each action to the task id, derive the count on every render, and test duplicate labels, the empty state, and literal input.', 'Keep this independent workspace separate from guided files and do not add storage, filters, or async behavior.'],
    examples: ['After adding Write tests and Read docs, checking Write tests yields 1 of 2 complete.', 'If both rows say Read docs, deleting the first leaves one row; the second keeps its own done state.', 'After deleting all rows the list is empty and the count reads 0 of 0 complete.'],
    behaviorValidation: { observable: 'A fresh workspace implements complete deterministic in-memory CRUD against the required Todo DOM contract.', checks: ['Required form#todo-form, input#task-input, ul#task-list, and p#task-count exist.', 'Initial count is 0 of 0 complete.', 'Valid adds trim, clear input, preserve duplicates, and create stable per-row controls.', 'Whitespace is rejected and task labels use textContent literal rendering.', 'Toggle and delete affect only the requested stable task id.', 'Count always follows done flags, including after toggle and delete.'] },
    hints: ['Keep one tasks array and make each event update it before calling render.', 'Use map for a matching toggle and filter for a matching delete.', 'Build controls from task records; never identify a row by its label text.'],
    reference: ['todo-dom-planning-stack-setup', 'todo-dom-guided-add', 'todo-dom-state-render', 'todo-dom-guided-render'], referenceSolution: combineReference,
  },
];

export const domTodoTopic: Topic = {
  id: topicId,
  path: topicPath,
  projectId,
  title: 'DOM events and task state',
  order: 1,
  status: 'published',
  summary: 'Connect a small Todo DOM contract to in-memory task state, validated add, stable-id toggle and delete actions, safe rendering, and a derived completion count.',
  prerequisiteTopicIds: [],
  activities,
  blanks,
  assessmentQuestions,
  challenges,
  gate: { type: 'topic-gate', guidedActivityIds: ['todo-dom-guided-add', 'todo-dom-guided-render'], requiredChallengeIds: ['todo-dom-apply', 'todo-dom-debug', 'todo-dom-combine'], minimumDistinctCorrectQuestionIds: 10, revealedAnswerEarnsCredit: false, requiresFreshEquivalentAfterReveal: true, wrongAnswerResetsProgress: false, retryPolicy: 'exhaust-unseen-before-missed' },
};

export default domTodoTopic;


