import { test, expect, type Page } from '@playwright/test';
import { curriculum } from '../../src/content/curriculum';
import { createInitialSession } from '../../src/data/demos';
import { ensureLearning, completeActivity, recordBlankAttempt, submitQuestionAnswer, initializeProjectWorkspace, initializeChallengeWorkspace, setLearningLocation } from '../../src/lesson/engine';
import type { Files, Session } from '../../src/contracts';

const pilot = () => curriculum.topics.find(topic => topic.status === 'published')!;
const KEY = 'project-code.session.v1';
async function saved(page: Page) { await expect(page.locator('#save-state')).toHaveText('Saved locally · this browser'); }
async function files(page: Page, source: Files) {
  for (const [name, value] of Object.entries(source)) {
    await page.locator('#file-tree').getByRole('button', { name, exact: true }).click();
    await page.locator('#code').fill(value);
  }
}
async function record(page: Page): Promise<Session> { return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY); }
function assessedSession() {
  const topic = pilot(); let value = ensureLearning(createInitialSession());
  value = initializeProjectWorkspace(value, topic.projectId, topic.activities.find(a => a.starterFiles)!.starterFiles!);
  for (const activity of topic.activities) value = completeActivity(value, topic.id, activity.id);
  for (const blank of topic.blanks) value = recordBlankAttempt(value, topic, blank, blank.acceptedAnswers[0]).session;
  for (const question of topic.assessmentQuestions.slice(0, 10)) value = submitQuestionAnswer(value, topic, question, question.acceptedAnswers[0]).session;
  return value;
}
async function seed(page: Page, value: Session) {
  await page.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem('test-seeded')) { localStorage.setItem(key, JSON.stringify(value)); sessionStorage.setItem('test-seeded', 'true'); }
  }, { key: KEY, value });
  await page.goto('/');
}

test('complete lesson from untouched drafts, halfway resume, all three challenges and next-topic unlock', async ({ page }) => {
  test.setTimeout(180_000);
  const topic = pilot(); await page.goto('/');
  await page.locator('#file-tree').getByRole('button', { name: 'main.js', exact: true }).click();
  await page.locator('#code').fill('// Phase 1 draft must survive'); await saved(page);
  await page.locator('#dashboard-nav').click(); await page.locator('#dashboard-resume').click();
  for (const activity of topic.activities) {
    await expect(page.locator('#lesson-step')).toHaveValue(activity.id);
    if (activity.kind === 'reading') await page.locator('#complete-reading').click();
    else {
      await files(page, activity.referenceSolution!); await page.locator('#check-activity').click();
      await expect(page.locator('#lesson-feedback')).toContainText('All required behavior checks passed');
    }
    await page.locator('#next-step').click();
  }
  for (const blank of topic.blanks) {
    await page.locator(`#${blank.id}`).fill(blank.acceptedAnswers[0]);
    await page.locator(`[data-blank="${blank.id}"] button`).click();
  }
  await page.locator('#next-step').click();
  const revealedId = await page.locator('#question-form').getAttribute('data-question-id');
  await page.locator('#reveal-answer').click();
  await expect(page.locator('#lesson-feedback')).toContainText('cannot earn credit');
  await page.locator('#question-answer').fill('deliberately incorrect'); await page.locator('#question-form button').click();
  for (let index = 0; index < 10; index++) {
    if (index === 5) {
      const before = await record(page); await page.reload();
      await expect(page.locator('#mastery-progress')).toContainText('5 / 10');
      await expect(page.locator('iframe')).toHaveCount(0);
      expect((await record(page)).learning).toEqual(before.learning);
      expect(before.workspaces.vanilla.files['main.js']).toContain('Phase 1 draft must survive');
    }
    const id = await page.locator('#question-form').getAttribute('data-question-id');
    const question = topic.assessmentQuestions.find(q => q.id === id)!;
    await page.locator('#question-answer').fill(question.acceptedAnswers[0]); await page.locator('#question-form button').click();
  }
  await expect(page.locator('#mastery-progress')).toContainText('10 / 10');
  const mastered = await record(page);
  expect(mastered.learning!.topics[topic.id].creditedQuestionIds).not.toContain(revealedId);
  expect(mastered.learning!.topics[topic.id].creditedQuestionIds).toHaveLength(10);
  await page.locator('#next-step').click();
  const projectDraft = mastered.learning!.projectWorkspaces[topic.projectId].files;
  for (const challenge of topic.challenges) {
    await expect(page.locator('#lesson-step')).toHaveValue(challenge.id);
    await files(page, challenge.referenceSolution!); await page.locator('#check-challenge').click();
    await expect(page.locator('#lesson-feedback')).toContainText('All required behavior checks passed');
    if (challenge.order < 3) await page.locator('#next-step').click();
  }
  await expect(page.locator('#topic-complete')).toBeVisible();
  const complete = await record(page);
  expect(complete.learning!.projectWorkspaces[topic.projectId].files).toEqual(projectDraft);
  expect(Object.keys(complete.learning!.challengeWorkspaces)).toHaveLength(3);
  await page.locator('#dashboard-nav').click();
  await expect(page.locator(`[data-topic="${topic.id}"]`)).toContainText('Completed');
  const next = curriculum.topics.find(t => t.prerequisiteTopicIds.includes(topic.id))!;
  await expect(page.locator(`[data-topic="${next.id}"]`)).toContainText('Available');
  await page.reload(); await expect(page.locator(`[data-topic="${next.id}"]`)).toContainText('Available');
  await page.locator(`[data-open-topic="${topic.id}"]`).click();
  await page.locator('#lesson-step').selectOption(topic.challenges[0].id);
  await expect(page.locator('#code')).toHaveValue(complete.learning!.challengeWorkspaces[topic.challenges[0].id].files[complete.learning!.challengeWorkspaces[topic.challenges[0].id].activeFile]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/phase2-mobile.png', fullPage: true });
});

test('question exhaustion cycles misses and reveal protection preserves an achievable gate across reload', async ({ page }) => {
  test.setTimeout(90_000); const topic = pilot(); let value = assessedSession();
  const state = value.learning!.topics[topic.id]; state.questionAttempts = {}; state.creditedQuestionIds = []; state.creditedQuestionIdentities = [];
  value = setLearningLocation(value, { view: 'topic', topicId: topic.id, projectId: topic.projectId, stepId: 'mastery' }); await seed(page, value);
  for (let index = 0; index < topic.assessmentQuestions.length; index++) {
    await expect(page.locator('#question-form')).toHaveAttribute('data-question-id', topic.assessmentQuestions[index].id);
    await page.locator('#question-answer').fill('wrong'); await page.locator('#question-form button').click();
  }
  await expect(page.locator('#question-form')).toHaveAttribute('data-question-id', topic.assessmentQuestions[0].id);
  await page.reload();
  const lastId = await page.locator('#question-form').getAttribute('data-question-id');
  await page.locator('#reveal-answer').click(); await expect(page.locator('#lesson-feedback')).toContainText('cannot be revealed');
  await expect(page.locator('#lesson-feedback')).toContainText('no unseen fresh equivalent');
  await expect(page.locator('#question-form')).toHaveAttribute('data-question-id', lastId!);
  await page.reload();
  for (let index = 0; index < 10; index++) {
    const id = await page.locator('#question-form').getAttribute('data-question-id'); const question = topic.assessmentQuestions.find(q => q.id === id)!;
    await page.locator('#question-answer').fill(question.acceptedAnswers[0]); await page.locator('#question-form button').click();
  }
  await expect(page.locator('#mastery-progress')).toContainText('10 / 10');
});

test('behavior graders reject incorrect programs, pass references, and preserve completion during review', async ({ page }) => {
  test.setTimeout(180_000); const topic = pilot(); let value = assessedSession();
  const challenge = topic.challenges[0];
  value = initializeChallengeWorkspace(value, challenge.id, challenge.starterFiles);
  value = setLearningLocation(value, { view: 'topic', topicId: topic.id, projectId: topic.projectId, stepId: challenge.id, challengeId: challenge.id }); await seed(page, value);
  for (const entry of topic.challenges) {
    await page.locator('#lesson-step').selectOption(entry.id);
    const incorrect = { ...entry.referenceSolution!, 'main.js': 'console.log("Challenge passed."); parent.postMessage({type:"lesson-grade",kind:"result",passed:true,checks:[]},"*");' };
    await files(page, incorrect); await page.locator('#check-challenge').click();
    await expect(page.locator('#lesson-feedback')).not.toContainText('Checking behavior');
    await expect(page.locator('#lesson-feedback')).not.toContainText('All required behavior checks passed');
    expect((await record(page)).learning!.topics[topic.id].challengeResults[entry.id].passed).toBe(false);
    await files(page, entry.referenceSolution!); await page.locator('#check-challenge').click();
    await expect(page.locator('#lesson-feedback')).toContainText('All required behavior checks passed');
  }
  await expect(page.locator('#topic-complete')).toBeVisible();
  await page.locator('#file-tree').getByRole('button', { name: 'main.js', exact: true }).click(); await page.locator('#code').fill('throw new Error("Review experiment");');
  await page.locator('#check-challenge').click(); await expect(page.locator('#lesson-feedback')).not.toContainText('Checking behavior');
  await expect(page.locator('#topic-complete')).toBeVisible();
  await page.locator('#dashboard-nav').click(); await page.screenshot({ path: 'test-results/phase2-dashboard.png', fullPage: true });
});
