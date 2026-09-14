import { describe, expect, it } from 'vitest';
import { curriculum } from '../src/content/curriculum';
import { CurriculumSchema, type Curriculum } from '../src/content/schema';
import { validateContent } from '../scripts/validate-content';

const copy = (): Curriculum => structuredClone(curriculum);
const normalization = { trim: true as const, collapseWhitespace: true as const, caseSensitive: false as const, lineEndings: 'lf' as const };

function publishCompleteFirstTopic(data: Curriculum) {
  const project = data.projects[0];
  const topic = data.topics[0];
  project.status = 'published';
  topic.status = 'published';
  topic.summary = 'Learners plan a concise feature and verify each decision before implementation.';
  topic.activities = topic.activities.map((activity) => ({
    ...activity,
    outline: 'A concise map of the concepts and work for this activity.',
    explanation: 'This explains why the activity exists and how its result connects to the project.',
    instructions: ['Inspect the stated behavior.', 'Complete the focused task.', 'Compare the result with the check.'],
    hints: ['Start with the smallest observable behavior.'],
    ...(activity.kind === 'guided-coding' ? { starterFiles: { 'index.html': '<main id="app"></main>' }, validation: { observable: 'A visible app root exists.', checks: ['The app root is present.'] }, referenceSolution: { 'index.html': '<main id="app">Ready</main>' } } : {}),
  }));
  topic.blanks = [
    { id: 'published-concept-blank', path: `projects/${project.id}/topics/${topic.id}/blanks/published-concept-blank`, kind: 'conceptual', prompt: 'Name the state owner.', acceptedAnswers: ['component'], explanation: 'The component owns the state it renders.', normalization },
    { id: 'published-code-blank', path: `projects/${project.id}/topics/${topic.id}/blanks/published-code-blank`, kind: 'code', prompt: 'Complete the return statement.', acceptedAnswers: ['return value;'], explanation: 'The function returns its computed value.', normalization: { ...normalization, caseSensitive: true, collapseWhitespace: false } },
  ];
  topic.assessmentQuestions = Array.from({ length: 20 }, (_, index) => ({
    id: `published-question-${index + 1}`, identity: `published-question-${index + 1}`, path: `projects/${project.id}/topics/${topic.id}/questions/published-question-${index + 1}`,
    prompt: `Reason about case ${index + 1}.`, kind: index % 2 ? 'code' as const : 'conceptual' as const, reasoningCategory: ['prediction', 'debugging', 'explanation', 'application'][index % 4] as 'prediction' | 'debugging' | 'explanation' | 'application', acceptedAnswers: [`answer ${index + 1}`], misconceptionFeedback: 'Recheck which value changes before drawing the conclusion.', reviewed: true,
  }));
  topic.challenges = topic.challenges.map((challenge) => ({
    ...challenge, objective: `Implement behavior ${challenge.order} with a focused, observable result.`, starterFiles: { 'index.html': '<main id="app"></main>' }, instructions: ['Implement the behavior.', 'Run the check.'], examples: ['The result is visible after the relevant action.'], behaviorValidation: { observable: 'The required UI state is visible.', checks: ['The expected element is rendered.'] }, hints: ['Use the smallest change that proves the behavior.'], referenceSolution: { 'index.html': '<main id="app">Complete</main>' },
  }));
  return topic;
}

describe('Versioned content contract', () => {
  it('accepts seven Todo, eight Weather and six React topics, retaining eight capstone drafts', () => {
    const result = validateContent(curriculum);
    expect(result.success).toBe(true);
    expect(curriculum.projects.map((project) => project.title)).toEqual(['Vanilla Todo', 'Async Weather', 'React Task Dashboard', 'Original Amazon-inspired Ecommerce']);
    expect(curriculum.projects.every((project) => project.topicIds.length >= 5 && project.topicIds.length <= 8)).toBe(true);
    expect(curriculum.topics.filter(topic => topic.status === 'published')).toHaveLength(21);
    expect(curriculum.topics[0].assessmentQuestions).toHaveLength(32);
    expect(curriculum.topics.slice(21).every((topic) => topic.status === 'draft' && topic.assessmentQuestions.length === 0)).toBe(true);
    expect(curriculum.topics.every((topic) => topic.challenges.map((challenge) => challenge.order).join(',') === '1,2,3')).toBe(true);
  });

  it('rejects malformed schema data before graph validation', () => {
    const malformed = copy();
    malformed.topics[0].blanks = [{ id: 'bad-blank', path: 'wrong', kind: 'code', prompt: 'x', acceptedAnswers: [], explanation: 'x', normalization }];
    expect(CurriculumSchema.safeParse(malformed).success).toBe(false);
  });

  it('reports duplicate IDs, broken references, prerequisite order, and cycles', () => {
    const malformed = copy();
    malformed.topics[1].id = malformed.topics[0].id;
    malformed.projects[0].topicIds.push('missing-topic');
    malformed.topics[0].prerequisiteTopicIds.push(malformed.topics[1].id);
    malformed.topics[1].prerequisiteTopicIds.push(malformed.topics[0].id);
    const result = validateContent(malformed);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((entry) => entry.message.includes('duplicate stable ID'))).toBe(true);
    expect(result.issues.some((entry) => entry.message.includes("unknown topic 'missing-topic'"))).toBe(true);
    expect(result.issues.some((entry) => entry.message.includes('ordered before'))).toBe(true);
    expect(result.issues.some((entry) => entry.message.includes('prerequisite cycle'))).toBe(true);
  });

  it('rejects a promoted draft that still has outline-only published material', () => {
    const malformed = copy();
    malformed.projects[0].status = 'published';
    malformed.topics.find(topic => topic.status === 'draft')!.status = 'published';
    const result = validateContent(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((entry) => entry.message.includes('published activity requires'))).toBe(true);
      expect(result.issues.some((entry) => entry.message.includes('at least 20 reviewed questions'))).toBe(true);
      expect(result.issues.some((entry) => entry.message.includes('published challenge requires'))).toBe(true);
    }
  });

  it('accepts a representative complete published topic with 20 reviewed IDs and three runnable challenges', () => {
    const published = copy();
    publishCompleteFirstTopic(published);
    expect(CurriculumSchema.safeParse(published).success).toBe(true);
    expect(validateContent(published).success).toBe(true);
  });

  it('rejects unsafe code normalization and a bank missing reasoning categories', () => {
    const data = copy(); const topic = publishCompleteFirstTopic(data);
    topic.blanks.find(blank => blank.kind === 'code')!.normalization.caseSensitive = false;
    topic.assessmentQuestions.forEach(question => { question.reasoningCategory = 'prediction'; });
    const result = validateContent(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some(issue => issue.message.includes('preserve case'))).toBe(true);
      expect(result.issues.some(issue => issue.message.includes('cover debugging'))).toBe(true);
    }
  });
});

