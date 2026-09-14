# Curriculum outline

Curriculum version `1`, learning path `javascript-to-projects`, now contains seven published Vanilla Todo topics, eight published Async Weather topics, and 14 draft topics across four projects. The two runtime demos in `src/data/demos.ts` remain executable proofs, separate from course content. Published IDs are now durable; future edits must preserve assessment identities.

The four project sequence is cumulative:

1. **Vanilla Todo** — scope and flows; web stack and files; setup and layout; DOM events and state; filters and input errors; storage recovery; testing and export.
2. **Async Weather** — data contract; request modules; setup; promises and async/await; fetch and rendering; loading and error states; stale-response prevention; testing with deterministic fixtures and export.
3. **React Task Dashboard** — component planning; React setup; props and layout; task state; effects, persistence, and errors; testing and export.
4. **Original Amazon-inspired Ecommerce** — original catalog and scope; stack and routes; storefront setup; product details and client/server/API/database/auth boundaries; search and filters; cart persistence; simulated checkout validation; testing, export, and an independent feature milestone. No real payment data.

The self-contained DOM/Todo pilot is first, with no prerequisite topic. It teaches the planning, stack and setup foundations it uses. The remaining published Todo topics follow: scope/user flows, web stack/file plan, setup/static layout, filters/input errors, storage/recovery, testing/export. Each subsequent topic depends on the topic immediately before it, including transitions between projects. This means planning, stack choice, and setup are taught before the features that use them; failure states come before the testing and export work that verifies them.

Each of the 14 remaining draft topics has a reading outline, a guided-coding outline, a follow-up reading, and three ordered challenge slots. A published topic must instead provide interleaved reading and guided work with non-draft explanations, instructions, hints, and—where code is guided—starter files, observable validation, and a reference solution. A published challenge has actual `Files` starter and reference-solution maps, not a prose substitute.

Published topics require conceptual and code blanks. Normalization trims outer whitespace and normalizes line endings to LF. Conceptual answers may ignore case and collapse whitespace. Code answers must preserve case and internal whitespace; equivalent spellings are enumerated explicitly so different identifiers and string values are not falsely accepted. Questions have stable IDs and identities, a reasoning category (`prediction`, `debugging`, `explanation`, or `application`), and misconception feedback. At least 20 reviewed question IDs and identities must be distinct, with all four reasoning categories represented.

The topic gate records every guided activity ID and all three challenge IDs. It requires 10 distinct correct question IDs. Revealing an answer earns no credit for that ID and needs a fresh equivalent afterwards; wrong answers retain existing progress. Missed items are retried only after all eligible unseen items have been exhausted.

Run `npm run validate:content` to validate paths, stable IDs, references, prerequisites, ordering, challenge/gate coverage, and published-content completeness. The validator rejects a draft placeholder promoted to published status.

Content validation covers 4 projects / 29 topics: 15 authored Todo/Weather topics and 14 later drafts. The original pilot bank and IDs are preserved. No draft receives automatic completion.

## Published DOM/Todo pilot

`src/content/domTodo.ts` defines `todo-dom-events-and-task-state`:

1. Read planning, plain files/Vite/React tradeoffs, the selector contract and modules.
2. Guided add: trim, reject empty input, render literal labels, clear valid input, preserve multiple tasks.
3. Read state, map/filter/spread, stable IDs, callbacks, live checkbox properties and derived counts.
4. Guided CRUD: extend the saved add draft with independent toggle/delete and count updates.
5. Read behavioral debugging and plan independent CRUD.

Four required blanks cover outer whitespace, literal rendering, stable IDs, and preserving nonmatching records. `src/content/domQuestions.ts` contains 32 reviewed questions: eight per reasoning category. The first 24 form the main bank; eight additional scenarios provide fresh concept-equivalent work. Equivalence groups are events, rendering, state and identity. Short code completions and labeled explanation choices keep grading deterministic; accepted quotes and conceptual aliases are explicitly listed. Astra reviewed and revised the Luna draft for ambiguous prompts, missing prerequisites, unsafe answer normalization and duplicate reasoning identities. See `docs/CONTENT_REVIEW.md`.

Exactly three challenges are authored and behavior-graded: `todo-dom-apply` (validated adds), `todo-dom-debug` (repair numeric/string ID comparison while preserving CRUD), and `todo-dom-combine` (independently combine full in-memory CRUD). Each has its own starter and saved workspace, examples, acceptance criteria, progressive hints and a read-only reference. Guided work continues in one project workspace. Fresh Run/check resets preview task data; source files and earned progress persist.

Reveals retire the same identity and prioritize an unseen question in the same equivalence group. When no fresh equivalent remains, or another reveal would leave fewer than ten earnable identities overall, reveal is blocked with an explanation. The learner can answer the retained item; wrong answers retain all prior credit and eventually rotate through misses. Gate completion requires all activities, all blanks, ten distinct correct identities/IDs and all three challenge passes. Subsequent topics show prerequisite unlock separately from whether their content has been published.

## Completed Vanilla Todo curriculum (Phase 3)

After the pilot, the six newly authored topics use five activities each (read, guided increment, read, guided extension, read), two topic-specific blanks, 24 reviewed questions and exactly three apply/debug/combine challenges. That gives the complete Todo project 35 activities, 16 blanks, 176 questions and 21 independent challenges.

| Topic | Practical addition to the continuing project |
| --- | --- |
| Scope and user flows | A visible flow specification beside CRUD, with happy paths, invalid input, empty/filter states and scope boundaries |
| Web stack and file plan | Plain files/Vite/React comparison, chosen vanilla modules, relative imports/exports, four file responsibilities |
| Setup and static layout | Semantic form/list, label association, non-submit controls, live error/count regions, keyboard and responsive layout |
| Filters, empty states, and input errors | Separate view state, All/Active/Completed, non-destructive projections, blank feedback, contextual empty states and filtered deletion |
| Storage and recovery | Promises/async/await before use, JSON and shape validation, restored identities, startup guard, ordered writes, failed read/write recovery |
| Testing and export | Actual DOM smoke assertions, state cleanup, regression fixtures, host runnable ZIP, static server and deployment preparation |

`todoPhase3Questions.ts` supplies six distinct items per reasoning category in each bank. Equivalence groups cover related concepts with different transitions, diagnoses or application work. Astra reviewed the Luna draft, replaced duplicate path scenarios and ambiguous blanks, corrected JSON.parse(null), added exact code alternatives and balanced conceptual choices. Reveals still require an unseen same-group equivalent and ten remaining earnable identities. The progression suite exhausts misses and repeated reveals in every new topic, serializes/reloads, then obtains ten distinct credits.

Training data persists only through the scoped asynchronous capability; ordinary variables still reset on Run. Each project/challenge map is independent. Source work always carries forward: references show possible completed files but navigation never overwrites the current project. Setup/planning additions must be merged into the existing app. Grading uses isolated data fixtures and cannot modify the saved project, challenges or preview data. Accounts, React lessons and ecommerce remain future phases. Phase 4 Weather is described below.

## Async Weather curriculum (Phase 4)

Eight topics retain the existing outline IDs and sequence. Each contains read/guided/read/guided/read activities, a conceptual and a code blank, 24 reviewed questions, and exactly three separate apply/debug/combine challenges. Weather contributes 40 activities, 16 blanks, 192 questions and 24 challenges; combined with Todo the published inventory is 75 activities, 32 blanks, 368 questions and 45 challenges. Phase 4 is accepted: all 40 Weather references pass, all 40 unfinished starters and 12 targeted mutants fail, and the complete eight-topic progression is verified in development and production.

| Topic | Increment |
| --- | --- |
| Scope and data contract | Bounded city input, Celsius data shape, no-match versus service failure, deterministic scope |
| Modules and request stack | Plain modules/Vite/React tradeoffs, explicit imports and file responsibilities, observable normalization |
| Setup and search form | Form submission, labels/live regions, local input bounds and explicit fixture/live controls |
| Promises and async control flow | Pending, fulfillment, rejection, async/await and try/catch with local delayed work before fetch |
| Fetch and render | Await response then JSON, HTTP status guard, normalized literal rendering including zero Celsius |
| Loading, empty, and error states | Clear old output; pending, no match, 503, malformed and offline recovery |
| Stale responses and validation | Reject invalid requests; protect latest intent from old success/error and mode changes |
| Testing and export | Real repeatable smoke assertions and cleanup, deterministic fixtures, compiled runnable export and rebuild guidance |

The injected fetch-like API is not unrestricted network fetch. Fixture names are London (18°C, Cloudy), Paris (22°C, Clear), Empty/unknown (null), Error (resolved 503), Offline (rejected), Malformed (invalid data), Slow (80ms), Fast (5ms), SlowError (80ms rejected) and Literal (HTML-like strings with 0°C). Grading has only fixtures. The optional Open-Meteo live adapter requires explicit host permission for the Run and an in-app choice; it is never needed for progression. Export starts in fixtures and contains the adapter and original source; standalone Live uses the app opt-in without the course host checkbox.

All seven Todo topics remain byte-for-byte preserved. Weather's cumulative ten-distinct-correct rule uses the unchanged engine: misses retain credits, reveals retire identities and schedule unseen concept equivalents, reserve guards preserve attainability, and completed work remains reviewable. Weather completion unlocks the first React draft without publishing or completing it. See WEATHER_QUESTION_REVIEW.md for final editorial review and HANDOFF.md for acceptance evidence.
