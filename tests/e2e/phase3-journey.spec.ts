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
test('finish six new topics through the UI with mid-course resume and preserved pilot work', async ({ page }) => {
  test.setTimeout(360_000);
  const pilot = curriculum.topics[0];
  let seed = initializeProjectWorkspace(createInitialSession(), pilot.projectId, { ...pilot.activities.find(a => a.referenceSolution)!.referenceSolution!, 'notes.txt': 'Preserve my project notes' });
  seed.workspaces.vanilla.files['main.js'] = '// keep old demo';
  for (const activity of pilot.activities) seed = completeActivity(seed, pilot.id, activity.id);
  for (const blank of pilot.blanks) seed = recordBlankAttempt(seed, pilot, blank, blank.acceptedAnswers[0]).session;
  for (const question of pilot.assessmentQuestions.slice(0, 10)) seed = submitQuestionAnswer(seed, pilot, question, question.acceptedAnswers[0]).session;
  for (const challenge of pilot.challenges) seed = recordChallengeResult(seed, pilot.id, challenge.id, true);
  seed = setLearningLocation(seed, { view: 'dashboard' });
  await page.addInitScript(seed => { if (!sessionStorage.getItem('phase3-seed')) { localStorage.setItem('project-code.session.v1', JSON.stringify(seed)); sessionStorage.setItem('phase3-seed', 'yes'); } }, seed);
  await page.goto('/');
  for (const topic of curriculum.topics.slice(1, 7)) {
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
    const projectFiles = mastered.learning.projectWorkspaces['vanilla-todo'].files;
    expect(projectFiles['notes.txt']).toBe('Preserve my project notes');
    await page.locator('#next-step').click();
    for (const challenge of topic.challenges) {
      await editFiles(page, challenge.referenceSolution!); await page.locator('#check-challenge').click(); await expect(page.locator('#lesson-feedback')).toContainText('All required behavior checks passed');
      if (challenge.order !== 3) await page.locator('#next-step').click();
    }
    await expect(page.locator('#topic-complete')).toBeVisible();
    const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('project-code.session.v1')!));
    expect(completed.learning.projectWorkspaces['vanilla-todo'].files).toEqual(projectFiles);
    expect(completed.workspaces.vanilla.files['main.js']).toBe('// keep old demo');
    await page.locator('#dashboard-nav').click();
  }
  const weather = curriculum.topics[7]; await expect(page.locator(`[data-topic="${weather.id}"]`)).toContainText('Available');
  await page.screenshot({ path: 'test-results/phase3-dashboard.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-open-topic="todo-testing-and-export"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/phase3-mobile.png', fullPage: true });
});
