import { describe, expect, it } from 'vitest';
import { completeActivity, createLearningSession, isTopicUnlocked, nextQuestion, recordBlankAttempt, recordChallengeResult, revealQuestion, submitQuestionAnswer, topicGateStatus } from '../src/lesson/engine';
import type { Curriculum, Topic } from '../src/content/schema';
import type { Session } from '../src/contracts';
import { createInitialSession } from '../src/data/demos';

const question = (index: number) => ({ id: `question-${index}`, identity: `identity-${index}`, path: `projects/todo/topics/topic/questions/question-${index}`, prompt: `Question ${index}`, kind: 'conceptual' as const, reasoningCategory: 'prediction' as const, acceptedAnswers: [`answer ${index}`], misconceptionFeedback: 'Try the state transition again.', reviewed: true });
const questions = Array.from({ length: 11 }, (_, index) => question(index + 1));
const blank = { id: 'blank-one', path: 'projects/todo/topics/topic/blanks/blank-one', kind: 'conceptual' as const, prompt: 'Name it', acceptedAnswers: ['state'], explanation: 'State is the source of truth.', normalization: { trim: true as const, collapseWhitespace: true, caseSensitive: false, lineEndings: 'lf' as const } };
const topic = (id = 'topic', prerequisites: string[] = []): Topic => ({
  id, path: `projects/todo/topics/${id}`, projectId: 'todo', title: id, order: 1, status: 'published', summary: 'A test topic.', prerequisiteTopicIds: prerequisites,
  activities: [{ id: 'read', path: `projects/todo/topics/${id}/activities/read`, title: 'Read', kind: 'reading', order: 1, objective: 'Read.', outline: 'Read.', explanation: 'Read.', instructions: ['Read.'] }],
  blanks: [blank], assessmentQuestions: questions, challenges: [1, 2, 3].map(order => ({ id: `challenge-${order}`, path: `projects/todo/topics/${id}/challenges/challenge-${order}`, title: `Challenge ${order}`, order, objective: 'Do it.', starterFiles: { 'index.html': '<main></main>' }, instructions: ['Do it.'], examples: ['It works.'], behaviorValidation: { observable: 'Works.', checks: ['Works.'] }, hints: ['Try.'], reference: ['read'] })),
  gate: { type: 'topic-gate', guidedActivityIds: ['read'], requiredChallengeIds: ['challenge-1', 'challenge-2', 'challenge-3'], minimumDistinctCorrectQuestionIds: 10, revealedAnswerEarnsCredit: false, requiresFreshEquivalentAfterReveal: true, wrongAnswerResetsProgress: false, retryPolicy: 'exhaust-unseen-before-missed' },
});

describe('lesson engine', () => {
  it('uses unseen questions before rotating missed questions, retaining prior credit', () => {
    let session = createInitialSession();
    expect(nextQuestion(topic(), session)).toMatchObject({ state: 'question', source: 'unseen', question: { id: 'question-1' } });
    session = submitQuestionAnswer(session, topic(), questions[0], 'wrong').session;
    expect(nextQuestion(topic(), session)).toMatchObject({ source: 'unseen', question: { id: 'question-2' } });
    for (const item of questions.slice(1)) session = submitQuestionAnswer(session, topic(), item, 'wrong').session;
    expect(nextQuestion(topic(), session)).toMatchObject({ source: 'missed', question: { id: 'question-1' } });
    session = submitQuestionAnswer(session, topic(), questions[0], 'answer 1').session;
    expect(session.learning!.topics.topic.creditedQuestionIds).toEqual(['question-1']);
  });

  it('blocks a reveal that would strand the ten-credit requirement and retires a safe identity', () => {
    let session = createInitialSession();
    const onlyTen = { ...topic(), assessmentQuestions: questions.slice(0, 10) };
    expect(revealQuestion(session, onlyTen, questions[0]).revealed).toBe(false);
    session = revealQuestion(session, topic(), questions[0]).session;
    const result = submitQuestionAnswer(session, topic(), questions[0], 'answer 1');
    expect(result.correct).toBe(true);
    expect(result.credited).toBe(false);
    expect(nextQuestion(topic(), result.session)).toMatchObject({ question: { id: 'question-2' } });
  });

  it('requires and prioritizes an unseen fresh equivalent after revealing an answer', () => {
    const grouped = { ...topic(), assessmentQuestions: [
      { ...questions[0], equivalenceGroup: 'events' }, { ...questions[1], equivalenceGroup: 'events' },
      ...questions.slice(2).map(item => ({ ...item, equivalenceGroup: 'state' })),
    ] };
    let session = createInitialSession();
    const revealed = revealQuestion(session, grouped, grouped.assessmentQuestions[0]);
    expect(revealed.revealed).toBe(true);
    session = revealed.session;
    expect(nextQuestion(grouped, session)).toMatchObject({ question: { id: 'question-2' }, source: 'unseen' });
    const retiredOnly = { ...grouped, assessmentQuestions: [grouped.assessmentQuestions[0], ...grouped.assessmentQuestions.slice(2)] };
    expect(revealQuestion(createInitialSession(), retiredOnly, retiredOnly.assessmentQuestions[0]).revealed).toBe(false);
  });

  it('requires activities, blanks, ten credits and sticky passed challenges before unlocking a dependent topic', () => {
    const first = topic('first'); const second = topic('second', ['first']);
    const curriculum = { topics: [first, second] } as Curriculum;
    let session: Session = { ...createInitialSession(), learning: createLearningSession() };
    expect(isTopicUnlocked(second, session, curriculum)).toBe(false);
    session = completeActivity(session, first.id, 'read');
    session = recordBlankAttempt(session, first, blank, 'STATE').session;
    for (const item of questions.slice(0, 10)) session = submitQuestionAnswer(session, first, item, `answer ${item.id.split('-')[1]}`).session;
    for (const id of first.gate.requiredChallengeIds) session = recordChallengeResult(session, first.id, id, true);
    session = recordChallengeResult(session, first.id, 'challenge-1', false);
    expect(topicGateStatus(first, session).complete).toBe(true);
    expect(isTopicUnlocked(second, session, curriculum)).toBe(true);
  });

  it('does not credit replayed stable IDs or identities, and wrong answers keep existing credit', () => {
    let session = createInitialSession();
    session = submitQuestionAnswer(session, topic(), questions[0], 'answer 1').session;
    const replay = { ...questions[0], identity: 'replayed-identity' };
    const rejected = submitQuestionAnswer(session, topic(), replay, 'answer 1');
    expect(rejected).toMatchObject({ correct: false, credited: false });
    const wrong = submitQuestionAnswer(rejected.session, topic(), questions[0], 'wrong');
    expect(wrong.session.learning!.topics.topic.creditedQuestionIds).toEqual(['question-1']);
    expect(topicGateStatus(topic(), wrong.session).creditedCount).toBe(1);
  });

  it('uses each blank normalization contract instead of assuming all conceptual blanks ignore case', () => {
    const codeBlank = { ...blank, id: 'code-blank', kind: 'code' as const, acceptedAnswers: ['return value;'], normalization: { trim: true as const, collapseWhitespace: false, caseSensitive: true, lineEndings: 'lf' as const } };
    expect(recordBlankAttempt(createInitialSession(), topic(), codeBlank, ' return value; ').correct).toBe(true);
    expect(recordBlankAttempt(createInitialSession(), topic(), codeBlank, 'RETURN value;').correct).toBe(false);
    expect(recordBlankAttempt(createInitialSession(), topic(), codeBlank, 'return  value;').correct).toBe(false);
  });
});
