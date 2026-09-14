import { expect, test, type Page } from '@playwright/test';
import type { Files } from '../../src/contracts';
import { reactReferenceByTopic, reactStarter } from '../../src/content/reactReferences';

const graderModule = '/src/lesson/grader.ts';
const topics = Object.keys(reactReferenceByTopic);
const suffixes = ['guided-1', 'guided-2', 'apply', 'debug', 'combine'] as const;

async function grade(page: Page, files: Files, assessmentId: string) {
  return page.evaluate(async ({ files, assessmentId, graderModule }) => {
    const { createChallengeGrader } = await import(graderModule);
    const container = document.createElement('div'); container.className = 'grading-sandbox'; container.setAttribute('aria-hidden', 'true'); document.body.append(container);
    const grader = createChallengeGrader(container, () => {});
    try { return await grader.grade(files, assessmentId); }
    finally { grader.dispose(); container.remove(); }
  }, { files, assessmentId, graderModule });
}

function replace(files: Files, file: string, from: string, to: string): Files {
  const next = { ...files, [file]: files[file].replace(from, to) };
  if (next[file] === files[file]) throw new Error('Missing React matrix mutation anchor: ' + from);
  return next;
}

test.describe('Phase 5 React dashboard behavioral matrix', () => {
  test.setTimeout(300_000);
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('all six React topics accept references and reject actual unfinished starters', async ({ page }) => {
    for (const topic of topics) for (const suffix of suffixes) {
      const id = `${topic}-${suffix}`;
      await expect.soft(grade(page, reactReferenceByTopic[topic], id), id).resolves.toMatchObject({ assessmentId: id, passed: true });
      const kind = suffix === 'guided-1' || suffix === 'apply' ? 'apply' : suffix === 'guided-2' || suffix === 'debug' ? 'debug' : 'combine';
      await expect.soft(grade(page, reactStarter(topic, kind), id), id + ' starter').resolves.toMatchObject({ assessmentId: id, passed: false });
    }
  });

  test('observed regressions fail without relying on source matching', async ({ page }) => {
    const refs = reactReferenceByTopic;
    const mutations: Array<[string, string, Files]> = [
      ['scope removes state ownership', 'react-dashboard-scope-and-component-map', replace(refs['react-dashboard-scope-and-component-map'], 'index.html', 'App owns tasks', 'App displays tasks')],
      ['setup stops mounting React', 'react-stack-and-project-setup', replace(refs['react-stack-and-project-setup'], 'main.jsx', 'createRoot(document.querySelector(\'#root\')).render(<App />);', 'document.querySelector(\'#root\').textContent = \'not mounted\';')],
      ['layout loses the input label link', 'react-components-props-and-layout', replace(refs['react-components-props-and-layout'], 'App.jsx', 'htmlFor="task-input"', 'htmlFor="wrong"')],
      ['state toggles every task', 'react-task-state-and-interactions', replace(refs['react-task-state-and-interactions'], 'App.jsx', 'task.id === id ? { ...task, done: !task.done } : task', '{ ...task, done: !task.done }')],
      ['effects omit cancellation', 'react-effects-persistence-and-errors', replace(refs['react-effects-persistence-and-errors'], 'App.jsx', 'return () => { controller.abort(); };', 'return () => {};')],
      ['effects silently overwrite corrupt storage', 'react-effects-persistence-and-errors', replace(refs['react-effects-persistence-and-errors'], 'App.jsx', "setFault(true); setSaveStatus('Saved tasks are unavailable. Recover explicitly to start empty.');", "setFault(false); setSaveStatus('Saved locally.');")],
      ['smoke only prints pass', 'react-testing-and-export', replace(refs['react-testing-and-export'], 'App.jsx', "setTasks([{ id: 'smoke', text: 'Smoke task', done: false }]);", "setSmokeStatus('Smoke test passed.'); return;")],
    ];
    for (const [name, topic, files] of mutations) expect((await grade(page, files, `${topic}-combine`)).passed, name).toBe(false);
  });
});
