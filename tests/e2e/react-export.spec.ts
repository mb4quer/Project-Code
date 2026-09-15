import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { testFiles } from '../../src/content/reactReferences';
import { curriculum } from '../../src/content/curriculum';
import { createInitialSession } from '../../src/data/demos';
import { completeActivity, initializeProjectWorkspace, recordBlankAttempt, recordChallengeResult, setLearningLocation, submitQuestionAnswer } from '../../src/lesson/engine';

function unzip(bytes: Buffer): Record<string, string> {
  const files: Record<string, string> = {}; let pos = 0;
  while (bytes.readUInt32LE(pos) === 0x04034b50) { const size = bytes.readUInt32LE(pos + 18), nameLength = bytes.readUInt16LE(pos + 26), extraLength = bytes.readUInt16LE(pos + 28), name = bytes.subarray(pos + 30, pos + 30 + nameLength).toString(), start = pos + 30 + nameLength + extraLength; files[name] = bytes.subarray(start, start + size).toString(); pos = start + size; }
  return files;
}

test('React dashboard ZIP preserves source, runs independently, persists, and keeps smoke cleanup repeatable', async ({ page, context }) => {
  test.setTimeout(90_000);
  let seed = initializeProjectWorkspace(createInitialSession(), 'react-task-dashboard', { ...testFiles, 'notes.txt': 'Keep this React export note' });
  for (const topic of curriculum.topics.filter(topic => topic.projectId !== 'react-task-dashboard')) {
    for (const activity of topic.activities) seed = completeActivity(seed, topic.id, activity.id);
    for (const blank of topic.blanks) seed = recordBlankAttempt(seed, topic, blank, blank.acceptedAnswers[0]).session;
    for (const question of topic.assessmentQuestions.slice(0, 10)) seed = submitQuestionAnswer(seed, topic, question, question.acceptedAnswers[0]).session;
    for (const challenge of topic.challenges) seed = recordChallengeResult(seed, topic.id, challenge.id, true);
  }
  seed.learning!.projectWorkspaces['react-task-dashboard'].checkpoint = { files: { ...testFiles, 'notes.txt': 'Checkpoint stays in the course session' }, createdAt: 'test' };
  seed = setLearningLocation(seed, { view: 'topic', projectId: 'react-task-dashboard', topicId: 'react-testing-and-export', stepId: 'react-testing-and-export-guided-2' });
  await page.addInitScript(seed => { if (!sessionStorage.getItem('react-export-seed')) { localStorage.setItem('project-code.session.v1', JSON.stringify(seed)); sessionStorage.setItem('react-export-seed', 'yes'); } }, seed);
  await page.goto('/');
  const downloadReady = page.waitForEvent('download'); await page.locator('#export-project').click(); const download = await downloadReady;
  await download.saveAs('test-results/react-dashboard.zip');
  const files = unzip(await readFile((await download.path())!));
  for (const [name, source] of Object.entries(testFiles)) expect(files['source/' + name]).toBe(source);
  expect(files['source/notes.txt']).toBe('Keep this React export note'); expect(files['index.html']).not.toContain('Checkpoint stays in the course session'); expect(files['index.html']).not.toContain('writerId');
  expect(files['README.md']).toContain('python -m http.server');
  const exported = await context.newPage(); await exported.route('http://react-export.test/**', route => route.fulfill({ contentType: 'text/html', body: files['index.html'] })); await exported.goto('http://react-export.test/');
  const input = exported.locator('#task-input'); await expect(input).toBeEnabled(); await input.fill('Exported task'); await exported.locator('form button').click(); await expect(exported.locator('#task-list')).toContainText('Exported task'); await exported.locator('#task-list input').last().check(); await expect(exported.locator('#save-status')).toContainText('Saved locally'); await exported.reload(); await expect(exported.locator('#task-list')).toContainText('Exported task');
  await exported.locator('[data-filter="completed"]').click(); await expect(exported.locator('#task-list input')).toBeChecked();
  await input.fill('Keep my unfinished input');
  const before = await exported.evaluate(() => JSON.stringify(localStorage));
  for (let attempt = 0; attempt < 2; attempt += 1) { await exported.locator('#run-react-smoke').click(); await expect(exported.locator('#react-smoke-status')).toContainText('passed'); expect(await exported.evaluate(() => JSON.stringify(localStorage))).toBe(before); await expect(input).toHaveValue('Keep my unfinished input'); await expect(exported.locator('[data-filter="completed"]')).toHaveAttribute('aria-pressed', 'true'); await expect(exported.locator('#task-list')).toContainText('Exported task'); }
  // A failed snapshot read must not remove or rewrite the user's saved record.
  await exported.evaluate(() => { const target = window as any; target.__originalTrainingStorage = target.trainingStorage; target.trainingStorage = { ...target.trainingStorage, getItem: async () => { throw new Error('Test read failure'); } }; });
  await exported.locator('#run-react-smoke').click(); await expect(exported.locator('#react-smoke-status')).toContainText('failed');
  expect(await exported.evaluate(() => JSON.stringify(localStorage))).toBe(before);
  await expect(input).toHaveValue('Keep my unfinished input');
  await exported.evaluate(() => { const target = window as any; target.trainingStorage = target.__originalTrainingStorage; });
  // Reject only a smoke write; normal cleanup must still restore the saved snapshot.
  await exported.evaluate(() => { const target = window as any; const original = target.trainingStorage; target.trainingStorage = { ...original, setItem: async (key: string, value: string) => { if (value.includes('<strong>Smoke')) throw new Error('Test write failure'); return original.setItem(key, value); } }; });
  await exported.locator('#run-react-smoke').click(); await expect(exported.locator('#react-smoke-status')).toContainText('failed');
  expect(await exported.evaluate(() => JSON.stringify(localStorage))).toBe(before);
  await exported.evaluate(() => { const target = window as any; target.trainingStorage = target.__originalTrainingStorage; });
  await expect(input).toBeEnabled();
  // Trigger smoke during an observed pending sync within the page to avoid timing sleeps.
  await exported.evaluate(async () => {
    Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Load Slow')!.click();
    while (!document.querySelector('#sync-status')?.textContent?.startsWith('Loading ')) await new Promise(resolve => setTimeout(resolve, 0));
    (document.querySelector('#run-react-smoke') as HTMLButtonElement).click();
  });
  await expect(exported.locator('#react-smoke-status')).toContainText('Wait for startup or sync');
  await expect(exported.locator('#sync-status')).toContainText('Loaded Slow');
  expect(await exported.evaluate(() => JSON.stringify(localStorage))).toBe(before);
  await exported.evaluate(() => localStorage.setItem('project-code-export.react-task-dashboard.tasks', JSON.stringify([{ id: 7, text: 'Legacy task', done: false }])));
  await exported.reload(); await expect(exported.locator('#task-list')).toContainText('Legacy task');
  await exported.evaluate(() => localStorage.setItem('project-code-export.react-task-dashboard.tasks', '{bad'));
  await exported.reload(); await expect(exported.locator('#recover-storage')).toBeVisible(); await exported.locator('#recover-storage').click(); await expect(exported.locator('#task-input')).toBeEnabled();
  await exported.setViewportSize({ width: 390, height: 844 }); expect(await exported.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await exported.screenshot({ path: 'test-results/react-export-mobile.png', fullPage: true });
});
