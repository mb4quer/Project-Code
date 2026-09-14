import { test, expect, type Page } from '@playwright/test';
import { curriculum } from '../../src/content/curriculum';
import { createInitialSession } from '../../src/data/demos';
import { completeActivity, initializeProjectWorkspace, recordBlankAttempt, recordChallengeResult, submitQuestionAnswer, setLearningLocation } from '../../src/lesson/engine';
import type { Files } from '../../src/contracts';

async function editFiles(page: Page, files: Files) {
  for (const [name, value] of Object.entries(files)) {
    const button = page.locator('#file-tree').getByRole('button', { name, exact: true });
    if (!(await button.count())) { await page.locator('#add-file').click(); await page.locator('#new-file-name').fill(name); await page.locator('#dialog-confirm').click(); }
    else await button.click();
    await page.locator('#code').fill(value);
  }
}
test('finish all six React topics with resume, retired questions and prior projects preserved', async ({ page }) => {
  test.setTimeout(600_000);
  let seed = createInitialSession();
  for (const topic of curriculum.topics.slice(0, 15)) {
    seed = initializeProjectWorkspace(seed, topic.projectId, { 'index.html': 'Preserve finished Todo', 'notes.txt': 'Todo notes' });
    for (const activity of topic.activities) seed = completeActivity(seed, topic.id, activity.id);
    for (const blank of topic.blanks) seed = recordBlankAttempt(seed, topic, blank, blank.acceptedAnswers[0]).session;
    for (const question of topic.assessmentQuestions.slice(0, 10)) seed = submitQuestionAnswer(seed, topic, question, question.acceptedAnswers[0]).session;
    for (const challenge of topic.challenges) seed = recordChallengeResult(seed, topic.id, challenge.id, true);
  }
  seed.workspaces.vanilla.files['main.js'] = '// keep old demo';
  seed.learning!.projectWorkspaces['vanilla-todo'].trainingData = { tasks: 'Old Todo data' };
  seed.learning!.projectWorkspaces['async-weather'].trainingData = { notes: 'Weather fixture project data' };
  for (const workspace of Object.values(seed.learning!.projectWorkspaces)) workspace.checkpoint = { files: { 'notes.txt': 'Keep checkpoint' }, createdAt: '2026-09-14T00:00:00Z' };
  const previousTodo = structuredClone(seed.learning!.projectWorkspaces['vanilla-todo']);
  const previousWeather = structuredClone(seed.learning!.projectWorkspaces['async-weather']);
  const previousMastery = structuredClone(seed.learning!.topics);
  seed = initializeProjectWorkspace(seed, 'react-task-dashboard', { ...curriculum.topics[15].activities.find(a => a.starterFiles)!.starterFiles!, 'notes.txt': 'Preserve my project notes' });
  seed = setLearningLocation(seed, { view: 'dashboard' });
  await page.addInitScript(seed => { if (!sessionStorage.getItem('phase5-seed')) { localStorage.setItem('project-code.session.v1', JSON.stringify(seed)); sessionStorage.setItem('phase5-seed', 'yes'); } }, seed);
  await page.goto('/');
  for (const topic of curriculum.topics.slice(15, 21)) {
    await page.locator(`[data-open-topic="${topic.id}"]`).click();
    for (const activity of topic.activities) {
      await expect(page.locator('#lesson-step')).toHaveValue(activity.id);
      if (activity.kind === 'reading') await page.locator('#complete-reading').click();
      else { await editFiles(page, activity.referenceSolution!); await page.locator('#check-activity').click(); await expect(page.locator('#lesson-feedback')).toContainText('All required behavior checks passed'); }
      await page.locator('#next-step').click();
    }
    for (const blank of topic.blanks) { await page.locator(`#${blank.id}`).fill(blank.acceptedAnswers[0]); await page.locator(`[data-blank="${blank.id}"] button`).click(); }
    await page.locator('#next-step').click();
    const retired = await page.locator('#question-form').getAttribute('data-question-id'); await page.locator('#reveal-answer').click();
    for (let credit = 0; credit < 10; credit++) {
      if (credit === 5) { await page.reload(); await expect(page.locator('#mastery-progress')).toContainText('5 / 10'); await expect(page.locator('iframe')).toHaveCount(0); }
      const id = await page.locator('#question-form').getAttribute('data-question-id'); const question = topic.assessmentQuestions.find(q => q.id === id)!;
      await page.locator('#question-answer').fill(question.acceptedAnswers[0]); await page.locator('#question-form button').click();
    }
    const mastered = await page.evaluate(() => JSON.parse(localStorage.getItem('project-code.session.v1')!));
    expect(mastered.learning.topics[topic.id].creditedQuestionIds).not.toContain(retired);
    const projectFiles = mastered.learning.projectWorkspaces['react-task-dashboard'].files;
    expect(projectFiles['notes.txt']).toBe('Preserve my project notes');
    await page.locator('#next-step').click();
    for (const challenge of topic.challenges) {
      await editFiles(page, challenge.referenceSolution!); await page.locator('#check-challenge').click(); await expect(page.locator('#lesson-feedback')).toContainText('All required behavior checks passed');
      if (challenge.order !== 3) await page.locator('#next-step').click();
    }
    await expect(page.locator('#topic-complete')).toBeVisible();
    const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('project-code.session.v1')!));
    expect(completed.learning.projectWorkspaces['react-task-dashboard'].files).toEqual(projectFiles);
    expect(completed.workspaces.vanilla.files['main.js']).toBe('// keep old demo');
    expect(completed.learning.projectWorkspaces['vanilla-todo']).toEqual(previousTodo);
    expect(completed.learning.projectWorkspaces['async-weather']).toEqual(previousWeather);
    for (const [id, progress] of Object.entries(previousMastery)) expect(completed.learning.topics[id]).toEqual(progress);
    await page.locator('#dashboard-nav').click();
  }
  const weather = curriculum.topics[21]; await expect(page.locator(`[data-topic="${weather.id}"]`)).toContainText('Unlocked');
  await page.screenshot({ path: 'test-results/phase5-dashboard.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-open-topic="react-testing-and-export"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/phase5-mobile.png', fullPage: true });
});

