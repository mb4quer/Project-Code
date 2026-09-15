# Handoff — Phase 5 React acceptance

Updated 2026-09-15. This continuation follows GitHub commit `799923694269cec1c257b597e9b28349eeda4cee` (Add React curriculum assessment flow). The checkout was clean and matched origin/main; a fetch and remote head check found no newer branches or pull-request heads. The prior handoff described Phase 4, while the code already contained Phase 5. This task verifies and finishes that implementation, then stops after Phase 5. Phase 6 is not implemented.

## Preserved baseline

The initial continuation check found 70 passing unit tests and one preservation failure, valid content (4 projects / 21 published topics / 8 drafts), and a passing production build. The failure was caused by Git checkout line endings: all 18 protected files matched the pre-React commit after LF/CRLF normalization, and all existing expected hashes matched CRLF text. The test now normalizes only line endings to the immutable manifest format. Expected hashes and protected source files were not changed. The corrected suite passed all 71 tests.

Session schema 1, learning extension version 1, Todo and Weather published identities/mastery, demo/project/challenge drafts, checkpoints, scoped training maps, the runtime/compiler and dependency lockfile remain protected. React initializes only missing workspaces. Weather fixtures and explicit optional live permission retain their existing behavior. Local persistence remains optimistic rather than atomic across tabs.

## React scope

Six published topics retain their saved order: component planning and stack tradeoffs; React setup; props/layout; task state; effects/persistence/error recovery; testing/export. They contain 30 interleaved activities, 12 blanks, 144 questions (24 per topic, six per reasoning category), and exactly 18 independent apply/debug/combine challenges. Combined inventory: 21 published topics, 105 activities, 44 blanks, 512 questions, and 63 challenges. Eight ecommerce topics remain drafts.

The unchanged progression engine requires activities/blanks, ten distinct correct credits and three challenge passes. Misses preserve credit; reveal retires the identity and requires a fresh equivalent. Entering a lesson never replaces existing project source. React completion unlocks only the first ecommerce draft.

The reference uses real JSX components, immutable task updates, duplicate-safe identity, derived filters/counts, labelled controls and live feedback. Persistence recognizes a validated legacy array or `{version:2,tasks}` learner payload; unknown versions, duplicate IDs, malformed JSON and read failures require explicit recovery. This payload version is independent of the course-session schema. Writes are ordered; failure retains visible edits. Local async task fixtures teach cleanup and stale success/error protection without network access.

## Continuation fixes and verification

The continuation corrects grading assumptions about seeded completion counts, requires the full scope flow, separates setup's first and full increments, and makes unfinished starters fail for concrete behavioral defects. State mutants now remain valid JavaScript so their behavior can be assessed. Layout lessons name the supplied static fixture labels used by their checks.

Async fixture output is separate from saved dashboard tasks. Hiding the panel retires pending requests and clears its output; callbacks that ignore abort are guarded. Smoke exercises blank rejection, literal add, completion, filtering and a persisted result. It snapshots existing data before changing anything, refuses startup/pending sync, prevents overlapping interaction, drains queued writes, and restores task/input/filter/error/storage state before reporting completion. Failed initial snapshot reads never trigger destructive cleanup. The standalone export tests inject read/write failures and verify the original saved record remains intact.

The UI now accurately lists Todo, Weather and React as available, and labels React breadcrumbs, lesson headers, resume controls and project files correctly. The older Weather journey assertion is updated to expect the now-published React topic to be available with zero earned credits, rather than an unpublished unlocked draft. Question clarifications preserve IDs and accepted answers. The six-topic journey adds mid-challenge reload with no autorun and explicit React project/challenge checkpoint, notes and training-map preservation.

| Check | Exact result |
| --- | --- |
| npm test | 71 passed across 12 files |
| npm run validate:content | 4 projects; 21 published topics; 8 drafts |
| npm run build | TypeScript and Vite production build passed; main-bundle size warning remains at about 530 kB |
| Focused React browser checks | 5 passed (2.7 minutes) |
| Full development regression | 37/38 passed (6.2 minutes); only the outdated React-draft assertion failed |
| Corrected Weather journey | 1 passed (45.6 seconds); all 38 development scenarios now verified across those runs |
| Production browser acceptance | In progress |
| Independent ZIP check | CRC passed; 10 readable entries, including the export test's notes.txt source |
| Visual inspection | Desktop dashboard, 390px React lesson and 390px standalone dashboard inspected; no page overflow |

The full development run passed every runtime, grading, storage, export and React journey check. Its sole failure was an expectation that React remained an unpublished draft after Weather. The corrected test explicitly requires an enabled React topic and zero earned credits. No runtime change was needed for that failure.

Production acceptance command (run after build; source-import matrix tests belong to development):

```powershell
$env:PROJECT_CODE_TEST_URL = 'http://127.0.0.1:4173'
npx playwright test tests/e2e/workspace.spec.ts tests/e2e/lesson.spec.ts tests/e2e/phase3-journey.spec.ts tests/e2e/phase3-runtime.spec.ts tests/e2e/phase4-journey.spec.ts tests/e2e/weather-export.spec.ts tests/e2e/phase5-journey.spec.ts tests/e2e/react-export.spec.ts --output=test-results/production
```


## Run and export

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173 and use Dashboard. React follows completed Todo and Weather mastery. References are read-only comparisons to merge into continuing work. Reload never runs source automatically.

Export runnable ZIP creates compiled root `index.html`, exact editable files under `source/`, and README instructions. Extract it and run `python -m http.server 8080` from the root, then open http://localhost:8080. The React bundle and scoped standalone storage adapter are included. Source-only JSX requires a build; editing `source/` alone does not rebuild root index.html. Edit in Project Code and export again. Exports contain no course session, mastery, checkpoints, host credentials or saved training-map snapshot. Export is not publication.

This Windows host needs process sandbox escalation for esbuild/build/Edge. Browser acceptance uses isolated profiles. Do not edit source or run prepare:runtime while browser tests run: Vite reloads invalidate in-progress checks. Dependencies were not upgraded and no new dependency audit is claimed.

## File map

- Content: src/content/react.ts, reactQuestions.ts, reactReferences.ts; integration in curriculum.ts.
- Grading: src/lesson/reactAssessment.ts and additive dispatch/storage scenarios in grader.ts.
- Acceptance: tests/phase5-progression.test.ts, phase5-preservation.test.ts; tests/e2e/react-matrix.spec.ts, phase5-journey.spec.ts, react-export.spec.ts.
- Question review: docs/REACT_QUESTION_REVIEW.md.
- Earlier phase history and acceptance: docs/PHASES.md.

## Limitations and delegation

Grading is client-visible educational checking, not tamper-proof assessment. Planning checks inspect declared terms and responsibilities; semantic content review supplies additional judgment. Common-loop guards do not provide complete hostile-code CPU/memory isolation. Browser quota/private mode/data clearing can affect local saves; JSON backup remains the recovery route. There is no account sync, backend, terminal, real payment collection or deployment. Weather live data retains its external service and noncommercial-use limits. React task API examples are deterministic local simulations.

Astra owns planning, integration and acceptance. Terra handles bounded React engineering and browser tests; Luna reviews content and drafts the curriculum inventory; Astra reviews and integrates their work. At most three agents run together, with no recursive delegation. The model choices follow the repository brief and user instructions.

## Phase 6 prompt

Continue Project Code in this repository with Phase 6 only. Use GPT-6 Astra for planning, integration and acceptance, Terra for scoped engineering/tests and Luna for bounded content drafts; at most three agents and no recursive delegation. Read PROJECT_BRIEF.md, docs/ARCHITECTURE.md, docs/CURRICULUM.md, docs/PHASES.md and docs/HANDOFF.md first, and verify the accepted Phase 5 baseline before edits. Preserve Phase 1 runtime, every Phase 2–5 published ID/identity and earned mastery, all demo/project/challenge source and checkpoints, schema-1 migration/resume, scoped training maps, Weather fixtures/live consent, React persistence and runnable exports. Complete only the eight existing ecommerce topics in order: original catalog/scope; stack/routes; storefront setup; details and client/server/API/database/auth boundaries; search/filter; cart persistence; simulated checkout validation; testing/export plus an independent feature milestone. Teach prerequisites before use, use original branding and deterministic local product fixtures, distinguish simulations from backend capabilities, collect no real payment data, and leave durable accounts/auth/backend implementation for Phase 7. Each topic needs at least 20 reviewed distinct questions, cumulative ten-distinct-correct mastery, fresh equivalents after reveal, and exactly three behavior-graded challenges. Verify reference programs, unfinished starters, representative incorrect programs, early/full increments, progression, reload/migration, prior-work preservation, responsive accessibility and independent runnable export. Update all five continuity files with exact results and limitations, include the Phase 7 prompt, and stop after Phase 6.
