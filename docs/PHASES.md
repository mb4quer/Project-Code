# Phase acceptance

Updated 2026-09-14. Phases 1–3 are preserved and accepted. Phase 4 is complete and accepted. This continuation stops after Phase 4.

## Phase 1 — Complete

- [x] Inspect the repository and preserve existing work: initial checkout contained only `.git`; no existing app was overwritten.
- [x] Choose and document the simplest stack: Vite/TypeScript static host, browser compiler worker, no backend.
- [x] Define versioned content, stable IDs, prerequisites, cumulative progression and published-content validation.
- [x] Define local persistence, conflict/failure handling, account migration direction, and isolated runtime boundaries.
- [x] Outline all four specified projects: 29 draft topics, zero claimed completed lessons or question banks.
- [x] Editable multi-file HTML/CSS/JS and a real live preview, local modules and SVG/text/CSS imports.
- [x] Real React JSX compilation and reactive state updates.
- [x] Readable compile/runtime errors, console output, explicit Run/Stop, timeout and common-loop recovery.
- [x] Save/reload, active file/example resume, checkpoints, scoped resets, JSON backup/restore and stale-tab handling.
- [x] Resizable panels, keyboard file navigation/shortcuts and narrow-screen layout.
- [x] Automated and visual verification; remaining runtime/durability limits documented.

Validation performed:

| Check | Outcome |
| --- | --- |
| `npm test` | 25 tests passed across persistence, runtime, and content contracts |
| `npm run validate:content` | 4 projects, 29 draft topics valid |
| `npm run build` | TypeScript check and Vite production build passed |
| `npm run test:e2e` | 8 browser scenarios passed in headless Edge |
| Production preview targeted browser checks | Vanilla interactions/restart, React state, imported text/SVG/CSS passed |
| `npm ci --dry-run` | Passed; actual installed dependencies are lockfile-managed |
| `npm audit --audit-level=moderate` | 0 vulnerabilities reported after updating Vitest to 4.1.11 |
| Visual review | Desktop workspace viewed in Codex browser; 390px no-page-overflow assertion passed |

The automated scenarios exercise actual behavior; they are not lesson assessments. Failed integration checks exposed and led to fixes for compiler output mapping, stale iframe navigation, regex corruption of bundled React source, submit-event sandbox permissions, and preserving CSS when rendering replaces body contents.

## Phase 2 — Complete

- [x] Reusable content-driven lesson UI with dashboard, saved step resume and derived topic unlocking.
- [x] One useful self-contained DOM/Todo topic, placed before unused draft outlines without fake prerequisite credit.
- [x] Five interleaved activities (three readings / two guided coding), four conceptual/code blanks, and 32 Astra-reviewed questions with stable distinct IDs and identities.
- [x] Ten distinct correct credits persist cumulatively; wrong answers retain credit; unseen-first scheduling and missed-question rotation avoid exhaustion dead ends.
- [x] Reveals retire an identity and schedule a fresh same-concept item. Reveal stops before equivalent reserves or ten-credit capacity are exhausted.
- [x] Exactly three independent challenges: apply, debug, combine. All five guided/challenge references pass actual browser behavior tests; starters and representative incorrect programs fail.
- [x] Typed additive schema-1 migration; existing runtime drafts/checkpoints, revisions and legacy progress preserved. One project draft carries through guided work; three challenge drafts remain separate.
- [x] End-to-end course completion, five-credit reload/resume, retired-answer rules, all-missed retries, references/incorrect solutions, and review after completion verified.
- [x] Existing Phase 1 vanilla/React execution, errors, sandbox, reload/reset, backup/import and stale-tab behavior remain verified.
- [x] Continuity files updated; no Phase 3 implementation.

Final acceptance:

| Check | Outcome |
| --- | --- |
| `npm test` | 33 tests passed across 5 files |
| `npm run validate:content` | 4 projects; 1 published topic; 28 drafts |
| `npm run build` | TypeScript and production build passed |
| `npm run test:e2e` | 15 Edge scenarios passed: 8 original + 3 lesson flows + 4 grader matrix scenarios |
| Production preview: lesson + workspace test files | 11 Edge scenarios passed |
| Visual inspection | Desktop dashboard and 390px lesson inspected; no horizontal page overflow |

The grader matrix checks two guided references and three challenge references, rejects all starters, and rejects eight targeted behavior mutants plus syntax and nonterminating-loop examples. The UI journey preserves a Phase 1 draft, reloads at five credits without autorun, finishes ten distinct credits and all three challenges, then verifies successor unlock and completed review. An initial test-only session seeding bug was fixed; another interim run was invalidated by Vite reloads during concurrent source/build changes. Final acceptance ran after edits settled. No dependency versions changed and no new audit result is claimed.
## Phase 3 - Complete

- [x] Verify the repository matches the Phase 2 handoff before changes: 33 baseline unit tests and content inventory matched; preserve untracked files and saved schema.
- [x] Complete all six remaining Vanilla Todo topics in the saved sequence without changing the pilot IDs/identities or auto-completing prerequisites.
- [x] Publish seven Todo topics total: 35 interleaved activities, 16 blanks, 176 reviewed questions and 21 separate apply/debug/combine challenges.
- [x] Review question semantics, explicit answer alternatives and concept-equivalent reserves; prove all six new banks remain achievable through misses, reveals and reload.
- [x] Preserve continuing source, demo/challenge separation, checkpoints, notes, sticky passes, save conflicts and schema-1 compatibility.
- [x] Add a scoped, validated asynchronous training-storage capability with bounded requests, honest failed-save behavior, reload persistence, JSON backup/restore and selected-map reset.
- [x] Teach planning, stack selection, setup, accessible layout, filtering, validation, storage recovery, debugging, actual tests, static deployment preparation and runnable export.
- [x] Verify reference solutions, unfinished starters and representative mutants in browser frames; verify basic increments independently of later required features.
- [x] Complete all six new topics through UI controls, reload halfway in every topic, preserve project notes/demos and verify the Weather draft unlock.
- [x] Export and run the completed Todo independently; verify duplicate identity, filters, reload data and repeated smoke-test cleanup; independently verify ZIP CRC/content.
- [x] Preserve the original Phase 1/2 browser regression scenarios; visually inspect desktop and 390px lesson/dashboard.
- [x] Finish production-browser acceptance and final continuity sign-off.

| Check | Actual outcome |
| --- | --- |
| Final npm test | 44 passed across 7 files |
| Final content validation | 4 projects; 7 published topics; 22 drafts |
| Production build | TypeScript and Vite build passed |
| Development full browser suite | 23 passed before final incremental-grade refinements |
| Final targeted Phase 3 browser run | 9 passed, including the added basic-vs-full matrix; 24 scenarios now exist overall |
| Production browser run | 16 scenarios passed on 2026-09-13 |
| Independent ZIP read | Python zipfile CRC and all 7 expected entries passed |
| Visual review | Completed desktop dashboard and 390px lesson inspected; no horizontal overflow |

The final refinements made early checks accept only their taught increment, added explicit accessibility/full CRUD checks, rejected smoke implementations that only print success, bounded grade storage snapshots and invalidated whole multi-frame runs on cancellation. No dependency change or new audit result is claimed. Detailed commands and limits are in HANDOFF.md.

## Later phases - Not implemented

- [ ] **Phase 5:** React transition dashboard curriculum, stack tradeoffs, components/state/effects, browser build and export.
- [ ] **Phase 6:** original ecommerce capstone, routing/catalog/cart/simulated checkout, independent feature milestone and tests.
- [ ] **Phase 7:** durable accounts, auth/authorization, guest migration, conflict recovery, cross-device resume, full browser/accessibility/security/content release checks and deployment.

Phase 3 does not implement cloud accounts, server execution, external Weather APIs, a terminal or website publication. Client-visible grading is not tamper-proof. Browser storage remains local and optimistically guarded; hostile-code isolation remains limited. Export source edits need a new host export to rebuild the root bundle.


## Phase 4 — Final acceptance

- [x] Verify the Phase 3 baseline before edits: 44 unit tests, 24 browser scenarios, seven published topics / 22 drafts.
- [x] Preserve old content/engine/store/compiler/training storage/lockfile hashes and schema-1 drafts, maps, checkpoints, IDs and mastery.
- [x] Complete eight Weather topics with 40 activities, 16 blanks, 192 reviewed questions and exactly 24 separate challenges.
- [x] Preserve cumulative ten-distinct-correct mastery, fresh equivalents after reveal, misses/resume and progression through every topic.
- [x] Teach modules and local Promises before fetch-like requests; validate HTTP and payload data and render literal fields.
- [x] Provide deterministic fixtures and explicit optional live data with bounded requests, cancellation and attribution.
- [x] Verify loading, empty, HTTP error, malformed and offline states; guard stale success/error and mode/invalid-input transitions.
- [x] Pass all 40 Weather references; reject all 40 starters and 12 targeted mutants; verify eight basic/full partial distinctions.
- [x] Run the entire Weather UI journey, preserving old Todo/demo/project work and unlocking only the next React draft.
- [x] Run exported Weather independently, including offline fixtures, race recovery, pending-smoke refusal, repeated state restoration and controlled live HTTP.
- [x] Preserve the full regression suite: all 33 development Edge scenarios pass on final source.
- [x] Final production, ZIP integrity and visual sign-off complete.

| Check | Exact result |
| --- | --- |
| npm test | 63 passed across 10 files |
| Content validation | 4 projects; 15 published topics; 14 drafts |
| npm run build | TypeScript and Vite production build passed |
| npm run test:e2e | 33 passed (3.3 minutes), final source |
| Production Edge checks | 19 passed (1.8 minutes), built production app |
| Independent ZIP verification | Python zipfile CRC passed; 7 readable entries each for Weather and Todo |
| Visual review | Desktop dashboard, 390px lesson and standalone Weather inspected; no horizontal overflow |

One earlier full run had an isolated storage-probe console timeout (32/33 passed). That unchanged storage test then passed three consecutive reruns and the final full suite. No storage logic was changed in response. Browser acceptance ran after source edits settled. No dependencies, commits, branches, deployment or Phase 5 implementation changed. The runnable export is a compiled snapshot; live service availability, client-visible grading, optimistic local saves and limited hostile-code isolation remain documented limitations. See HANDOFF.md for exact commands and the Phase 5 prompt.
