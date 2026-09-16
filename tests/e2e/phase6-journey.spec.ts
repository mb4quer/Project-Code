import { test, expect, type Page } from '@playwright/test';
import { curriculum } from '../../src/content/curriculum';
import { createInitialSession } from '../../src/data/demos';
import { completeActivity, initializeChallengeWorkspace, initializeProjectWorkspace, recordBlankAttempt, recordChallengeResult, submitQuestionAnswer, setLearningLocation } from '../../src/lesson/engine';
import type { Files } from '../../src/contracts';

async function editFiles(page: Page, files: Files) {
  for (const [name, value] of Object.entries(files)) {
    const button = page.locator('#file-tree').getByRole('button', { name, exact: true });
    if (!(await button.count())) { await page.locator('#add-file').click(); await page.locator('#new-file-name').fill(name); await page.locator('#dialog-confirm').click(); }
    else await button.click();
    await page.locator('#code').fill(value);
  }
}
test('finish eight ecommerce topics, reload drafts and mastery, preserve every earlier workspace and earn the independent milestone', async ({ page }) => {
  test.setTimeout(600_000);
  let seed = createInitialSession();
  for (const topic of curriculum.topics.slice(0,21)) {
    seed = initializeProjectWorkspace(seed, topic.projectId, { 'index.html': 'Prior project source', 'notes.txt': topic.projectId });
    for (const activity of topic.activities) seed = completeActivity(seed, topic.id, activity.id);
    for (const blank of topic.blanks) seed = recordBlankAttempt(seed, topic, blank, blank.acceptedAnswers[0]).session;
    for (const question of topic.assessmentQuestions.slice(0,10)) seed = submitQuestionAnswer(seed, topic, question, question.acceptedAnswers[0]).session;
    for (const challenge of topic.challenges) {
      seed = initializeChallengeWorkspace(seed, challenge.id, { 'index.html': 'Prior independent draft', 'notes.txt': challenge.id });
      seed = recordChallengeResult(seed, topic.id, challenge.id, true);
    }
  }
  for (const ws of [...Object.values(seed.workspaces), ...Object.values(seed.learning!.projectWorkspaces), ...Object.values(seed.learning!.challengeWorkspaces)]) {
    ws.version = 37; ws.trainingData = { private: 'Scoped prior map' };
    ws.checkpoint = { files: { 'notes.txt': 'Retain checkpoint' }, createdAt: '2026-09-15T00:00:00Z' };
  }
  const prior = structuredClone(seed);
  const projectId = 'amazon-inspired-ecommerce';
  seed = initializeProjectWorkspace(seed, projectId, {...curriculum.topics[21].activities.find(a=>a.starterFiles)!.starterFiles!, 'notes.txt':'Ecommerce notes survive'});
  seed.learning!.projectWorkspaces[projectId].trainingData = { cart: 'Preview map stays isolated from grading' };
  seed.learning!.projectWorkspaces[projectId].checkpoint = { files:{'notes.txt':'Shop checkpoint'},createdAt:'2026-09-15T00:00:00Z' };
  const shopCheckpoint = structuredClone(seed.learning!.projectWorkspaces[projectId].checkpoint);
  for (const topic of curriculum.topics.slice(21)) for (const challenge of topic.challenges) {
    seed = initializeChallengeWorkspace(seed, challenge.id, {...challenge.starterFiles,'notes.txt':challenge.id+' notes'});
    const ws=seed.learning!.challengeWorkspaces[challenge.id]; ws.trainingData={private:challenge.id}; ws.checkpoint={files:{'notes.txt':challenge.id+' checkpoint'},createdAt:'2026-09-15T00:00:00Z'};
  }
  seed=setLearningLocation(seed,{view:'dashboard'});
  await page.addInitScript(seed=>{if(!sessionStorage.getItem('phase6-seed')){localStorage.setItem('project-code.session.v1',JSON.stringify(seed));sessionStorage.setItem('phase6-seed','yes');}},seed);
  await page.goto('/');
  for(const [index,topic] of curriculum.topics.slice(21).entries()) {
    if(index<7) await expect(page.locator(`[data-open-topic="${curriculum.topics[22+index].id}"]`)).toBeDisabled();
    await page.locator(`[data-open-topic="${topic.id}"]`).click();
    await expect(page.locator('#tree-title')).toHaveText('ECOMMERCE PROJECT');
    await expect(page.locator('.breadcrumbs strong')).toHaveText('Original Amazon-inspired Ecommerce');
    for(const activity of topic.activities){
      await expect(page.locator('#lesson-step')).toHaveValue(activity.id);
      if(activity.kind==='reading') await page.locator('#complete-reading').click();
      else {await editFiles(page,activity.referenceSolution!);await page.locator('#check-activity').click();await expect(page.locator('#lesson-feedback')).toContainText('All required behavior checks passed');}
      await page.locator('#next-step').click();
    }
    for(const blank of topic.blanks){await page.locator(`#${blank.id}`).fill(blank.acceptedAnswers[0]);await page.locator(`[data-blank="${blank.id}"] button`).click();}
    await page.locator('#next-step').click();
    const retired=await page.locator('#question-form').getAttribute('data-question-id');await page.locator('#reveal-answer').click();
    // A miss keeps existing credit, then a fresh same-concept item can earn credit.
    await page.locator('#question-answer').fill('incorrect attempt');await page.locator('#question-form button').click();
    for(let credit=0;credit<10;credit++){
      if(credit===5){await page.reload();await expect(page.locator('#mastery-progress')).toContainText('5 / 10');await expect(page.locator('iframe')).toHaveCount(0);}
      const id=await page.locator('#question-form').getAttribute('data-question-id');const q=topic.assessmentQuestions.find(q=>q.id===id)!;
      await page.locator('#question-answer').fill(q.acceptedAnswers[0]);await page.locator('#question-form button').click();
    }
    const mastered=await page.evaluate(()=>JSON.parse(localStorage.getItem('project-code.session.v1')!));
    expect(mastered.learning.topics[topic.id].creditedQuestionIds).not.toContain(retired);
    const projectFiles=mastered.learning.projectWorkspaces[projectId].files;
    expect(projectFiles['notes.txt']).toBe('Ecommerce notes survive');
    await page.locator('#next-step').click();
    for(const challenge of topic.challenges){
      await editFiles(page,challenge.referenceSolution!);
      if(challenge.order===1){
        await page.locator('#file-tree').getByRole('button',{name:'notes.txt',exact:true}).click();await page.locator('#code').fill(challenge.id+' unfinished edit');
        await expect.poll(()=>page.evaluate(id=>JSON.parse(localStorage.getItem('project-code.session.v1')!).learning.challengeWorkspaces[id].files['notes.txt'],challenge.id)).toBe(challenge.id+' unfinished edit');
        await page.reload();await expect(page.locator('#lesson-step')).toHaveValue(challenge.id);await expect(page.locator('#code')).toHaveValue(challenge.id+' unfinished edit');await expect(page.locator('iframe')).toHaveCount(0);
      }
      await page.locator('#check-challenge').click();await expect(page.locator('#lesson-feedback')).toContainText('All required behavior checks passed');
      if(challenge.order!==3)await page.locator('#next-step').click();
    }
    await expect(page.locator('#topic-complete')).toBeVisible();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('project-code.session.v1')!));
    expect(saved.workspaces).toEqual(prior.workspaces);
    for(const [id,ws] of Object.entries(prior.learning!.projectWorkspaces))expect(saved.learning.projectWorkspaces[id]).toEqual(ws);
    for(const [id,ws] of Object.entries(prior.learning!.challengeWorkspaces))expect(saved.learning.challengeWorkspaces[id]).toEqual(ws);
    for(const [id,progress] of Object.entries(prior.learning!.topics))expect(saved.learning.topics[id]).toEqual(progress);
    expect(saved.schemaVersion).toBe(1);expect(saved.learning.projectWorkspaces[projectId].files).toEqual(projectFiles);
    expect(saved.learning.projectWorkspaces[projectId].checkpoint).toEqual(shopCheckpoint);
    expect(saved.learning.projectWorkspaces[projectId].trainingData).toEqual({cart:'Preview map stays isolated from grading'});
    for(const challenge of topic.challenges){const ws=saved.learning.challengeWorkspaces[challenge.id];expect(ws.trainingData).toEqual({private:challenge.id});expect(ws.checkpoint).toEqual(seed.learning!.challengeWorkspaces[challenge.id].checkpoint);}
    await page.locator('#dashboard-nav').click();
  }
  await expect(page.locator('.project-card').last()).toContainText('Project complete');
  await page.screenshot({path:'test-results/phase6-dashboard.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.locator('[data-open-topic="shop-testing-export-and-handoff"]').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/phase6-mobile.png',fullPage:true});
});
