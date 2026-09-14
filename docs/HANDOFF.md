# Handoff — Phase 4

Updated 2026-09-14. **Phase 4 is complete and accepted.** Stop after Phase 4. Phase 5 remains unimplemented.

## Verified starting point and preserved work

Before any change, Astra read the five continuity files and verified the Phase 3 repository: 44 unit tests, content inventory 4 projects / 7 published topics / 22 drafts, and all 24 existing Edge scenarios passed. The app files were already untracked. No commits, branch changes, dependency upgrades, deployment or user-browser data modifications were made.

Phase 1 vanilla/React execution, editor, compilation errors, common-loop guard, console, Run/Stop, assets, resizing, autosave, checkpoints, reset, backup/restore and stale-tab behavior remain covered. Phase 2/3 Todo IDs, identities, question banks and reference source are unchanged. SHA-256 checks in tests/fixtures/phase3-preserved.json protect the original content, engine, store, compiler, loop instrumentation, training-storage module and lockfile.

Schema 1 and learning extension version 1 are unchanged. Existing demo, project and challenge files, selected files, versions, checkpoints, training maps and mastery remain separate and survive migration/resume. Entering Weather initializes only missing workspaces. Later React/ecommerce drafts are not auto-completed. Browser tests use isolated Edge profiles rather than the user's ordinary profile.

## Completed Weather scope

Eight published topics retain the outlined sequence and IDs: scope/data contract; modules/request stack; setup/search form; promises/async control flow; fetch/render; loading/empty/error states; stale responses/validation; testing/export. They follow the complete Todo curriculum and unlock the first React draft only after Weather completion.

Weather contains 40 interleaved activities (24 readings and 16 graded guided increments), 16 conceptual/code blanks, 192 reviewed questions (24 per topic; six each of prediction/debugging/explanation/application), and exactly 24 separate behavior-graded challenges (three per topic). Combined published inventory: 15 topics, 75 activities, 32 blanks, 368 reviewed questions and 45 challenges; 14 later topics remain drafts. Gates require activities/blanks, ten distinct correct credits and all three challenges. Misses preserve credits; revealed identities are retired and require fresh equivalents. Review notes are in WEATHER_QUESTION_REVIEW.md.

The reference app validates trimmed city length 2–80, checks HTTP success before reading JSON, validates normalized fields including finite temperatures, renders literal data, separates loading/no-match/HTTP/malformed/offline states and guards success/error completions with request identity. Invalid submissions and mode changes retire pending work. Smoke runs real form success, invalid-input no-call and HTTP-error assertions, restores all prior form/output/mode/control state, and refuses to interrupt a pending normal lookup.

## Deterministic fixtures and optional live data

Run begins in Fixture mode. London is 18°C/Cloudy; Paris 22°C/Clear; Empty and unknown cities return null; Error/Error503 resolves HTTP 503; Offline rejects; Malformed has invalid field types; Slow resolves after 80 ms; Fast after 5 ms; SlowError rejects after 80 ms; Literal exercises zero Celsius and HTML-looking text. These are simulated fixtures, not current observations. All grading is fixture-only and needs no network.

Optional Live requires the host checkbox **Allow optional live weather for this Run**, followed by the app opt-in and Live selection. The host sends searched cities through fixed Open-Meteo geocoding/forecast adapters. It omits cookies/referrers, rejects redirects, validates responses, limits each streamed body to 65,536 bytes, and uses a six-second deadline. The bridge validates current frame/run/nonce/request identity, bounds replies, allows four pending and six live lookups per minute per run, and aborts requests on Stop. Navigation/Stop/reload revoke host consent. Direct iframe networking remains blocked by the original opaque sandbox/CSP.

Open-Meteo and GeoNames attribution and noncommercial-use terms are labeled in the UI, content and export. Live uses the first geocoding match; city ambiguity, service availability and changing observations remain limitations. A real public London request succeeded through the actual adapter on 2026-09-14 (HTTP 200). Automated browser live tests control provider HTTP responses; they do not depend on current weather.

## Run and export

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Continue through Dashboard. Existing mastery unlocks Weather after Todo; references are read-only comparisons and should be merged into continuing project work. Nothing runs automatically after reload.

Export runnable ZIP compiles the selected draft into root index.html and includes exact editable originals under source/ plus README.md. Weather exports include the fixture/default and optional live adapters. Extract the archive, run `python -m http.server 8080` in its root, and open http://localhost:8080. Any static HTTP server works. Editing source/ alone does not rebuild the root; edit in Project Code and export again. Source-only execution needs an adapter. Exports contain no session, mastery, host credentials or saved training-data snapshot and do not constitute publication.

## Acceptance evidence

| Check | Result |
| --- | --- |
| `npm test` | 63 passed across 10 files |
| `npm run validate:content` | 4 projects, 15 published topics, 14 drafts |
| `npm run build` | TypeScript and Vite production build passed |
| Full development Edge suite | 33 passed (3.3 minutes), final source |
| Production Edge suite | 19 passed (1.8 minutes), built production app |
| Independent ZIP CRC/source check | Python zipfile CRC passed; 7 readable entries each for Weather and Todo |
| Desktop/mobile visual inspection | Completed desktop dashboard, 390px lesson and 390px standalone Weather inspected; no page overflow |

Weather matrix covers all 40 guided/challenge reference programs and all 40 unfinished starters, 12 representative incorrect programs and eight first-increment partial programs. First increments pass their own checks and fail full contracts. Full smoke grading substitutes incorrect London data to prove a missing assertion fails. Original Todo matrices and compiler/loop examples remain in the suite. The export check also verifies pending-lookup smoke refusal, explicit standalone Live selection using controlled HTTP, and restoration of Live mode after temporary fixture smoke tests.

The eight-topic UI journey retires an answer, earns ten distinct credits, reloads at five credits in every topic, completes all 24 challenges, preserves Todo mastery/source/training data and demo/project notes, and verifies React draft unlock. Unit tests stress reveal exhaustion/misses and migration/resume without changing existing workspaces.

Production command after build (source-import matrix/capability tests run on Vite development):

```powershell
$env:PROJECT_CODE_TEST_URL = 'http://127.0.0.1:4173'
npx playwright test tests/e2e/workspace.spec.ts tests/e2e/lesson.spec.ts tests/e2e/phase3-journey.spec.ts tests/e2e/phase3-runtime.spec.ts tests/e2e/phase4-journey.spec.ts tests/e2e/weather-export.spec.ts
```

An earlier full run passed 32/33 with an isolated storage-probe console timeout. The unchanged test then passed three consecutive reruns and the final full suite; no storage implementation was altered for it.

Do not edit source or run prepare:runtime during browser acceptance; Vite reloads invalidate in-progress tests. This Windows host requires process sandbox escalation for esbuild/build/Edge. No new dependency audit result is claimed.

## File map

- Curriculum/reference/questions: src/content/weather.ts, weatherReferences.ts, weatherQuestions.ts; integration in curriculum.ts.
- Capability: src/runtime/weatherApi.ts; additive wiring in runtime/index.ts and contracts.ts.
- Grading: src/lesson/weatherAssessment.ts and grader.ts.
- Host/export: src/main.ts, src/lesson/ui.ts, src/style.css, src/exportProject.ts.
- Unit acceptance: tests/weather-api.test.ts, phase4-progression.test.ts, phase4-preservation.test.ts.
- Browser acceptance: tests/e2e/weather-matrix.spec.ts, weather-capability.spec.ts, weather-export.spec.ts, phase4-journey.spec.ts.
- Preserved regression suite and Phase 1–3 continuity remain in their existing locations.

## Limitations and delegation

Grading is client-visible educational checking, not tamper-proof assessment. Scope/file-plan prose checks verify declared terms and responsibilities, with editorial review supplying semantic judgment. The runtime guards common loops/timeouts but has no complete hostile-code CPU/memory quotas. Local persistence retains optimistic revision checks, not atomic cross-tab transactions or cloud durability. Browser quota/private mode/data clearing can still affect saves; JSON backup remains the recovery route. Optional live service is external, first-match and noncommercial; fixtures remain the acceptance basis. Export is a compiled snapshot requiring re-export after source changes. No accounts, backend, terminal, real payments, deployment or Phase 5 implementation was added.

Astra planned, reviewed, integrated and accepted the work. Terra handled scoped Weather engineering/reference/grader/tests; Luna supplied bounded question drafts. Astra corrected the final banks and integration. No recursive delegation occurred and at most three workers were active together. After the Terra worker reached its usage limit, Astra completed remaining fixes and acceptance locally.

## Phase 5 prompt

Continue Project Code in this same repository with Phase 5 only, using GPT-6 Astra as planner, orchestrator and integration/acceptance owner. Read PROJECT_BRIEF.md, docs/ARCHITECTURE.md, docs/CURRICULUM.md, docs/PHASES.md and docs/HANDOFF.md first, and verify the repository matches the Phase 4 handoff before changing anything. Preserve the verified Phase 1 runtime, every Phase 2–4 published ID and earned mastery, every saved demo/project/challenge draft and checkpoint, schema-1 compatibility, scoped training data, deterministic Weather fixtures, the explicit optional live-data capability and runnable export. Complete the six React Task Dashboard topics in their saved order: component planning and stack tradeoffs, React setup, props/layout, task state, effects/persistence/error recovery, and testing/export. Teach prerequisites before use, effect cleanup and stale async work, accessible loading/empty/error states, migration/resume and runnable React export. Use reviewed banks of at least 20 distinct questions per topic, cumulative ten-distinct-correct mastery, fresh equivalents after reveal, and exactly three behavior-graded challenges per topic. Use Terra for scoped engineering/tests and Luna for bounded drafts, with Astra reviewing and integrating; at most three simultaneous workers and no recursive delegation. Implement, run and verify references, representative incorrect programs, migration/resume and progression while preserving the complete regression suite. Update all five continuity files, report exact check results and limitations, include the Phase 6 prompt, and stop after Phase 5.
