import { describe, it, expect } from 'vitest';
import { curriculum } from '../src/content/curriculum';
import { createInitialSession } from '../src/data/demos';
import { completeActivity, initializeProjectWorkspace, nextQuestion, recordBlankAttempt, recordChallengeResult, revealQuestion, submitQuestionAnswer, topicGateStatus, isTopicUnlocked } from '../src/lesson/engine';

describe('Phase 3 cumulative topic progression', () => {
  for (const topic of curriculum.topics.slice(1, 7)) {
    it(`${topic.id}: misses and repeated reveals leave ten unique credits achievable`, () => {
      let session = createInitialSession();
      // Retire as many identities as allowed. Refusals must keep the item answerable.
      for (let i = 0; i < 50; i++) {
        const next = nextQuestion(topic, session); expect(next.state).toBe('question');
        if (next.state !== 'question') throw new Error('Unexpected dead end');
        const reveal = revealQuestion(session, topic, next.question); session = reveal.session;
        if (!reveal.revealed) break;
      }
      for (let i = 0; i < topic.assessmentQuestions.length * 2; i++) {
        const next = nextQuestion(topic, session); expect(next.state).toBe('question');
        if (next.state !== 'question') throw new Error('Unexpected dead end');
        session = submitQuestionAnswer(session, topic, next.question, 'deliberate incorrect answer').session;
      }
      session = JSON.parse(JSON.stringify(session));
      for (let i = 0; i < 10; i++) {
        const next = nextQuestion(topic, session); if (next.state !== 'question') throw new Error('Mastery became unreachable');
        session = submitQuestionAnswer(session, topic, next.question, next.question.acceptedAnswers[0]).session;
      }
      expect(nextQuestion(topic, session).state).toBe('complete');
      expect(topicGateStatus(topic, session).complete).toBe(false);
      for (const activity of topic.activities) session = completeActivity(session, topic.id, activity.id);
      for (const blank of topic.blanks) session = recordBlankAttempt(session, topic, blank, blank.acceptedAnswers[0]).session;
      for (const challenge of topic.challenges) session = recordChallengeResult(session, topic.id, challenge.id, true);
      expect(topicGateStatus(topic, session).complete).toBe(true);
      const successor = curriculum.topics.find(t => t.prerequisiteTopicIds.includes(topic.id))!;
      expect(isTopicUnlocked(successor, session, curriculum)).toBe(true);
    });
  }
  it('never replaces a continuing project draft, checkpoint or training data on later topic entry', () => {
    let session = initializeProjectWorkspace(createInitialSession(), 'vanilla-todo', { 'index.html': 'original' });
    const workspace = session.learning!.projectWorkspaces['vanilla-todo']; workspace.version = 18; workspace.trainingData = { tasks: 'saved' }; workspace.checkpoint = { files: { 'index.html': 'checkpoint' }, createdAt: 'then' };
    for (const topic of curriculum.topics.slice(1, 7)) session = initializeProjectWorkspace(session, topic.projectId, topic.activities.find(a => a.starterFiles)!.starterFiles!);
    expect(session.learning!.projectWorkspaces['vanilla-todo']).toEqual(workspace);
  });
});
