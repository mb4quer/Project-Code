import { expect, test, type Page } from '@playwright/test';
import type { Files } from '../../src/contracts';

type Fixture = { id: string; starterFiles: Files; referenceSolution: Files };

async function fixtures(page: Page): Promise<{ guided: Fixture[]; challenges: Fixture[] }> {
  return page.evaluate(async () => {
    const moduleUrl = '/src/content/domTodo.ts';
    const { domTodoTopic } = await import(moduleUrl);
    return {
      guided: domTodoTopic.activities.filter((activity: { kind: string }) => activity.kind === 'guided-coding').map((activity: { id: string; starterFiles?: Files; referenceSolution?: Files }) => ({ id: activity.id, starterFiles: activity.starterFiles!, referenceSolution: activity.referenceSolution! })),
      challenges: domTodoTopic.challenges.map((challenge: { id: string; starterFiles: Files; referenceSolution?: Files }) => ({ id: challenge.id, starterFiles: challenge.starterFiles, referenceSolution: challenge.referenceSolution! })),
    };
  });
}

async function grade(page: Page, files: Files, assessmentId: string) {
  return page.evaluate(async ({ files, assessmentId }) => {
    const graderUrl = '/src/lesson/grader.ts';
    const { createChallengeGrader } = await import(graderUrl);
    const container = document.createElement('div');
    container.hidden = true; document.body.append(container);
    const grader = createChallengeGrader(container, () => {});
    try { return await grader.grade(files, assessmentId); }
    finally { grader.dispose(); container.remove(); }
  }, { files, assessmentId });
}

const change = (files: Files, file: string, from: string, to: string): Files => {
  const next = { ...files, [file]: files[file].replace(from, to) };
  if (next[file] === files[file]) throw new Error(`Test fixture did not contain expected source in ${file}.`);
  return next;
};

test.describe('behavioral Todo grader matrix', () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('accepted guided and challenge reference solutions pass their matching behavior checks', async ({ page }) => {
    const source = await fixtures(page);
    for (const fixture of [...source.guided, ...source.challenges]) {
      const result = await grade(page, fixture.referenceSolution, fixture.id);
      expect(result, fixture.id).toMatchObject({ assessmentId: fixture.id, passed: true });
      expect(result.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
    }
  });

  test('unfinished guided and challenge starters fail behavior checks', async ({ page }) => {
    const source = await fixtures(page);
    for (const fixture of [...source.guided, ...source.challenges]) {
      const result = await grade(page, fixture.starterFiles, fixture.id);
      expect(result, fixture.id).toMatchObject({ assessmentId: fixture.id, passed: false });
      expect(result.checks.some((check: { passed: boolean }) => !check.passed)).toBe(true);
    }
  });

  test('rejects representative incorrect implementations by observed behavior rather than source shape', async ({ page }) => {
    const source = await fixtures(page);
    const full = source.challenges.find(item => item.id === 'todo-dom-combine')!.referenceSolution;
    const mutants: Array<[string, Files]> = [
      ['does not trim', change(full, 'model.js', 'const text = rawText.trim();', 'const text = rawText;')],
      ['accepts blank input', change(full, 'model.js', 'if (!text) return tasks;', 'if (false) return tasks;')],
      ['parses labels as HTML', change(full, 'main.js', 'label.textContent = task.text;', 'label.innerHTML = task.text;')],
      ['does not clear input', change(full, 'main.js', "if (nextTasks !== tasks) input.value = '';", "if (false) input.value = '';" )],
      ['toggles every row', change(full, 'model.js', 'return tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);', 'return tasks.map(task => ({ ...task, done: !task.done }));')],
      ['deletes duplicate labels together', change(full, 'model.js', 'return tasks.filter(task => task.id !== id);', 'return tasks.filter(task => task.text !== tasks.find(item => item.id === id).text);')],
      ['keeps a stale count', change(full, 'main.js', "count.textContent = complete + ' of ' + tasks.length + ' complete';", "count.textContent = '0 of 0 complete';")],
      ['adds a second submit handler', { ...full, 'main.js': `${full['main.js']}\nform.addEventListener('submit', () => list.append(document.createElement('li')));` }],
    ];
    for (const [name, files] of mutants) {
      const result = await grade(page, files, 'todo-dom-combine');
      expect(result.passed, name).toBe(false);
    }
  });

  test('rejects compile failures and loop-guarded nonterminating programs without accepting them', async ({ page }) => {
    const source = await fixtures(page);
    const full = source.challenges.find(item => item.id === 'todo-dom-combine')!.referenceSolution;
    await expect(grade(page, { ...full, 'main.js': 'const broken = ;' }, 'todo-dom-combine')).rejects.toThrow();
    expect((await grade(page, { ...full, 'main.js': 'while (true) {}' }, 'todo-dom-combine')).passed).toBe(false);
  });
});
