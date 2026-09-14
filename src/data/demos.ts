import type { DemoId, Files, Session, Workspace } from '../contracts';

export interface Demo {
  title: string;
  description: string;
  files: Files;
}

export const demos: Record<DemoId, Demo> = {
  vanilla: {
    title: 'Vanilla Todo list',
    description: 'A small Todo app built with the DOM, ES modules, and a local SVG asset.',
    files: {
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Todo list</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="app">
      <img class="mark" src="./assets/mark.svg" alt="" />
      <h1>Todo list</h1>
      <form id="todo-form">
        <label for="todo-input">New task</label>
        <div>
          <input id="todo-input" type="text" required autocomplete="off" />
          <button>Add</button>
        </div>
      </form>
      <ul id="todo-list" aria-live="polite"></ul>
    </main>
    <script type="module" src="./main.js"></script>
  </body>
</html>`,
      'styles.css': `:root {
  font-family: system-ui, sans-serif;
  color: #172033;
  background: #f5f7fb;
}

body {
  margin: 0;
}

.app {
  max-width: 34rem;
  margin: 24px 16px;
  padding: 20px;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 10px 30px #17203318;
}

.mark {
  float: right;
  width: 2.5rem;
}

form div {
  display: flex;
  gap: .5rem;
}

input[type="text"],
input:not([type]) {
  flex: 1;
  min-width: 0;
  padding: .55rem;
}

button {
  padding: .55rem .8rem;
}

ul {
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .6rem 0;
  border-bottom: 1px solid #e6e9f0;
}

li input[type="checkbox"] {
  flex: none;
}

li span {
  flex: 1;
  min-width: 0;
}

li.done span {
  color: #667085;
  text-decoration: line-through;
}`,
      'model.js': `let nextId = 3;

export function createTodo(text) {
  return { id: nextId++, text: text.trim(), done: false };
}

export function toggleTodo(todos, id) {
  return todos.map(todo =>
    todo.id === id ? { ...todo, done: !todo.done } : todo,
  );
}

export function removeTodo(todos, id) {
  return todos.filter(todo => todo.id !== id);
}`,
      'main.js': `import { createTodo, removeTodo, toggleTodo } from './model.js';

const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const list = document.querySelector('#todo-list');
console.info('Vanilla Todo demo mounted');
let todos = [
  { id: 1, text: 'Inspect the model module', done: true },
  { id: 2, text: 'Add a task of your own', done: false },
];

function render() {
  list.replaceChildren(...todos.map(todo => {
    const item = document.createElement('li');
    item.className = todo.done ? 'done' : '';
    const done = document.createElement('input');
    done.type = 'checkbox';
    done.checked = todo.done;
    done.setAttribute('aria-label', 'Mark ' + todo.text + ' complete');
    done.addEventListener('change', () => {
      todos = toggleTodo(todos, todo.id);
      render();
    });
    const label = document.createElement('span');
    label.textContent = todo.text;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      todos = removeTodo(todos, todo.id);
      render();
    });
    item.append(done, label, remove);
    return item;
  }));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const todo = createTodo(input.value);
  if (!todo.text) return;
  todos = [...todos, todo];
  input.value = '';
  render();
});
render();`,
      'assets/mark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img"><path fill="#5b5bd6" d="M32 3 59 18v28L32 61 5 46V18z"/><path fill="#fff" d="m18 32 9 9 19-20 4 4-23 24-13-13z"/></svg>`,
    },
  },
  react: {
    title: 'React task counter',
    description: 'A stateful React task list with components and JSX.',
    files: {
      'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React tasks</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.jsx"></script>
  </body>
</html>`,
      'styles.css': `:root {
  font-family: system-ui, sans-serif;
  color: #172033;
}

body {
  margin: 0;
  background: #f5f7fb;
}

main {
  max-width: 34rem;
  margin: 24px 16px;
  padding: 20px;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 10px 30px #17203318;
}

form {
  display: flex;
  gap: .5rem;
}

input {
  flex: 1;
  min-width: 0;
  padding: .55rem;
}

button {
  padding: .55rem .8rem;
}

li {
  margin: .65rem 0;
}

li input[type="checkbox"] {
  flex: none;
}

.done {
  color: #667085;
  text-decoration: line-through;
}`,
      'main.jsx': `import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.querySelector('#root')).render(<App />);`,
      'App.jsx': `import { useEffect, useState } from 'react';

export default function App() {
  useEffect(() => {
    console.info('React task demo mounted');
  }, []);
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Learn state', done: true },
    { id: 2, text: 'Finish this demo', done: false },
  ]);
  const [text, setText] = useState('');
  const completed = tasks.filter(task => task.done).length;
  function addTask(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setTasks([...tasks, { id: Date.now(), text: value, done: false }]);
    setText('');
  }

  function toggleTask(id) {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, done: !task.done } : task,
    ));
  }

  return (
    <main>
      <h1>React tasks</h1>
      <p>{completed} of {tasks.length} complete</p>
      <form onSubmit={addTask}>
        <input
          aria-label="New task"
          value={text}
          onChange={event => setText(event.target.value)}
        />
        <button>Add</button>
      </form>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <label className={task.done ? 'done' : ''}>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
              />
              {' '}{task.text}
            </label>
          </li>
        ))}
      </ul>
    </main>
  );
}`,
    },
  },
};

function copyFiles(files: Files): Files {
  return { ...files };
}

function initialWorkspace(id: DemoId): Workspace {
  const files = copyFiles(demos[id].files);
  return {
    id,
    files,
    activeFile: id === 'vanilla' ? 'main.js' : 'App.jsx',
    version: 1,
    updatedAt: new Date().toISOString(),
    checkpoint: { files: copyFiles(files), createdAt: new Date().toISOString() },
  };
}

/** Creates the versioned local-only workspace and learning-progress envelope. */
export function createInitialSession(): Session {
  return {
    schemaVersion: 1,
    revision: 0,
    writerId: 'initial-session',
    currentWorkspace: 'vanilla',
    workspaces: { vanilla: initialWorkspace('vanilla'), react: initialWorkspace('react') },
    location: { projectId: 'runtime-lab', topicId: 'starter-demos', activityId: 'vanilla-todo' },
    progress: { attempts: {}, creditedQuestionIds: {}, challengeResults: {}, completedActivityIds: [], completedMilestoneIds: [] },
    learning: { version: 1, location: { view: 'lab' }, topics: {}, projectWorkspaces: {}, challengeWorkspaces: {} },
  };
}
