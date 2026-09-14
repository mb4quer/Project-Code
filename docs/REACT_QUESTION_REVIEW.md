# React question-bank review

Status: draft for root-agent review. All React assessment questions currently use `reviewed: false`.

`src/content/reactQuestions.ts` exports `reactQuestions(topicId: string): AssessmentQuestion[]` and provides six banks for the React Task Dashboard project. Each bank contains 24 questions: six prediction, six debugging, six explanation, and six application items.

| Topic ID | Focus | Equivalence groups |
| --- | --- | --- |
| `react-dashboard-scope-and-component-map` | Requirements, component boundaries, ownership, derived views, identity, interaction flow | `requirements-boundary`, `component-responsibility`, `state-ownership`, `derived-view`, `stable-identity`, `interaction-flow` |
| `react-stack-and-project-setup` | React tradeoffs, JSX, entry modules, dependencies, imports, build output | `react-tradeoff`, `jsx-transform`, `module-entry`, `dependency-boundary`, `import-export`, `build-output` |
| `react-components-props-and-layout` | Props, callbacks, semantic layout, labels, keyboard access, composition | `props-data-flow`, `callback-events`, `semantic-layout`, `label-association`, `keyboard-accessibility`, `component-composition` |
| `react-task-state-and-interactions` | Immutable updates, functional setters, keys, filtering, controlled inputs, submit boundaries | `immutable-update`, `functional-updater`, `stable-key`, `filter-derived-state`, `controlled-input`, `single-transition` |
| `react-effects-persistence-and-errors` | Effect dependencies, cleanup, stale async work, serialization, recovery, migration | `effect-dependencies`, `cleanup-cancellation`, `stale-async`, `storage-serialization`, `validation-recovery`, `migration-compatibility` |
| `react-testing-and-export` | Observable behavior, async waiting, fixtures, selectors, compiled artifacts, handoff checks | `visible-behavior`, `async-test-waiting`, `deterministic-fixtures`, `selector-contract`, `compiled-artifact`, `handoff-verification` |

Each group has four fresh scenarios, one in each reasoning category. The scope bank stays at the planning level; JSX, hooks, keys, props, and DOM implementation are deferred to the authored setup, layout, and state readings. Application prompts use deterministic choices or exact code answers and introduce any prerequisite syntax in the prompt. Persistence questions follow the authored current envelope `{version:2,tasks}` and its legacy `Task[]` migration. Testing questions use native DOM assertions, cleanup, and the extracted root `index.html` served with `python -m http.server 8080`; they do not assume an uninstalled testing library. Stable question IDs and paths use the React project/topic/question contract so saved progress can survive content revisions.

Review checklist for the content owner:

- Confirm each bank remains exactly 24 questions with six items per category.
- Check conceptual answer choices and code alternatives for unambiguous normalization.
- Confirm equivalent scenarios are genuinely different transitions, diagnoses, or contexts.
- Set `reviewed: true` only for questions that pass review; leave rejected items false until revised.
- Integrate the function into React topic construction without changing existing project IDs or prior content files.
