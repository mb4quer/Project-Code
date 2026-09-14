import { expect, test, type Page } from '@playwright/test';
import type { Files } from '../../src/contracts';

type Fixture = { id: string; starterFiles: Files; referenceSolution: Files };

async function fixtures(page: Page): Promise<Fixture[]> {
  return page.evaluate(async () => {
    const moduleUrl = '/src/content/todoPhase3.ts';
    const { todoPhase3Topics } = await import(moduleUrl);
    return todoPhase3Topics.flatMap((topic: { activities: Array<{ kind: string; id: string; starterFiles?: Files; referenceSolution?: Files }>; challenges: Array<{ id: string; starterFiles: Files; referenceSolution?: Files }> }) => [
      ...topic.activities.filter(activity => activity.kind === 'guided-coding').map(activity => ({ id: activity.id, starterFiles: activity.starterFiles!, referenceSolution: activity.referenceSolution! })),
      ...topic.challenges.map(challenge => ({ id: challenge.id, starterFiles: challenge.starterFiles, referenceSolution: challenge.referenceSolution! })),
    ]);
  });
}

async function grade(page: Page, files: Files, assessmentId: string) {
  return page.evaluate(async ({ files, assessmentId }) => {
    const moduleUrl = '/src/lesson/grader.ts';
    const { createChallengeGrader } = await import(moduleUrl);
    const container = document.createElement('div'); container.hidden = true; document.body.append(container);
    const grader = createChallengeGrader(container, () => {});
    try { return await grader.grade(files, assessmentId); }
    finally { grader.dispose(); container.remove(); }
  }, { files, assessmentId });
}

const replace = (files: Files, file: string, from: string, to: string): Files => {
  const next = { ...files, [file]: files[file].replace(from, to) };
  if (next[file] === files[file]) throw new Error(`Expected a mutation anchor in ${file}.`);
  return next;
};

test.describe('Phase 3 Todo behavioral matrix', () => {
  test.setTimeout(240_000);
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('all six topics have passing guided and challenge references, while their starters remain unfinished', async ({ page }) => {
    const entries = await fixtures(page);
    expect(entries).toHaveLength(30);
    for (const entry of entries) {
      const reference = await grade(page, entry.referenceSolution, entry.id);
      expect(reference, entry.id).toMatchObject({ assessmentId: entry.id, passed: true });
      const starter = await grade(page, entry.starterFiles, entry.id);
      expect(starter, entry.id).toMatchObject({ assessmentId: entry.id, passed: false });
    }
  });

  test('representative mutants fail their matching observable contracts', async ({ page }) => {
    const entries = await fixtures(page);
    const byId = (id: string) => entries.find(entry => entry.id === id)!;
    const scope = byId('todo-scope-and-user-flows-combine').referenceSolution;
    const stack = byId('todo-web-stack-and-file-plan-combine').referenceSolution;
    const layout = byId('todo-setup-and-static-layout-combine').referenceSolution;
    const filter = byId('todo-filter-empty-and-input-errors-combine').referenceSolution;
    const storage = byId('todo-storage-and-recovery-combine').referenceSolution;
    const exported = byId('todo-testing-and-export-combine').referenceSolution;
    const mutants: Array<[string, string, Files]> = [
      ['scope omits failure flows', 'todo-scope-and-user-flows-combine', replace(scope, 'index.html', 'empty, invalid-input, and filtered results.', 'only normal results.')],
      ['file plan loses model boundary', 'todo-web-stack-and-file-plan-combine', replace(stack, 'index.html', 'model.js: task data operations', 'data.js: task data operations')],
      ['layout changes required list selector', 'todo-setup-and-static-layout-combine', replace(layout, 'index.html', 'id="task-list"', 'id="tasks"')],
      ['filter destroys hidden records', 'todo-filter-empty-and-input-errors-combine', replace(filter, 'main.js', "const shown = filteredTasks(tasks, filter);", "const shown = tasks = filteredTasks(tasks, filter);")],
      ['storage ignores failed writes', 'todo-storage-and-recovery-combine', replace(storage, 'main.js', "status.textContent = 'Could not save tasks. Your current list is still visible.';", "status.textContent = 'Saved tasks.';")],
      ['storage accepts duplicate restored ids', 'todo-storage-and-recovery-combine', replace(storage, 'model.js', 'new Set(value.map(task => task.id)).size === value.length', 'true')],
      ['hardcoded smoke pass cannot hide a broken add', 'todo-testing-and-export-combine', replace(exported, 'main.js', 'const next = addTask(tasks, input.value);', 'const next = tasks;')],
      ['smoke only prints pass despite a working app', 'todo-testing-and-export-combine', { ...exported, 'main.js': exported['main.js'].replace(/testButton\.addEventListener\('click', async \(\) => \{[\s\S]*?exportButton\.addEventListener/, "testButton.addEventListener('click', () => { results.textContent = 'Smoke test passed'; }); exportButton.addEventListener") }],
      ['export omits the server requirement', 'todo-testing-and-export-combine', replace(exported, 'main.js', 'serve the folder with a local static server for module loading.', 'open the folder directly.')],
    ];
    for (const [name, id, files] of mutants) expect((await grade(page, files, id)).passed, name).toBe(false);
  });

  test('first increments pass without later features while full checks require the extension', async ({ page }) => {
    const entries = await fixtures(page);
    const reference = (id: string) => entries.find(entry => entry.id === id + '-combine')!.referenceSolution;
    const scopeId = 'todo-scope-and-user-flows', stackId = 'todo-web-stack-and-file-plan', layoutId = 'todo-setup-and-static-layout', filterId = 'todo-filter-empty-and-input-errors', testId = 'todo-testing-and-export';
    const testing = reference(testId);
    const partials: Array<[string, Files]> = [
      [scopeId, replace(reference(scopeId), 'index.html', 'empty, invalid-input, and filtered results.', 'normal results.')],
      [stackId, replace(reference(stackId), 'index.html', 'model.js: task data operations', 'model.js: visual styles')],
      [layoutId, replace(reference(layoutId), 'index.html', 'for="task-input"', 'for="wrong-input"')],
      [filterId, replace(reference(filterId), 'main.js', 'filter = button.dataset.filter;', "filter = button.dataset.filter === 'completed' ? 'active' : button.dataset.filter;")],
      [testId, { ...testing, 'index.html': testing['index.html'].replace('<button type="button" id="prepare-export">Prepare export</button>', '').replace('<p id="export-status" aria-live="polite"></p>', ''), 'main.js': testing['main.js'].split("exportButton.addEventListener")[0] }],
    ];
    for (const [id, files] of partials) {
      expect((await grade(page, files, id + '-guided-1')).passed, id + ' basic').toBe(true);
      expect((await grade(page, files, id + '-combine')).passed, id + ' complete').toBe(false);
    }
  });

  test('compile errors and loop-guarded programs never produce Phase 3 credit', async ({ page }) => {
    const entry = (await fixtures(page)).find(item => item.id === 'todo-filter-empty-and-input-errors-combine')!;
    await expect(grade(page, { ...entry.referenceSolution, 'main.js': 'const broken = ;' }, entry.id)).rejects.toThrow();
    expect((await grade(page, { ...entry.referenceSolution, 'main.js': 'while (true) {}' }, entry.id)).passed).toBe(false);
  });
});
