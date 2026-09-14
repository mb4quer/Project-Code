import type { AssessmentQuestion, Blank, Curriculum, Topic } from '../content/schema';
import type { BlankAttempt, ChallengeResult, Files, LearningLocation, LearningSession, LessonWorkspace, QuestionAttempt, Session, TopicLearningProgress } from '../contracts';

export type QuestionSchedule =
  | { state: 'question'; question: AssessmentQuestion; source: 'unseen' | 'missed' }
  | { state: 'complete' | 'exhausted'; reason: string; question?: undefined };

export interface GateStatus {
  unlocked: boolean;
  complete: boolean;
  missingActivityIds: string[];
  missingBlankIds: string[];
  creditedCount: number;
  requiredCredits: number;
  missingChallengeIds: string[];
}

export interface AnswerResult { session: Session; correct: boolean; credited: boolean; feedback: string }
export interface RevealResult { session: Session; revealed: boolean; reason?: string }

const clone = <T>(value: T): T => structuredClone(value);
const unique = (values: string[]): string[] => [...new Set(values)];
const now = () => new Date().toISOString();
const equivalenceGroup = (question: AssessmentQuestion): string => question.equivalenceGroup ?? question.reasoningCategory;

export function createLearningSession(): LearningSession {
  return { version: 1, location: { view: 'lab' }, topics: {}, projectWorkspaces: {}, challengeWorkspaces: {} };
}

function topicProgress(learning: LearningSession, topicId: string): TopicLearningProgress {
  return learning.topics[topicId] ?? (learning.topics[topicId] = {
    activityIds: [], blankAttempts: {}, questionAttempts: {}, reveals: [], revealedQuestionIdentities: [], creditedQuestionIds: [], creditedQuestionIdentities: [], challengeResults: {}, challengeAttempts: {},
  });
}

/** Returns a fresh session and fills the optional Phase 1 extension when absent. */
export function ensureLearning(session: Session): Session {
  const next = clone(session);
  if (!next.learning) next.learning = createLearningSession();
  return next;
}

export function setLearningLocation(session: Session, location: LearningLocation): Session {
  const next = ensureLearning(session);
  next.learning!.location = clone(location);
  return next;
}

function normalized(value: string, code = false): string {
  const lineEndings = value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
  return code ? lineEndings : lineEndings.replace(/\s+/g, ' ').toLocaleLowerCase();
}

function accepts(answer: string, accepted: string[], code = false): boolean {
  const normalizedAnswer = normalized(answer, code);
  return accepted.some(candidate => normalized(candidate, code) === normalizedAnswer);
}

function acceptsBlank(answer: string, blank: Blank): boolean {
  const normalize = (value: string) => {
    let next = value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    if (blank.normalization.trim) next = next.trim();
    if (blank.normalization.collapseWhitespace) next = next.replace(/\s+/g, ' ');
    return blank.normalization.caseSensitive ? next : next.toLocaleLowerCase();
  };
  const value = normalize(answer);
  return blank.acceptedAnswers.some(candidate => normalize(candidate) === value);
}

export function recordBlankAttempt(session: Session, topic: Topic, blank: Blank, answer: string, at = now()): AnswerResult {
  const next = ensureLearning(session);
  const progress = topicProgress(next.learning!, topic.id);
  const correct = acceptsBlank(answer, blank);
  const attempt: BlankAttempt = { blankId: blank.id, answer, correct, at };
  (progress.blankAttempts[blank.id] ??= []).push(attempt);
  return { session: next, correct, credited: correct, feedback: correct ? 'Correct.' : blank.explanation };
}

export function completeActivity(session: Session, topicId: string, activityId: string): Session {
  const next = ensureLearning(session);
  const progress = topicProgress(next.learning!, topicId);
  progress.activityIds = unique([...progress.activityIds, activityId]);
  return next;
}

function attempted(progress: TopicLearningProgress, id: string): QuestionAttempt[] { return progress.questionAttempts[id] ?? []; }

/** Unseen eligible items are offered first; after that, missed items rotate after the last miss. */
export function nextQuestion(topic: Topic, session: Session): QuestionSchedule {
  const progress = session.learning?.topics[topic.id];
  const credited = new Set(progress?.creditedQuestionIdentities ?? []);
  const creditedIds = new Set(progress?.creditedQuestionIds ?? []);
  if (credited.size >= topic.gate.minimumDistinctCorrectQuestionIds) return { state: 'complete', reason: 'Mastery credit is complete.' };
  const revealed = new Set(progress?.revealedQuestionIdentities ?? []);
  const allCandidates = topic.assessmentQuestions.filter(question => question.reviewed && !creditedIds.has(question.id) && !credited.has(question.identity) && !revealed.has(question.identity));
  const pendingGroup = progress?.pendingEquivalentGroup;
  const candidates = pendingGroup ? allCandidates.filter(question => equivalenceGroup(question) === pendingGroup) : allCandidates;
  if (!candidates.length) {
    return { state: credited.size >= topic.gate.minimumDistinctCorrectQuestionIds ? 'complete' : 'exhausted', reason: credited.size >= topic.gate.minimumDistinctCorrectQuestionIds ? 'Mastery credit is complete.' : 'No eligible questions remain. The reviewed reserve needs another equivalent item.' };
  }
  const unseen = candidates.filter(question => !(progress?.questionAttempts[question.id]?.length));
  if (unseen.length) return { state: 'question', question: unseen[0], source: 'unseen' };
  const missed = candidates.filter(question => !attempted(progress!, question.id).some(entry => entry.correct));
  if (!missed.length) return { state: 'exhausted', reason: 'No uncredited missed questions remain.' };
  const lastIndex = progress?.lastMissQuestionId ? missed.findIndex(question => question.id === progress.lastMissQuestionId) : -1;
  return { state: 'question', question: missed[(lastIndex + 1) % missed.length], source: 'missed' };
}

export function submitQuestionAnswer(session: Session, topic: Topic, question: AssessmentQuestion, answer: string, at = now()): AnswerResult {
  const next = ensureLearning(session);
  const progress = topicProgress(next.learning!, topic.id);
  const currentQuestion = topic.assessmentQuestions.find(item => item.id === question.id && item.identity === question.identity && item.reviewed);
  if (!currentQuestion) return { session: next, correct: false, credited: false, feedback: 'This assessment item is no longer eligible for credit.' };
  const revealed = progress.revealedQuestionIdentities.includes(question.identity);
  const correct = accepts(answer, currentQuestion.acceptedAnswers, currentQuestion.kind === 'code');
  const alreadyCredited = progress.creditedQuestionIds.includes(question.id) || progress.creditedQuestionIdentities.includes(question.identity);
  const credited = correct && !revealed && !alreadyCredited;
  const attempt: QuestionAttempt = { questionId: question.id, identity: question.identity, answer, correct, revealedBeforeAttempt: revealed, at };
  (progress.questionAttempts[question.id] ??= []).push(attempt);
  delete progress.pendingEquivalentGroup;
  if (credited) {
    progress.creditedQuestionIds = unique([...progress.creditedQuestionIds, question.id]);
    progress.creditedQuestionIdentities = unique([...progress.creditedQuestionIdentities, question.identity]);
  }
  if (!correct) progress.lastMissQuestionId = question.id;
  const feedback = !correct ? currentQuestion.misconceptionFeedback : revealed ? 'That answer is correct, but this identity was revealed and cannot earn credit.' : credited ? 'Correct. New mastery credit recorded.' : 'Correct. This question already has credit.';
  return { session: next, correct, credited, feedback };
}

/** Refuse a reveal that would make the ten-credit requirement impossible to finish. */
export function revealQuestion(session: Session, topic: Topic, question: AssessmentQuestion, at = now()): RevealResult {
  const next = ensureLearning(session);
  const progress = topicProgress(next.learning!, topic.id);
  const currentQuestion = topic.assessmentQuestions.find(item => item.id === question.id && item.identity === question.identity && item.reviewed);
  if (!currentQuestion) return { session: next, revealed: false, reason: 'This assessment item is no longer eligible for reveal.' };
  if (progress.revealedQuestionIdentities.includes(question.identity)) return { session: next, revealed: true };
  const credited = new Set(progress.creditedQuestionIdentities);
  if (credited.has(question.identity)) return { session: next, revealed: true };
  const group = equivalenceGroup(currentQuestion);
  const freshEquivalentExists = topic.assessmentQuestions.some(item => item.reviewed && item.id !== question.id && equivalenceGroup(item) === group && !progress.revealedQuestionIdentities.includes(item.identity) && !credited.has(item.identity) && !progress.creditedQuestionIds.includes(item.id) && !(progress.questionAttempts[item.id]?.length));
  if (!freshEquivalentExists) return { session: next, revealed: false, reason: 'This answer cannot be revealed because there is no unseen fresh equivalent in its assessment group. Try an answer first.' };
  const creditedIds = new Set(progress.creditedQuestionIds);
  const availableAfterReveal = new Set(topic.assessmentQuestions
    .filter(item => item.reviewed && item.identity !== question.identity && !creditedIds.has(item.id) && !progress.revealedQuestionIdentities.includes(item.identity))
    .map(item => item.identity));
  for (const identity of credited) availableAfterReveal.add(identity);
  if (availableAfterReveal.size < topic.gate.minimumDistinctCorrectQuestionIds) {
    return { session: next, revealed: false, reason: `This answer cannot be revealed because only ${availableAfterReveal.size} of ${topic.gate.minimumDistinctCorrectQuestionIds} credits would remain earnable. Try an answer or use a different question.` };
  }
  progress.revealedQuestionIdentities = unique([...progress.revealedQuestionIdentities, question.identity]);
  progress.reveals.push({ questionId: currentQuestion.id, identity: currentQuestion.identity, at });
  progress.pendingEquivalentGroup = group;
  return { session: next, revealed: true };
}

export function recordChallengeResult(session: Session, topicId: string, challengeId: string, passed: boolean, at = now(), message?: string, checks?: string[]): Session {
  const next = ensureLearning(session);
  const progress = topicProgress(next.learning!, topicId);
  const result: ChallengeResult = { challengeId, passed, at, ...(message ? { message } : {}), ...(checks ? { checks: [...checks] } : {}) };
  (progress.challengeAttempts[challengeId] ??= []).push(result);
  if (passed || !progress.challengeResults[challengeId]?.passed) progress.challengeResults[challengeId] = result;
  return next;
}

function completedBlankIds(topic: Topic, progress: TopicLearningProgress | undefined): string[] {
  return topic.blanks.filter(blank => progress?.blankAttempts[blank.id]?.some(attempt => attempt.correct)).map(blank => blank.id);
}

export function topicGateStatus(topic: Topic, session: Session): GateStatus {
  const progress = session.learning?.topics[topic.id];
  const activityIds = new Set(progress?.activityIds ?? []);
  const requiredActivities = topic.activities.map(activity => activity.id);
  const missingActivityIds = requiredActivities.filter(id => !activityIds.has(id));
  const finishedBlanks = new Set(completedBlankIds(topic, progress));
  const missingBlankIds = topic.blanks.map(blank => blank.id).filter(id => !finishedBlanks.has(id));
  const results = progress?.challengeResults ?? {};
  const missingChallengeIds = topic.gate.requiredChallengeIds.filter(id => !results[id]?.passed);
  const creditedCount = Math.min(new Set(progress?.creditedQuestionIds ?? []).size, new Set(progress?.creditedQuestionIdentities ?? []).size);
  const complete = !missingActivityIds.length && !missingBlankIds.length && creditedCount >= topic.gate.minimumDistinctCorrectQuestionIds && !missingChallengeIds.length;
  return { unlocked: complete, complete, missingActivityIds, missingBlankIds, creditedCount, requiredCredits: topic.gate.minimumDistinctCorrectQuestionIds, missingChallengeIds };
}

export function isTopicUnlocked(topic: Topic, session: Session, curriculum: Curriculum): boolean {
  return topic.prerequisiteTopicIds.every(id => {
    const prerequisite = curriculum.topics.find(candidate => candidate.id === id);
    return prerequisite !== undefined && topicGateStatus(prerequisite, session).complete;
  });
}

function makeWorkspace(starterFiles: Files, activeFile?: string): LessonWorkspace {
  const files = clone(starterFiles);
  return { files, activeFile: activeFile && Object.hasOwn(files, activeFile) ? activeFile : Object.keys(files)[0] ?? 'index.html', version: 1, updatedAt: now() };
}

export function initializeProjectWorkspace(session: Session, projectId: string, starterFiles: Files, activeFile?: string): Session {
  const next = ensureLearning(session);
  next.learning!.projectWorkspaces[projectId] ??= makeWorkspace(starterFiles, activeFile);
  return next;
}
export function updateProjectWorkspace(session: Session, projectId: string, workspace: LessonWorkspace): Session {
  const next = ensureLearning(session); next.learning!.projectWorkspaces[projectId] = clone(workspace); return next;
}
export function initializeChallengeWorkspace(session: Session, challengeId: string, starterFiles: Files, activeFile?: string): Session {
  const next = ensureLearning(session); next.learning!.challengeWorkspaces[challengeId] ??= makeWorkspace(starterFiles, activeFile); return next;
}
export function updateChallengeWorkspace(session: Session, challengeId: string, workspace: LessonWorkspace): Session {
  const next = ensureLearning(session); next.learning!.challengeWorkspaces[challengeId] = clone(workspace); return next;
}
