# React question-bank review

Status: reviewed for root-agent integration. All React assessment questions currently use `reviewed: true` after the content and answer-normalization review.

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

Review checklist completed by the content owner:

- Each bank contains exactly 24 questions with six items per category.
- Conceptual choices and code blanks use deterministic, unambiguous accepted answers.
- Equivalent scenarios are distinct transitions, diagnoses, or contexts within their equivalence group.
- Questions that passed review are emitted with `reviewed: true`; no rejected items remain in the published banks.
- `reactQuestions` is integrated into React topic construction without changing project IDs or prior content files.

## Continuation review

Astra reviewed the banks after Luna's inventory check. The continuation makes the local-import filename explicit, distinguishes two queued setters in one handler from separate events, and supplies bounded response choices for callback, composition and cancellation questions. These clarifications preserve question IDs, identities, equivalence groups, and accepted answers. Editorial review complements the content/progression checks; `reviewed: true` alone is not evidence of semantic correctness.
