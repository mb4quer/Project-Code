import { ecommerceTopics } from './ecommerce';
import { reactTopics } from './react';
import { weatherTopics } from './weather';
import type { Curriculum } from './schema';
import { domTodoTopic } from './domTodo';
import { todoPhase3Topics } from './todoPhase3';

type TopicOutline = { id: string; title: string; summary: string };
type ProjectOutline = { id: string; title: string; description: string; topics: TopicOutline[] };

const projects: ProjectOutline[] = [
  {
    id: 'vanilla-todo', title: 'Vanilla Todo', description: 'Build a browser Todo app from first principles with HTML, CSS, and JavaScript.', topics: [
      { id: 'todo-scope-and-user-flows', title: 'Scope and user flows', summary: 'Plan task creation, completion, deletion, filtering, and the empty state before coding.' },
      { id: 'todo-web-stack-and-file-plan', title: 'Web stack and file plan', summary: 'Compare plain browser files, Vite with vanilla JS, and React; choose vanilla for this small app and separate markup, styles, state, and DOM code.' },
      { id: 'todo-setup-and-static-layout', title: 'Setup and static layout', summary: 'Set up accessible HTML and CSS that make the planned controls visible before behavior is added.' },
      { id: 'todo-dom-events-and-task-state', title: 'DOM events and task state', summary: 'Represent tasks in JavaScript and connect create, toggle, and delete actions to the DOM.' },
      { id: 'todo-filter-empty-and-input-errors', title: 'Filters, empty states, and input errors', summary: 'Add filters and clear feedback for empty lists and invalid task input.' },
      { id: 'todo-storage-and-recovery', title: 'Storage and recovery', summary: 'Persist tasks locally and recover safely from missing or malformed saved data.' },
      { id: 'todo-testing-and-export', title: 'Testing and export', summary: 'Debug common DOM mistakes, test essential behaviors, prepare static deployment, export runnable files, and explain how to continue locally.' },
    ],
  },
  {
    id: 'async-weather', title: 'Async Weather', description: 'Build a weather lookup app that treats asynchronous data and failures as part of the design.', topics: [
      { id: 'weather-scope-and-data-contract', title: 'Scope and data contract', summary: 'Plan location lookup, displayed weather fields, and the data shape the interface needs.' },
      { id: 'weather-modules-and-request-stack', title: 'Modules and request stack', summary: 'Organize request, state, and rendering responsibilities before making network calls.' },
      { id: 'weather-setup-and-search-form', title: 'Setup and search form', summary: 'Set up the page, location input, and accessible result regions for later states.' },
      { id: 'weather-promises-and-async-control-flow', title: 'Promises and async control flow', summary: 'Understand pending, fulfilled, and rejected promises, then async/await and try/catch before using fetch.' },
      { id: 'weather-fetch-and-render', title: 'Fetch and render', summary: 'Request weather data asynchronously and render a successful result from normalized data.' },
      { id: 'weather-loading-empty-and-error-states', title: 'Loading, empty, and error states', summary: 'Make loading, unavailable locations, and failed requests understandable to the user.' },
      { id: 'weather-stale-responses-and-validation', title: 'Stale responses and validation', summary: 'Validate searches and keep an older response from replacing a newer search result.' },
      { id: 'weather-testing-and-export', title: 'Testing and export', summary: 'Test deterministic simulated API fixtures, distinguish an optional live service, debug request failures, and prepare reproducible export and deployment.' },
    ],
  },
  {
    id: 'react-task-dashboard', title: 'React Task Dashboard', description: 'Rebuild familiar task workflows with React components, state, effects, and a deliberate UI structure.', topics: [
      { id: 'react-dashboard-scope-and-component-map', title: 'Scope and component map', summary: 'Turn dashboard requirements into component boundaries, props, and state ownership.' },
      { id: 'react-stack-and-project-setup', title: 'React stack and project setup', summary: 'Compare vanilla JS, React with Vite, and a full-stack framework; explain when components help, dependencies, configuration, JSX bundling, and entry files.' },
      { id: 'react-components-props-and-layout', title: 'Components, props, and layout', summary: 'Build presentational dashboard pieces from the component map and pass explicit props.' },
      { id: 'react-task-state-and-interactions', title: 'Task state and interactions', summary: 'Keep task state in the right owner and implement add, complete, and filter interactions.' },
      { id: 'react-effects-persistence-and-errors', title: 'Effects, persistence, and errors', summary: 'Use effects for local persistence and communicate failed or unavailable data clearly.' },
      { id: 'react-testing-and-export', title: 'Testing and export', summary: 'Test the dashboard’s visible behavior and prepare a React project for handoff.' },
    ],
  },
  {
    id: 'amazon-inspired-ecommerce', title: 'Original Amazon-inspired Ecommerce', description: 'Create an original storefront inspired by familiar marketplace patterns without copying Amazon assets or content.', topics: [
      { id: 'shop-scope-catalog-and-originality', title: 'Scope, catalog, and originality', summary: 'Plan an original catalog, shopper flows, and visual identity that does not reuse marketplace branding.' },
      { id: 'shop-stack-data-and-route-plan', title: 'Stack, data, and route plan', summary: 'Choose the client stack and map product, search, cart, and checkout routes to data needs.' },
      { id: 'shop-setup-navigation-and-catalog', title: 'Setup, navigation, and catalog', summary: 'Set up the storefront shell, navigation, and a structured original product catalog.' },
      { id: 'shop-product-details-and-client-server-boundaries', title: 'Product details and client/server boundaries', summary: 'Build product detail routes and not-found states; explain APIs, databases, authentication, and which checks require a server, using clearly labeled local fixtures.' },
      { id: 'shop-product-search-and-filters', title: 'Product search and filters', summary: 'Build search and filters that make catalog results predictable and explain empty results.' },
      { id: 'shop-cart-quantity-and-persistence', title: 'Cart, quantities, and persistence', summary: 'Implement cart changes, quantity rules, totals, and saved-cart recovery.' },
      { id: 'shop-checkout-validation-and-failure-states', title: 'Checkout validation and failure states', summary: 'Simulate checkout with clear validation, confirmation, and recoverable failure states.' },
      { id: 'shop-testing-export-and-handoff', title: 'Testing, export, and independent feature', summary: 'Independently plan and implement a new feature milestone, test storefront flows, prepare deployment, and export with continuation instructions. Checkout remains simulated without real payment collection.' },
    ],
  },
];

const draftOutline = (title: string) => `Phase 1 outline: ${title}. Lesson prose and runnable steps will be authored in the corresponding project phase.`;
const activities = (projectId: string, topic: TopicOutline) => [
  { id: `${topic.id}-reading`, path: `projects/${projectId}/topics/${topic.id}/activities/${topic.id}-reading`, title: `${topic.title}: concepts outline`, kind: 'reading' as const, order: 1, objective: `Identify the decisions needed for ${topic.title.toLowerCase()}.`, outline: draftOutline(topic.title) },
  { id: `${topic.id}-guided`, path: `projects/${projectId}/topics/${topic.id}/activities/${topic.id}-guided`, title: `${topic.title}: guided coding outline`, kind: 'guided-coding' as const, order: 2, objective: `Plan the smallest implementation step for ${topic.title.toLowerCase()}.`, outline: draftOutline(topic.title) },
  { id: `${topic.id}-reflect`, path: `projects/${projectId}/topics/${topic.id}/activities/${topic.id}-reflect`, title: `${topic.title}: explanation after practice`, kind: 'reading' as const, order: 3, objective: 'Connect the observed behavior to the next idea.', outline: draftOutline(topic.title) },
];
const challenges = (projectId: string, topic: TopicOutline) => [1, 2, 3].map((order) => ({
  id: `${topic.id}-challenge-${order}`, path: `projects/${projectId}/topics/${topic.id}/challenges/${topic.id}-challenge-${order}`, title: `${topic.title} challenge ${order}`, order,
  objective: draftOutline(`${topic.title} challenge ${order}`), starterFiles: {}, instructions: [draftOutline('challenge instructions')], examples: [draftOutline('challenge example')], behaviorValidation: { observable: draftOutline('observable behavior'), checks: [draftOutline('behavior check')] }, hints: [draftOutline('hint')], reference: [`${topic.id}-reading`, `${topic.id}-guided`],
}));

// Phase 1 contained only unpublished outlines. The self-contained pilot now opens
// the path; no prerequisite outline is marked complete on the learner's behalf.
const pilotIndex = projects[0].topics.findIndex(topic => topic.id === domTodoTopic.id);
projects[0].topics.unshift(...projects[0].topics.splice(pilotIndex, 1));
let precedingTopic: string | undefined;
export const curriculum: Curriculum = {
  id: 'javascript-to-projects', title: 'From JavaScript to working projects', prerequisiteKnowledge: ['Basic HTML and CSS', 'Basic JavaScript syntax'], version: 1, status: 'draft',
  progression: { minimumDistinctCorrectQuestionIds: 10, revealedAnswerEarnsCreditOnSameId: false, freshEquivalentRequiredAfterReveal: true, wrongAnswerResetsProgress: false, retryOrder: 'exhaust-unseen-before-missed' },
  projects: projects.map((project, order) => ({ id: project.id, path: `projects/${project.id}`, title: project.title, order: order + 1, status: 'published' as const, description: project.description, prerequisiteProjectIds: order === 0 ? [] : [projects[order - 1].id], topicIds: project.topics.map((topic) => topic.id) })),
  topics: projects.flatMap((project) => project.topics.map((outline, index) => {
    const prerequisiteTopicIds = precedingTopic ? [precedingTopic] : [];
    precedingTopic = outline.id;
    if (outline.id === domTodoTopic.id) return domTodoTopic;
    const authored = [...todoPhase3Topics, ...weatherTopics, ...reactTopics, ...ecommerceTopics].find(topic => topic.id === outline.id);
    if (authored) return { ...authored, order: index + 1, prerequisiteTopicIds };
    const topic = { id: outline.id, path: `projects/${project.id}/topics/${outline.id}`, projectId: project.id, title: outline.title, order: index + 1, status: 'draft' as const, summary: outline.summary, prerequisiteTopicIds, activities: activities(project.id, outline), blanks: [], assessmentQuestions: [], challenges: challenges(project.id, outline) };
    return { ...topic, gate: { type: 'topic-gate' as const, guidedActivityIds: [`${outline.id}-guided`], requiredChallengeIds: topic.challenges.map((challenge) => challenge.id), minimumDistinctCorrectQuestionIds: 10 as const, revealedAnswerEarnsCredit: false as const, requiresFreshEquivalentAfterReveal: true as const, wrongAnswerResetsProgress: false as const, retryPolicy: 'exhaust-unseen-before-missed' as const } };
  })),
};

export const content = curriculum;
export default curriculum;


