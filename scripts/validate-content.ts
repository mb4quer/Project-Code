import { CurriculumSchema, type Curriculum, type Topic } from '../src/content/schema';
import type { Files } from '../src/contracts';
import { curriculum } from '../src/content/curriculum';

export type ContentValidationIssue = { path: string; message: string };
export type ContentValidationResult = { success: true; data: Curriculum; issues: [] } | { success: false; data?: Curriculum; issues: ContentValidationIssue[] };
const issue = (path: string, message: string): ContentValidationIssue => ({ path, message });
const ordered = <T,>(orders: T[], expected: T[]) => orders.length === expected.length && orders.every((order, index) => order === expected[index]);
const hasFiles = (files: Files | undefined) => Boolean(files && Object.keys(files).length);
const draftText = /(?:\[draft\s+outline\]|phase\s*1\s+outline:|placeholder\s+content|to\s+be\s+written|will\s+be\s+written)/i;
const containsDraftText = (value: unknown): boolean => typeof value === 'string' ? draftText.test(value) : Array.isArray(value) ? value.some(containsDraftText) : value && typeof value === 'object' ? Object.values(value).some(containsDraftText) : false;

function checkAcyclic(edges: Map<string, string[]>, label: string, issues: ContentValidationIssue[]) {
  const visiting = new Set<string>(); const visited = new Set<string>();
  const walk = (id: string, trail: string[]) => {
    if (visiting.has(id)) { issues.push(issue(label, `${label} prerequisite cycle: ${[...trail, id].join(' -> ')}`)); return; }
    if (visited.has(id)) return;
    visiting.add(id); for (const prerequisite of edges.get(id) ?? []) walk(prerequisite, [...trail, id]); visiting.delete(id); visited.add(id);
  };
  for (const id of edges.keys()) walk(id, []);
}

function validateReferences(data: Curriculum, issues: ContentValidationIssue[]) {
  const projects = new Map(data.projects.map((project) => [project.id, project]));
  const topics = new Map(data.topics.map((topic) => [topic.id, topic]));
  const topicOrder = new Map(data.topics.map((topic, index) => [topic.id, index]));
  const topicIdsByProject = new Map(data.projects.map((project) => [project.id, new Set(project.topicIds)]));
  const allIds = new Map<string, string>();
  const questionIdentities = new Map<string, string>();
  const addId = (id: string, path: string) => { const prior = allIds.get(id); if (prior) issues.push(issue(path, `duplicate stable ID '${id}' (already used at ${prior})`)); else allIds.set(id, path); };

  data.projects.forEach((project, index) => addId(project.id, `projects[${index}].id`));
  data.topics.forEach((topic, index) => addId(topic.id, `topics[${index}].id`));
  data.topics.forEach((topic, topicIndex) => {
    topic.activities.forEach((activity, index) => addId(activity.id, `topics[${topicIndex}].activities[${index}].id`));
    topic.blanks.forEach((blank, index) => addId(blank.id, `topics[${topicIndex}].blanks[${index}].id`));
    topic.assessmentQuestions.forEach((question, index) => {
      addId(question.id, `topics[${topicIndex}].assessmentQuestions[${index}].id`);
      const identityPath = `topics[${topicIndex}].assessmentQuestions[${index}].identity`;
      const priorIdentity = questionIdentities.get(question.identity);
      if (priorIdentity) issues.push(issue(identityPath, `duplicate question identity '${question.identity}' (already used at ${priorIdentity})`));
      else questionIdentities.set(question.identity, identityPath);
    });
    topic.challenges.forEach((challenge, index) => addId(challenge.id, `topics[${topicIndex}].challenges[${index}].id`));
  });

  if (!ordered(data.projects.map((project) => project.order), data.projects.map((_, index) => index + 1))) issues.push(issue('projects', 'project orders must be unique and sequential from 1'));
  const expectedTopicSequence = data.projects.flatMap((project) => project.topicIds);
  if (!ordered(data.topics.map((topic) => topic.id), expectedTopicSequence)) issues.push(issue('topics', 'topic array must follow project topic order'));
  for (const [projectIndex, project] of data.projects.entries()) {
    if (project.path !== `projects/${project.id}`) issues.push(issue(`project:${project.id}.path`, 'path must match the stable project ID'));
    for (const prerequisite of project.prerequisiteProjectIds) {
      const prerequisiteProject = projects.get(prerequisite);
      if (!prerequisiteProject) issues.push(issue(`project:${project.id}`, `unknown prerequisite project '${prerequisite}'`));
      else if (prerequisiteProject.order >= project.order) issues.push(issue(`project:${project.id}`, 'prerequisite projects must be ordered before the dependent project'));
    }
    for (const topicId of project.topicIds) {
      const referenced = topics.get(topicId);
      if (!referenced) issues.push(issue(`project:${project.id}`, `unknown topic '${topicId}'`));
      else if (referenced.projectId !== project.id) issues.push(issue(`project:${project.id}`, `topic '${topicId}' belongs to '${referenced.projectId}'`));
    }
    const projectTopics = project.topicIds.map((id) => topics.get(id)).filter((topic): topic is Topic => Boolean(topic));
    if (!ordered(projectTopics.map((topic) => topic.order), projectTopics.map((_, index) => index + 1))) issues.push(issue(`project:${project.id}.topicIds`, 'topic orders must be unique and sequential from 1 within a project'));
    if (projectIndex !== project.order - 1) issues.push(issue(`project:${project.id}.order`, 'project array must follow project order'));
  }

  for (const topic of data.topics) {
    if (topic.path !== `projects/${topic.projectId}/topics/${topic.id}`) issues.push(issue(`topic:${topic.id}.path`, 'path must match project and topic IDs'));
    if (!projects.has(topic.projectId)) issues.push(issue(`topic:${topic.id}`, `unknown project '${topic.projectId}'`));
    else if (!topicIdsByProject.get(topic.projectId)?.has(topic.id)) issues.push(issue(`topic:${topic.id}`, 'topic is missing from its project.topicIds'));
    for (const prerequisite of topic.prerequisiteTopicIds) {
      const prerequisiteTopic = topics.get(prerequisite);
      if (!prerequisiteTopic) issues.push(issue(`topic:${topic.id}`, `unknown prerequisite topic '${prerequisite}'`));
      else if ((topicOrder.get(prerequisite) ?? Infinity) >= (topicOrder.get(topic.id) ?? -1)) issues.push(issue(`topic:${topic.id}`, 'prerequisite topics must be ordered before the dependent topic'));
    }
    if (!ordered(topic.activities.map((activity) => activity.order), topic.activities.map((_, index) => index + 1))) issues.push(issue(`topic:${topic.id}.activities`, 'activity orders must be unique and sequential from 1'));
    const activityIds = new Set(topic.activities.map((activity) => activity.id));
    for (const activity of topic.activities) {
      if (activity.path !== `projects/${topic.projectId}/topics/${topic.id}/activities/${activity.id}`) issues.push(issue(`activity:${activity.id}.path`, 'path must match project, topic, and activity IDs'));
    }
    for (const blank of topic.blanks) if (blank.path !== `projects/${topic.projectId}/topics/${topic.id}/blanks/${blank.id}`) issues.push(issue(`blank:${blank.id}.path`, 'path must match project, topic, and blank IDs'));
    for (const question of topic.assessmentQuestions) if (question.path !== `projects/${topic.projectId}/topics/${topic.id}/questions/${question.id}`) issues.push(issue(`question:${question.id}.path`, 'path must match project, topic, and question IDs'));
    for (const challenge of topic.challenges) {
      if (challenge.path !== `projects/${topic.projectId}/topics/${topic.id}/challenges/${challenge.id}`) issues.push(issue(`challenge:${challenge.id}.path`, 'path must match project, topic, and challenge IDs'));
      for (const reference of challenge.reference) if (!activityIds.has(reference)) issues.push(issue(`challenge:${challenge.id}`, `unknown activity reference '${reference}'`));
    }
    const guided = topic.activities.filter((activity) => activity.kind === 'guided-coding').map((activity) => activity.id);
    if (!ordered([...topic.gate.guidedActivityIds].sort(), [...guided].sort())) issues.push(issue(`topic:${topic.id}.gate`, 'must require every guided-coding activity by ID'));
    if (!ordered([...topic.gate.requiredChallengeIds].sort(), [...topic.challenges.map((challenge) => challenge.id)].sort())) issues.push(issue(`topic:${topic.id}.gate`, 'must require all three challenges by ID'));
  }
  checkAcyclic(new Map(data.projects.map((project) => [project.id, project.prerequisiteProjectIds])), 'project', issues);
  checkAcyclic(new Map(data.topics.map((topic) => [topic.id, topic.prerequisiteTopicIds])), 'topic', issues);
}

function validatePublishedTopic(topic: Topic, issues: ContentValidationIssue[]) {
  if (containsDraftText(topic.summary)) issues.push(issue(`topic:${topic.id}.summary`, 'published topic summary cannot contain a draft placeholder'));
  const activityKinds = topic.activities.map((activity) => activity.kind);
  if (activityKinds.length < 3 || !activityKinds.slice(activityKinds.indexOf('guided-coding') + 1).includes('reading')) issues.push(issue(`topic:${topic.id}.activities`, 'published topic must continue reading after guided practice'));
  if (!activityKinds.includes('reading') || !activityKinds.includes('guided-coding') || activityKinds[0] !== 'reading' || activityKinds.some((kind, index) => index > 0 && kind === activityKinds[index - 1])) issues.push(issue(`topic:${topic.id}.activities`, 'published activities must start with reading and interleave reading and guided-coding'));
  for (const activity of topic.activities) {
    if (!activity.explanation || !activity.instructions || !activity.hints || containsDraftText(activity)) issues.push(issue(`activity:${activity.id}`, 'published activity requires non-draft explanation, instructions, and hints'));
    if (activity.kind === 'guided-coding' && (!hasFiles(activity.starterFiles) || !activity.validation || !hasFiles(activity.referenceSolution))) issues.push(issue(`activity:${activity.id}`, 'published guided activity requires starterFiles, validation, and referenceSolution'));
  }
  const reviewed = topic.assessmentQuestions.filter((question) => question.reviewed);
  if (reviewed.length < 20) issues.push(issue(`topic:${topic.id}.assessmentQuestions`, 'published topic needs at least 20 reviewed questions'));
  for (const category of ['prediction', 'debugging', 'explanation', 'application']) if (!reviewed.some(question => question.reasoningCategory === category)) issues.push(issue(`topic:${topic.id}.assessmentQuestions`, `reviewed questions must cover ${category}`));
  if (new Set(reviewed.map((question) => question.id)).size !== reviewed.length) issues.push(issue(`topic:${topic.id}.assessmentQuestions`, 'published topic reviewed question IDs must be distinct'));
  if (new Set(reviewed.map((question) => question.identity)).size !== reviewed.length) issues.push(issue(`topic:${topic.id}.assessmentQuestions`, 'published topic reviewed question identities must be distinct'));
  if (topic.assessmentQuestions.some(containsDraftText)) issues.push(issue(`topic:${topic.id}.assessmentQuestions`, 'published questions cannot contain draft placeholders'));
  for (const kind of ['conceptual', 'code'] as const) if (!topic.blanks.some((blank) => blank.kind === kind)) issues.push(issue(`topic:${topic.id}.blanks`, `published topic needs a ${kind} blank`));
  if (topic.blanks.some(containsDraftText)) issues.push(issue(`topic:${topic.id}.blanks`, 'published blanks cannot contain draft placeholders'));
  for (const blank of topic.blanks) if (blank.kind === 'code' && (!blank.normalization.caseSensitive || blank.normalization.collapseWhitespace)) issues.push(issue(`blank:${blank.id}`, 'code blanks must preserve case and internal whitespace; enumerate equivalent code answers explicitly'));
  if (!ordered(topic.challenges.map((challenge) => challenge.order), [1, 2, 3])) issues.push(issue(`topic:${topic.id}.challenges`, 'must contain exactly three challenges ordered 1, 2, 3'));
  for (const challenge of topic.challenges) if (!hasFiles(challenge.starterFiles) || !hasFiles(challenge.referenceSolution) || containsDraftText(challenge)) issues.push(issue(`challenge:${challenge.id}`, 'published challenge requires non-draft starterFiles and referenceSolution'));
}

function validateTopicCompleteness(data: Curriculum, issues: ContentValidationIssue[]) {
  const projectById = new Map(data.projects.map((project) => [project.id, project]));
  if (data.status === 'published' && (data.projects.some((project) => project.status !== 'published') || data.topics.some((topic) => topic.status !== 'published'))) issues.push(issue('status', 'published curriculum requires published projects and topics'));
  for (const project of data.projects) if (project.status === 'published' && containsDraftText(project.description)) issues.push(issue(`project:${project.id}.description`, 'published project description cannot contain a draft placeholder'));
  for (const topic of data.topics) {
    if (!ordered(topic.challenges.map((challenge) => challenge.order), [1, 2, 3])) issues.push(issue(`topic:${topic.id}.challenges`, 'must contain exactly three challenges ordered 1, 2, 3'));
    if (topic.status === 'published') {
      if (projectById.get(topic.projectId)?.status !== 'published') issues.push(issue(`topic:${topic.id}`, 'published topic requires a published project'));
      validatePublishedTopic(topic, issues);
    }
  }
}

export function validateContent(input: unknown): ContentValidationResult {
  const parsed = CurriculumSchema.safeParse(input);
  if (!parsed.success) return { success: false, issues: parsed.error.issues.map((error) => issue(error.path.join('.') || '<root>', error.message)) };
  const issues: ContentValidationIssue[] = []; validateReferences(parsed.data, issues); validateTopicCompleteness(parsed.data, issues);
  return issues.length ? { success: false, data: parsed.data, issues } : { success: true, data: parsed.data, issues: [] };
}
export const validateCurriculum = validateContent;
export default validateContent;

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/validate-content.ts')) {
  const result = validateContent(curriculum);
  if (!result.success) { console.error(result.issues.map(({ path, message }) => `${path}: ${message}`).join('\n')); process.exitCode = 1; }
  else console.log(`Content valid: ${result.data.projects.length} projects, ${result.data.topics.filter(topic => topic.status === 'published').length} published topic(s), ${result.data.topics.filter(topic => topic.status === 'draft').length} draft topics`);
}
