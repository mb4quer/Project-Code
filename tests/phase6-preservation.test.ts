import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { curriculum } from '../src/content/curriculum';
import preserved from './fixtures/phase5-preserved.json';
import published from './fixtures/phase5-published.json';

it('preserves accepted Phase 1–5 sources, runtime, storage, compiler, exports and dependencies', () => {
  for (const file of preserved) {
    const source = readFileSync(file.path, 'utf8').replace(/\r\n/g, '\n');
    expect(createHash('sha256').update(source).digest('hex'), file.path).toBe(file.sha256);
  }
});

it('preserves every published topic order, prerequisite, activity, blank, question identity/answer and challenge gate', () => {
  const actual = curriculum.topics.slice(0,21).map(t => ({id:t.id,projectId:t.projectId,order:t.order,prerequisiteTopicIds:t.prerequisiteTopicIds,activities:t.activities.map(x=>x.id),blanks:t.blanks.map(x=>x.id),questions:t.assessmentQuestions.map(x=>({id:x.id,identity:x.identity,acceptedAnswers:x.acceptedAnswers})),challenges:t.challenges.map(x=>x.id),gate:t.gate}));
  expect(actual).toEqual(published);
});
