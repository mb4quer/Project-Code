import { describe, expect, it } from 'vitest';
import { isAcceptedGradeMessage } from '../src/lesson/grader';

describe('challenge grading message boundary', () => {
  const frame = { contentWindow: {} } as HTMLIFrameElement;
  const active = { runId: 'run-1', nonce: 'nonce-1', assessmentId: 'todo-dom-apply', frame };
  const valid = { type: 'lesson-grade', runId: 'run-1', nonce: 'nonce-1', kind: 'result', assessmentId: 'todo-dom-apply', passed: true, checks: [{ id: 'todo-dom-apply', passed: true, message: 'Passed.' }] };

  it('accepts only matching, internally consistent grade results from its iframe', () => {
    expect(isAcceptedGradeMessage({ source: frame.contentWindow, data: valid } as MessageEvent, active)).toBe(true);
    expect(isAcceptedGradeMessage({ source: {}, data: valid } as MessageEvent, active)).toBe(false);
    expect(isAcceptedGradeMessage({ source: frame.contentWindow, data: { ...valid, assessmentId: 'other' } } as MessageEvent, active)).toBe(false);
    expect(isAcceptedGradeMessage({ source: frame.contentWindow, data: { ...valid, passed: false } } as MessageEvent, active)).toBe(false);
    expect(isAcceptedGradeMessage({ source: frame.contentWindow, data: { ...valid, checks: [] } } as MessageEvent, active)).toBe(false);
  });
});
