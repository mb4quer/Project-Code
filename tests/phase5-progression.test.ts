import { describe, expect, it } from 'vitest';
import { curriculum } from '../src/content/curriculum';
import { createInitialSession } from '../src/data/demos';
import { migrateSession, isSession } from '../src/persistence/store';
import { completeActivity, initializeProjectWorkspace, initializeChallengeWorkspace, nextQuestion, recordBlankAttempt, recordChallengeResult, revealQuestion, submitQuestionAnswer, topicGateStatus, isTopicUnlocked } from '../src/lesson/engine';

describe('Phase 5 cumulative mastery and existing session preservation', () => {
  for (const topic of curriculum.topics.filter(t => t.projectId === 'react-task-dashboard')) {
    it(`${topic.id}: repeated reveals, misses and resume still allow ten distinct correct credits`, () => {
      expect(topic.status).toBe('published');
      expect(topic.assessmentQuestions).toHaveLength(24);
      expect(new Set(topic.assessmentQuestions.map(q => q.prompt.trim().toLowerCase())).size).toBe(24);
      for (const category of ['prediction', 'debugging', 'explanation', 'application']) expect(topic.assessmentQuestions.filter(q => q.reasoningCategory === category)).toHaveLength(6);
      expect(topic.challenges).toHaveLength(3);
      for (const question of topic.assessmentQuestions) expect(topic.assessmentQuestions.filter(other => other.equivalenceGroup === question.equivalenceGroup).length).toBeGreaterThanOrEqual(2); expect(topic.assessmentQuestions.length).toBeGreaterThanOrEqual(20);
      let session = createInitialSession();
      for (let i = 0; i < 50; i++) {
        const next = nextQuestion(topic, session); if (next.state !== 'question') throw new Error('Reveal dead end');
        const reveal = revealQuestion(session, topic, next.question); session = reveal.session; if (!reveal.revealed) break;
      }
      for (let i = 0; i < topic.assessmentQuestions.length * 2; i++) {
        const next = nextQuestion(topic, session); if (next.state !== 'question') throw new Error('Miss dead end');
        session = submitQuestionAnswer(session, topic, next.question, 'deliberately wrong').session;
      }
      session = migrateSession(JSON.parse(JSON.stringify(session))); expect(isSession(session)).toBe(true);
      for (let i = 0; i < 10; i++) {
        const next = nextQuestion(topic, session); if (next.state !== 'question') throw new Error('Mastery dead end');
        session = submitQuestionAnswer(session, topic, next.question, next.question.acceptedAnswers[0]).session;
        if (i === 4) session = migrateSession(JSON.parse(JSON.stringify(session)));
      }
      expect(nextQuestion(topic, session).state).toBe('complete'); expect(topicGateStatus(topic, session).complete).toBe(false);
      const progress = session.learning!.topics[topic.id];
      expect(new Set(progress.creditedQuestionIds).size).toBe(10);
      expect(progress.creditedQuestionIdentities.every(id => !progress.revealedQuestionIdentities.includes(id))).toBe(true);
      for (const activity of topic.activities) session = completeActivity(session, topic.id, activity.id);
      for (const blank of topic.blanks) session = recordBlankAttempt(session, topic, blank, blank.acceptedAnswers[0]).session;
      for (const challenge of topic.challenges) session = recordChallengeResult(session, topic.id, challenge.id, true);
      expect(topicGateStatus(topic, session).complete).toBe(true);
      session = recordChallengeResult(session, topic.id, topic.challenges[0].id, false);
      expect(topicGateStatus(topic, session).complete).toBe(true);
      const successor = curriculum.topics.find(t => t.prerequisiteTopicIds.includes(topic.id))!;
      expect(isTopicUnlocked(successor, session, curriculum)).toBe(true);
    });
  }
  it('migrates schema 1 losslessly and preserves every old/new workspace on topic entry', () => {
    const legacy = createInitialSession(); delete legacy.learning;
    legacy.workspaces.vanilla.files['notes.txt'] = 'Phase 1 draft'; legacy.progress.creditedQuestionIds.old = ['stable'];
    legacy.revision = 17; const snapshot = structuredClone(legacy);
    let session = migrateSession(legacy);
    expect({ ...session, learning: undefined }).toEqual({ ...snapshot, learning: undefined });
    for (const topic of curriculum.topics.filter(t => t.status === 'published')) {
      session = initializeProjectWorkspace(session, topic.projectId, { 'index.html': 'My draft', 'notes.txt': topic.projectId });
      for (const challenge of topic.challenges) session = initializeChallengeWorkspace(session, challenge.id, challenge.starterFiles);
      session = recordChallengeResult(session, topic.id, topic.challenges[0].id, true);
      session = submitQuestionAnswer(session, topic, topic.assessmentQuestions[0], topic.assessmentQuestions[0].acceptedAnswers[0]).session;
    }
    for (const ws of [...Object.values(session.learning!.projectWorkspaces), ...Object.values(session.learning!.challengeWorkspaces)]) {
      ws.version = 42; ws.trainingData = { independent: 'saved' }; ws.checkpoint = { files: { 'notes.txt': 'restore me' }, createdAt: '2026-09-13T00:00:00Z' };
    }
    const before = structuredClone(session);
    for (const topic of curriculum.topics.filter(t => t.projectId === 'react-task-dashboard')) {
      session = initializeProjectWorkspace(session, topic.projectId, topic.activities.find(a => a.starterFiles)!.starterFiles!);
      for (const challenge of topic.challenges) session = initializeChallengeWorkspace(session, challenge.id, challenge.starterFiles);
    }
    expect(migrateSession(JSON.parse(JSON.stringify(session)))).toEqual(before);
  });
});

