import type { Files, Session } from '../contracts';
import { curriculum } from '../content/curriculum';
import type { Topic } from '../content/schema';
import { ensureLearning, setLearningLocation, initializeProjectWorkspace, initializeChallengeWorkspace, completeActivity, recordBlankAttempt, nextQuestion, submitQuestionAnswer, revealQuestion, recordChallengeResult, topicGateStatus, isTopicUnlocked } from './engine';
import { createChallengeGrader } from './grader';

type Host = { getSession(): Session; setSession(value: Session): void; save(): boolean; refresh(): void; stop(): void };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const list = (items: string[]) => `<ol>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ol>`;
const paragraphs = (value: string) => value.split('\n\n').map(part => `<p>${escape(part)}</p>`).join('');
const solutions = (files?: Files) => files ? `<details class="reference"><summary>Reference solution</summary><p>Compare the behavior, then explain each change in your own words.</p>${Object.entries(files).map(([name, text]) => `<h4>${escape(name)}</h4><pre>${escape(text)}</pre>`).join('')}</details>` : '';
const hints = (items: string[] = []) => items.map((hint, i) => `<details><summary>Hint ${i + 1}</summary><p>${escape(hint)}</p></details>`).join('');

export function createLessonUI(host: Host) {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  host.setSession(ensureLearning(host.getSession()));
  const nav = document.createElement('nav'); nav.className = 'lesson-nav'; nav.setAttribute('aria-label', 'Course views');
  nav.innerHTML = '<button id="dashboard-nav">Dashboard</button><button id="resume-lesson">Resume lesson</button><button id="runtime-nav">Runtime lab</button><span>Phase 4 · Todo and Weather</span>';
  $('.page-heading').before(nav);
  const dashboard = document.createElement('section'); dashboard.id = 'dashboard'; dashboard.className = 'hidden'; $('.workspace').before(dashboard);
  const gradingContainer = document.createElement('div'); gradingContainer.className = 'grading-sandbox'; gradingContainer.setAttribute('aria-hidden', 'true'); document.body.append(gradingContainer);
  const grader = createChallengeGrader(gradingContainer, () => {});
  let generation = 0;
  let feedback = '';
  let grading = false;
  const session = () => host.getSession();
  const learning = () => session().learning!;
  const topic = () => curriculum.topics.find(item => item.id === learning().location.topicId);
  const progress = (item: Topic) => learning().topics[item.id];
  const commit = (value: Session) => { host.setSession(value); host.save(); };
  const cancelGrading = () => { generation++; grading = false; grader.cancel(); };
  const cancel = () => { cancelGrading(); host.stop(); };
  const steps = (item: Topic) => [...item.activities.map(activity => ({ id: activity.id, title: activity.title })), { id: 'blanks', title: 'Practice blanks' }, { id: 'mastery', title: 'Understanding check' }, ...item.challenges.map(challenge => ({ id: challenge.id, title: challenge.title }))];
  const first = () => curriculum.topics.find(item => item.status === 'published')!;
  const starter = (item: Topic) => item.activities.find(activity => activity.kind === 'guided-coding')!.starterFiles!;
  function open(item: Topic, stepId = item.activities[0].id) {
    if (item.status !== 'published' || !isTopicUnlocked(item, session(), curriculum)) return;
    cancel(); feedback = '';
    let value = initializeProjectWorkspace(session(), item.projectId, starter(item));
    const challenge = item.challenges.find(entry => entry.id === stepId);
    if (challenge) value = initializeChallengeWorkspace(value, challenge.id, challenge.starterFiles);
    commit(setLearningLocation(value, { view: 'topic', projectId: item.projectId, topicId: item.id, stepId, ...(challenge ? { challengeId: challenge.id } : {}) }));
    host.refresh(); $('#reading').scrollTop = 0;
  }
  function showDashboard() { cancel(); feedback = ''; commit(setLearningLocation(session(), { ...learning().location, view: 'dashboard' })); host.refresh(); }
  function showLab() { cancel(); commit(setLearningLocation(session(), { ...learning().location, view: 'lab' })); host.refresh(); }
  $('#dashboard-nav').onclick = showDashboard;
  $('#runtime-nav').onclick = showLab;
  $('#resume-lesson').onclick = () => open(topic() ?? first(), learning().location.stepId);
  $('#roadmap').addEventListener('click', event => { event.stopImmediatePropagation(); showDashboard(); }, true);
  $('.sidebar-note').innerHTML = '<strong>Build understanding through practice.</strong>Vanilla Todo and Async Weather are available in sequence. React and ecommerce remain planned.';
  $('.under-workspace span').firstChild!.textContent = 'Phase 4 · Lessons and local execution ';
  window.addEventListener('pagehide', () => grader.dispose());

  function workspace() {
    if (learning().location.view !== 'topic') return undefined;
    const item = topic(); if (!item) return undefined;
    const challenge = item.challenges.find(entry => entry.id === learning().location.stepId);
    return challenge ? learning().challengeWorkspaces[challenge.id] : learning().projectWorkspaces[item.projectId];
  }
  function starterFiles() { const item = topic(); if (learning().location.view !== 'topic' || !item) return undefined; return item.challenges.find(entry => entry.id === learning().location.stepId)?.starterFiles ?? starter(item); }
  function canEnter(item: Topic, stepId: string) {
    const state = progress(item);
    const index = item.activities.findIndex(activity => activity.id === stepId);
    if (index >= 0) return item.activities.slice(0, index).every(activity => state?.activityIds.includes(activity.id));
    if (!item.activities.every(activity => state?.activityIds.includes(activity.id))) return false;
    if (stepId === 'blanks') return true;
    if (!item.blanks.every(blank => state?.blankAttempts[blank.id]?.some(attempt => attempt.correct))) return false;
    if (stepId === 'mastery') return true;
    return topicGateStatus(item, session()).creditedCount >= 10;
  }
  function nextStep(item: Topic) { const all = steps(item); const index = all.findIndex(step => step.id === learning().location.stepId); if (all[index + 1]) open(item, all[index + 1].id); else showDashboard(); }
  async function check(item: Topic, assessmentId: string, challenge: boolean) {
    if (grading) return;
    const current = workspace(); if (!current) return;
    const version = current.version, files = { ...current.files }, token = ++generation;
    grading = true; feedback = 'Checking behavior in a fresh isolated preview…'; render(); host.save();
    try {
      const result = await grader.grade(files, assessmentId);
      if (token !== generation) return;
      if (workspace()?.version !== version) { feedback = 'Your code changed during the check. Check the current draft again.'; return; }
      feedback = result.passed ? 'All required behavior checks passed.' : result.message;
      if (challenge) commit(recordChallengeResult(session(), item.id, assessmentId, result.passed, undefined, feedback, result.checks.map(check => check.message)));
      else if (result.passed) commit(completeActivity(session(), item.id, assessmentId));
    } catch (error) {
      if (token === generation) {
        feedback = error instanceof Error ? error.message : String(error);
        if (challenge && workspace()?.version === version) commit(recordChallengeResult(session(), item.id, assessmentId, false, undefined, feedback));
      }
    }
    finally { if (token === generation) { grading = false; render(); } }
  }
  function renderDashboard() {
    const item = first(), state = progress(item);
    const resumeName = topic()?.projectId === 'async-weather' ? 'Async Weather' : 'DOM / Todo';
    dashboard.innerHTML = `<div class="dashboard-intro"><div><p class="eyebrow">Your learning path</p><h2>Build working projects, one feature at a time.</h2><p>Short readings, guided practice, and three independent checks. Your files and progress save in this browser.</p></div><button class="primary" id="dashboard-resume">${state ? 'Resume ' + resumeName : 'Start DOM / Todo'}</button></div><div class="topic-grid">${curriculum.projects.map(project => `<section class="project-card"><div class="eyebrow">Project ${project.order}</div><h3>${escape(project.title)}</h3><p class="project-progress">${project.topicIds.every(id => topicGateStatus(curriculum.topics.find(t => t.id === id)!, session()).complete) ? "Project complete - available for review" : `${project.topicIds.filter(id => topicGateStatus(curriculum.topics.find(t => t.id === id)!, session()).complete).length} / ${project.topicIds.length} topics complete`}</p>${project.topicIds.map(id => { const entry = curriculum.topics.find(t => t.id === id)!; const gate = topicGateStatus(entry, session()); const unlocked = isTopicUnlocked(entry, session(), curriculum); return `<div class="topic-card" data-topic="${id}"><strong>${escape(entry.title)}</strong><span>${gate.complete ? 'Completed · available for review' : unlocked ? entry.status === 'published' ? 'Available' : 'Unlocked · content planned for a later phase' : 'Locked · finish the preceding topic'}</span>${entry.status === 'published' ? `<p>${progress(entry)?.activityIds.length ?? 0} / ${entry.activities.length} activities · ${topicGateStatus(entry, session()).creditedCount} / 10 distinct correct</p><button data-open-topic="${id}" ${unlocked ? '' : 'disabled'}>${gate.complete ? 'Review topic' : 'Open topic'}</button>` : ''}</div>`; }).join('')}</section>`).join('')}</div>`;
    $('#dashboard-resume').onclick = () => open(topic() ?? item, learning().location.stepId);
    dashboard.querySelectorAll<HTMLButtonElement>('[data-open-topic]').forEach(button => button.onclick = () => open(curriculum.topics.find(entry => entry.id === button.dataset.openTopic)!));
  }
  function render(): boolean {
    const view = learning().location.view;
    dashboard.classList.toggle('hidden', view !== 'dashboard');
    for (const selector of ['.workspace', '.workspace-footer']) $(selector).classList.toggle('hidden', view === 'dashboard');
    $('.mode-switch').classList.toggle('hidden', view !== 'lab');
    $('#dashboard-nav').setAttribute('aria-pressed', String(view === 'dashboard'));
    $('#runtime-nav').setAttribute('aria-pressed', String(view === 'lab'));
    $('.breadcrumbs strong').textContent = view === 'lab' ? 'Runtime lab' : view === 'dashboard' ? 'Dashboard' : topic()?.projectId === 'async-weather' ? 'Async Weather' : 'DOM / Todo';
    $('h1').textContent = view === 'lab' ? 'A small project. A real workspace.' : view === 'dashboard' ? 'Keep building, one topic at a time.' : topic()?.title ?? 'DOM / Todo';
    $('.page-heading p').textContent = view === 'lab' ? 'Edit a file, run your code, and see what changes.' : 'Learn a concept. Try it in code. Prove the behavior.';
    $('.reading-footer').textContent = view === 'lab' ? 'Practice space · no lesson credit' : 'Local progress · no account sync';
    $('#reset').textContent = view === 'lab' ? 'Reset example' : 'Reset workspace';
    if (view === 'lab') { $('.reading .panel-heading').innerHTML = '<span>Field notes</span><span>Runtime proof</span>'; return false; }
    if (view === 'dashboard') { renderDashboard(); return true; }
    const item = topic(); if (!item) return false;
    const stepId = learning().location.stepId ?? item.activities[0].id;
    const activity = item.activities.find(entry => entry.id === stepId);
    const challenge = item.challenges.find(entry => entry.id === stepId);
    const state = progress(item);
    $('.reading .panel-heading').innerHTML = `<span>Lesson</span><span>${item.projectId === 'async-weather' ? 'Async Weather' : 'DOM / Todo'}</span>`;
    $('#tree-title').textContent = challenge ? 'CHALLENGE DRAFT' : item.projectId === 'async-weather' ? 'WEATHER PROJECT' : 'TODO PROJECT';
    let body = '';
    if (activity) body = `<div class="eyebrow">${activity.kind === 'reading' ? 'Read & reason' : 'Guided coding'}</div><h2>${escape(activity.title)}</h2><p><strong>${escape(activity.objective)}</strong></p>${paragraphs(activity.explanation!)}${list(activity.instructions!)}${hints(activity.hints)}${activity.kind === 'guided-coding' ? `<p class="note">Extend your saved project files. Check runs a separate copy of the current draft.</p><h3>Check criteria</h3>${list(activity.validation?.checks ?? [])}<button class="primary" id="check-activity" ${grading ? 'disabled' : ''}>Check guided code</button>${solutions(activity.referenceSolution)}` : '<button class="primary" id="complete-reading">Mark reading complete</button>'}<p>${state?.activityIds.includes(activity.id) ? 'Activity complete ✓' : ''}</p>`;
    else if (stepId === 'blanks') body = `<h2>Practice the missing pieces</h2><p>All blanks are required. Code answers preserve case and internal spacing; conceptual answers ignore case.</p>${item.blanks.map(blank => `<form class="blank-form" data-blank="${blank.id}"><label for="${blank.id}">${escape(blank.prompt)}</label><input id="${blank.id}" autocomplete="off" required maxlength="1000"><button>Check blank</button><p>${state?.blankAttempts[blank.id]?.some(attempt => attempt.correct) ? `Correct ✓ ${escape(blank.explanation)}` : ''}</p></form>`).join('')}`;
    else if (stepId === 'mastery') {
      const schedule = nextQuestion(item, session()); const question = schedule.state === 'question' ? schedule.question : undefined;
      body = `<h2>Understanding check</h2><p id="mastery-progress"><strong>${topicGateStatus(item, session()).creditedCount} / 10 distinct correct</strong></p><p>Credit is cumulative. Wrong answers never erase it. Revealing an answer permanently retires that question identity; a fresh item follows. We keep at least 10 identities earnable.</p>${question ? `<form id="question-form" data-question-id="${question.id}"><div class="eyebrow">${question.reasoningCategory} · ${question.kind}</div><label for="question-answer">${escape(question.prompt)}</label><input id="question-answer" required maxlength="2000" autocomplete="off"><button class="primary">Check answer</button></form><button id="reveal-answer">Reveal & retire this question</button>` : schedule.state === 'complete' ? '<p>Mastery requirement met. Continue to the three challenges.</p>' : '<p>' + escape('reason' in schedule ? schedule.reason : 'Continue the understanding check.') + '</p>'}`;
    } else if (challenge) body = `<div class="eyebrow">Challenge ${challenge.order} of 3</div><h2>${escape(challenge.title)}</h2><p>${escape(challenge.objective)}</p><p class="note">This challenge has its own saved files. Your project draft stays available in guided practice.</p>${list(challenge.instructions)}<h3>Examples</h3>${list(challenge.examples)}<h3>Acceptance criteria</h3>${list(challenge.behaviorValidation.checks)}${hints(challenge.hints)}<button class="primary" id="check-challenge" ${grading ? 'disabled' : ''}>Check challenge</button>${solutions(challenge.referenceSolution)}`;
    $('#reading').innerHTML = `<label for="lesson-step" class="sr-only">Lesson step</label><select id="lesson-step">${steps(item).map(step => `<option value="${step.id}" ${step.id === stepId ? 'selected' : ''} ${canEnter(item, step.id) ? '' : 'disabled'}>${escape(step.title)}</option>`).join('')}</select><p class="lesson-score">${topicGateStatus(item, session()).creditedCount}/10 mastery · ${item.challenges.filter(entry => state?.challengeAttempts[entry.id]?.some(result => result.passed)).length}/3 challenges</p>${body}<p id="lesson-feedback" role="status" aria-live="polite">${escape(feedback)}</p>${grading ? '<button id="cancel-check">Cancel check</button>' : ''}<button id="next-step" ${canEnter(item, steps(item)[steps(item).findIndex(step => step.id === stepId) + 1]?.id ?? stepId) ? '' : 'disabled'}>Continue</button>${topicGateStatus(item, session()).complete ? '<p id="topic-complete" class="note">Topic complete. Check the dashboard for your next available topic. You can review all completed work.</p>' : ''}`;
    $<HTMLSelectElement>('#lesson-step').onchange = event => { const value = (event.target as HTMLSelectElement).value; if (canEnter(item, value)) open(item, value); };
    $('#next-step').onclick = () => nextStep(item);
    if (activity?.kind === 'reading') $('#complete-reading').onclick = () => { commit(completeActivity(session(), item.id, activity.id)); feedback = 'Reading complete. Continue to practice.'; render(); };
    if (activity?.kind === 'guided-coding') $('#check-activity').onclick = () => void check(item, activity.id, false);
    if (challenge) $('#check-challenge').onclick = () => void check(item, challenge.id, true);
    document.querySelectorAll<HTMLFormElement>('.blank-form').forEach(form => form.onsubmit = event => { event.preventDefault(); const blank = item.blanks.find(entry => entry.id === form.dataset.blank)!; const result = recordBlankAttempt(session(), item, blank, form.querySelector('input')!.value); commit(result.session); feedback = result.correct ? blank.explanation : `Try again. ${blank.explanation}`; render(); });
    if (stepId === 'mastery') {
      const schedule = nextQuestion(item, session()); const question = schedule.state === 'question' ? schedule.question : undefined;
      if (question) {
        $<HTMLFormElement>('#question-form').onsubmit = event => { event.preventDefault(); const result = submitQuestionAnswer(session(), item, question, $<HTMLInputElement>('#question-answer').value); commit(result.session); feedback = result.feedback; render(); };
        $('#reveal-answer').onclick = () => { const result = revealQuestion(session(), item, question); commit(result.session); feedback = result.revealed ? `Retired ${question.id}. Answer: ${question.acceptedAnswers.join(' / ')}. ${question.misconceptionFeedback} This identity cannot earn credit; answer a fresh item.` : result.reason ?? 'Reveal unavailable; answer the remaining questions to complete mastery.'; render(); };
      }
    }
    return true;
  }
  return { render, workspace, starterFiles, showDashboard, showLab, cancelGrading };
}






