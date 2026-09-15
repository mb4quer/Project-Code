# Architecture

Current continuation: Phase 5 React acceptance. Earlier phase sections below are historical; the Phase 5 section describes the current additions. Exact verification results are recorded in HANDOFF.md.

## Stack decision

**Vite + TypeScript + a small DOM-based host**, served as static assets, with **esbuild-wasm in a Web Worker** for learner compilation. No platform backend or account in Phase 1. Pinned installed versions are in `package-lock.json`.

Compared options:

| Option | Fit and tradeoff |
| --- | --- |
| Plain HTML and native module blobs | Very small host, but manual JSX/dependency/module handling becomes brittle. |
| Vite host + browser compiler (chosen) | Local, inspectable, static deployment possible; the same virtual-file compiler supports vanilla and React. Adds a roughly 12 MB WASM download from the local server. |
| Full framework backend or container runtime | Useful for durable accounts/server lessons later; adds infrastructure unrelated to this proof. |

The host need not use React to teach React. It is a single working surface, with types, small modules, and no decorative terminal. An editor framework can replace the plain-text textarea in Phase 2 without changing the runtime interface.

## Runtime flow and boundaries

1. Host UI owns files and local progress. It sends only source files to a dedicated compiler worker.
2. `scripts/prepare-runtime.mjs` copies esbuild WASM and builds a local React/React DOM vendor module from installed packages. No learner execution or npm installation occurs on the server.
3. The worker resolves virtual relative imports and the explicitly supported React imports, transforms JSX, bundles scripts, inlines CSS/assets, and instruments common loops.
4. The host installs the compiled document in a fresh iframe with `sandbox="allow-scripts allow-forms"`, **without** `allow-same-origin`. The frame has an opaque origin, separate from the host's origin and browser storage. `allow-forms` enables normal JavaScript submit events; CSP `form-action 'none'` still blocks native submissions.
5. A canonical document puts CSP and the bridge before learner markup, preserves a real document head for styles, and appends bundled scripts after body markup. Fetch/subresources are restricted; `connect-src 'none'`, `default-src 'none'`, no top-navigation permission, no popups, and no app credentials in the frame.
6. Messages may only report console/error data. The host checks iframe source, active run ID, nonce, discriminants, levels, and length; it caps the event rate. Messages never write progress or access backend APIs.

Supported proof surface: a root `index.html`, relative JS modules, JSX/TS transforms, linked/imported CSS, SVG and text imports, React hooks + `react-dom/client` and JSX runtime. Bare imports outside the React allowlist fail explicitly. Assets are text-backed; binary upload/package management are not implemented. HTML preparation is a limited text transform, not a full HTML parser or hostile-input sanitizer. Scripts execute after markup; multiple entries bundle independently and do not provide native shared-module identity or every HTML script-loading edge case. CSS URL assets should use the JS import pipeline; arbitrary HTML asset URL rewriting is not supported.

`createRuntime(container, onEvent)` exposes `run(files)`, `stop()`, `dispose()`; see `src/contracts.ts`. Run compiles before mounting; mounting does not claim the learner's program passed tests. Console and compile/runtime errors are visible. Run is explicit: restored code never executes automatically.

## Limits and recovery

- Compilation is in a terminable worker with a 12-second timeout. Stop rejects pending builds, terminates the worker, and discards the preview. The next Run creates a fresh worker/frame execution.
- Instrumented loop bodies share a 100,000-iteration budget per run. This catches common accidental `while(true)` / `for(;;)` loops, but is **not adversarial isolation**. Recursion, expensive native operations, memory exhaustion, asynchronous storms, crafted HTML, and deliberate guard circumvention are not fully controlled. Ordinary recursion normally raises a stack error; no hard CPU/memory quota is claimed.
- A browser may schedule the frame with the host. If the whole tab stalls, close/reopen it; code will be restored but will not autorun. A dedicated cross-site runner/service and stronger process limits are required before accepting hostile code in a public release.
- CSP blocks fetch and resource loads, but is not a complete network-egress firewall (for example, self-navigation needs stronger infrastructure). No authenticated host backend exists in this phase. Do not place credentials in learner files.
- Preview `localStorage` is intentionally unavailable in the opaque sandbox. Ordinary in-memory learner state resets on Run; explicit trainingStorage data can be restored. Phase 3 supplies a scoped asynchronous trainingStorage capability, described below, without exposing host storage.
- No server/Node runtime, terminal, real API calls, external learner packages, or account sync. Phase 2 adds the browser-only behavioral grader described below. Backup/restore uses JSON; Phase 3 also exports a runnable compiled ZIP with exact original sources.

## Persistence

`src/contracts.ts` defines Session schema 1. `SessionStore` stores a validated JSON snapshot at `project-code.session.v1`: current workspace/location, per-workspace files/active file/version/timestamps/checkpoint, plus reserved attempts/credited IDs/challenges/completed activities/milestones. Reserved fields start empty; no fake completion.

The host saves after 450 ms and on explicit save/run/visibility exit. Every write compares the fresh revision and writer identity. Storage events block stale tabs; the UI offers conflict-copy backup and explicit loading of the saved version. Corrupt or unsupported records are preserved and reported, not silently overwritten. Quota/unavailable-storage errors show **Not saved** and retain the in-memory draft for backup. Imports are size-limited and validated. Reset affects one workspace; no starter replacement on demo switching.

This localStorage protocol is a Phase 1 optimistic guard, not a transactional cross-tab database: truly simultaneous read-then-write operations can still race. Use IndexedDB transactions (plus Web Locks where appropriate), append-only revisions, and explicit migration logic as durability needs grow. Browser data clearing/private-session disposal still removes local saves. No cloud synchronization is implied.

Future account migration: retain a guest snapshot; authenticate; compare curriculum/schema versions and per-workspace base revisions; present conflicting versions; copy only after explicit merge decisions; commit atomically with idempotent migration IDs and retain a recoverable guest backup. Do not mark synced until the server acknowledges.

## Content and progression

Content lives in `src/content/`, independent of UI components. Zod validates shape; the content validator checks IDs, paths, references, prerequisite cycles, ordering, and published completeness. Phase 3 retains the published pilot and publishes the six remaining Todo topics, leaving 22 later-project drafts. `docs/CURRICULUM.md` is the authored inventory.

The Phase 2 engine selects one question at a time, persist every attempt and stable credited ID, count cumulative unique credits to 10, prefer unseen eligible questions then cycle uncredited misses, and never strand a learner after exhaustion. Revealing a solution disqualifies that identity; use a genuinely fresh equivalent item. Exhausted revealed items need reviewed reserve equivalents. Correctness requires semantic review, not just unique strings. Next topic unlock derives from required guided completions + 10 credits + all three passing challenges, with review remaining open.

Lesson step entry uses existing workspace versions as the authority. New starter files initialize only a missing workspace; migrations/checkpoints must preserve learner edits. The grading harness evaluates a snapshot from a separate challenge workspace; browser-visible tests are not tamper-proof.

## References

Phase 1 acceptance on 2026-09-12: 25 unit tests, content validation, eight browser scenarios, and the production build passed. Production runtime checks passed for vanilla, React and local imported assets. See `PHASES.md` for evidence and `HANDOFF.md` for the Phase 2 start; Phase 2 adds lesson assessment; no account backend is implemented.

- [esbuild browser API](https://esbuild.github.io/api/#browser) and [virtual-file plugins](https://esbuild.github.io/plugins/).
- [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox) and [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy).

## Phase 2 lesson implementation (2026-09-12)

`src/lesson/engine.ts` provides pure clone-returning progression and workspace functions. `src/lesson/ui.ts` renders any published Topic through the existing editor; navigation saves the lesson location and each step retains its project files. A project starter initializes only a missing workspace. Challenges use independent IDs and file maps. Runtime demos still use their original workspaces and default landing page; dashboard and resume are available in both wide and narrow layouts. Draft successors can become prerequisite-unlocked but remain unavailable until authored. No draft prerequisite is marked completed.

Session schema 1 and `project-code.session.v1` remain compatible with Phase 1. Loading an old record adds the typed `learning` extension version 1 without replacing files, versions, checkpoints, revisions, writer identity, original location, or legacy reserved progress. The extension stores lesson location, per-project/per-challenge workspaces, activity IDs, blank attempts, timestamped question attempts/reveals, distinct credited IDs and identities, equivalent-item scheduling, and challenge attempt history with sticky earned passes. Existing optimistic save/conflict, quota, backup/import and corruption-preservation behavior covers the whole snapshot. No cloud save is implied.

The gate derives from every required activity (including readings), all four blanks, ten valid distinct question ID/identity pairs, and the three required challenge passes. Wrong answers and failed review experiments do not remove earned completion. Questions are reviewed content only, unseen first, then rotating uncredited misses. Code comparison preserves case and internal spacing; conceptual normalization follows its declared policy. Inputs are bounded, with precise prompts and enumerated equivalent spellings instead of free-form semantic grading.

Questions carry an `equivalenceGroup` (events, rendering, state, identity). Revealing retires that identity permanently and schedules an unseen eligible same-group item. Reveal is refused if no fresh equivalent remains or fewer than ten total identities would remain earnable. Refusal shows the reason and leaves the current item answerable; missed items cycle after unseen exhaustion. Reserve scenarios require different transitions or diagnoses, not mere rewording or a new ID for the same question. Attempts, credits, retirement and pending equivalence survive reload.

`src/lesson/grader.ts` compiles a copied file map with the existing worker and mounts a separate fresh opaque iframe using `createSrcdoc`, preserving Phase 1 CSP, sandbox and loop guard. The authored assessment registry dispatches Todo add or full-state checks. Checks submit forms and interact with controls; they inspect rendered behavior rather than source spelling. Console output cannot grant credit. Result messages require the active iframe source, run ID, nonce, assessment ID, bounded nonempty checks, and internally consistent pass flags. Compilation and checks have separate timeouts; cancellation removes the frame and stops the worker. UI navigation/import/restore/Stop invalidate pending grading; a changed workspace version cannot receive an older snapshot's pass. Compile failures are recorded as failed challenge attempts.

The harness and its results remain client-visible and intentionally are not tamper-proof. It inherits the Phase 1 limits on hostile code and whole-tab CPU/memory isolation. Adding another published topic requires authored behavior checks in the registry plus reference/incorrect browser fixtures. Only the DOM/Todo behavior registry is implemented in Phase 2.

## Phase 3 storage and export implementation (2026-09-12)

`src/runtime/trainingStorage.ts` defines a narrow request/reply capability. `RuntimeController.run(files, storage?)` is additive; existing two-argument createRuntime and run(files) callers retain their behavior. A run receives only a host-selected callback. The host chooses the current demo, project, or challenge workspace and never accepts a workspace identifier from a frame.

The optional injected `window.trainingStorage` provides Promise-returning getItem, setItem and removeItem. Requests validate the current iframe source, active run and nonce, increasing request ID, operation, safe key and string value. Keys contain at most 64 ASCII letters/digits/dot/underscore/hyphen and exclude prototype-related names; data is limited to 32 keys, 16,384 characters per value, and 65,536 serialized characters per map. The parent allows 30 requests per second. The frame caps pending requests at 32 and rejects them after three seconds. Stop/navigation removes the frame and invalidates its capability. No request can change lesson progress or access host credentials, DOM, arbitrary localStorage keys, or another workspace.

Optional `trainingData` is additive on demo and lesson workspace records. Schema 1 and the learning version-1 extension stay compatible; older records need no destructive migration. Import validation bounds the maps. JSON backups include them. The host copies a proposed mutation and acknowledges it only after SessionStore saves successfully; failed/conflicting writes restore the previous map and reject. Source drafts remain in memory for recovery. The existing optimistic cross-tab protocol and non-atomic simultaneous-write limitation remain. Clear preview data confirms a reset of only the current map, preserving code, checkpoints, and mastery.

`src/exportProject.ts` compiles a copied file map in a dedicated worker with a 12-second timeout, then creates a standard uncompressed UTF-8 ZIP. Root index.html contains the compiled program and local imported assets; source/ contains exact original files; README.md explains running, rebuilding through the editor, testing and static deployment. Exports contain no session, mastery, host credentials or training-data snapshot. Export compilation is not a behavior pass. The adapter in the exported bundle uses a project-namespaced localStorage prefix on the exported site's own origin. This is an ordinary webpage outside the learner sandbox. Direct file URLs can restrict persistence: use a static HTTP server. Editing source/ alone does not rebuild the compiled root page; continue in the host editor and export again. No deployment is performed.

Phase 3 content lives in `todoPhase3.ts`, `todoPhase3Questions.ts` and `todoPhase3References.ts`. Each topic has five interleaved activities, two topic-specific blanks, 24 questions and three separate apply/debug/combine workspaces. Prerequisites follow all seven Todo topics in sequence. The pilot's original IDs, identities, question bank and earned progress remain unchanged. A project completion label derives from topic gates; nothing is auto-completed. New-topic entry never applies starter files to an existing project. Instructions describe incremental edits and references remain read-only comparisons.

The grader adds authored planning/file-plan, accessible layout, filter/error, storage/recovery and smoke/export contracts. It inherits the opaque iframe, source/run/nonce validation, snapshot version checks, compiler/grade timeouts and educational tampering limitations. Storage assessment fixtures are separate from host/learner training data. No Weather API, account backend, server runtime or strengthened adversarial isolation is implemented.


## Phase 4 Weather capability and curriculum (2026-09-14)

Weather is additive to the existing runtime. `run(files, storage?, weather?)` still accepts every Phase 1/3 call. Weather lessons pass an explicit capability configuration; ordinary demos receive none. `weatherApi.fetch(city)` is a fetch-like teaching adapter with `ok`, `status`, and asynchronous `json()`, not unrestricted native fetch. Its local fixtures are independent per frame and available without external requests: London, Paris, Empty/unknown, Error (HTTP 503), Offline, Malformed, Slow, Fast, SlowError, and Literal. Fixture calls are deterministic simulated weather, never current observations. All grading injects the fixture-only adapter and has no live callback.

The host checkbox allows optional live weather for the current Run; the learner app also explicitly selects Live. Permission is not persisted, and Stop/navigation/reload revoke it. Only the host can choose the callback. The request protocol validates frame source, active run, nonce, increasing safe-integer request ID, and bounded city text. The runtime allows four pending requests and six live lookups per minute per run. Stop aborts their controllers and a response from a prior run cannot reach a newer frame. There is no arbitrary URL, header, storage scope, credential, or progress mutation in this capability. The original opaque iframe, sandbox flags, and `connect-src 'none'` remain unchanged.

`fetchLiveWeather` contacts only the fixed Open-Meteo geocoding and forecast HTTPS endpoints, omitting credentials/referrers and rejecting redirects. It uses one six-second deadline, bounds each streamed response to 65,536 bytes, validates coordinates and weather fields, and returns at most 2,048 serialized characters through the bridge. First-match geocoding is a deliberate small-app limit: qualify ambiguous city names. The frame times out replies after seven seconds. This is a narrow educational capability, not a new adversarial-isolation claim or account/backend feature.

The export injects the same self-contained fixture adapter and optional live adapter for Weather namespaces. It starts in fixture mode, includes exact source files and the compiled runnable root, and includes no session, mastery, training data, host credentials, or persisted live permission. Source-only execution must supply the adapter; editing source/ does not rebuild root index.html. Open-Meteo data and GeoNames location attribution are included. The free live service is for noncommercial use, has rate limits, and is not required to earn mastery; its availability and data vary.

Provider contract checked against [Open-Meteo geocoding documentation](https://open-meteo.com/en/docs/geocoding-api), [forecast documentation](https://open-meteo.com/en/docs), and [usage terms/pricing](https://open-meteo.com/en/pricing). Acceptance evidence belongs in HANDOFF.md and PHASES.md.

The eight Weather topics keep all existing outline IDs and prerequisites, following completed Todo and preceding the React drafts. No persistence schema change is needed. The unchanged engine, store, published Todo content, compiler, training-storage module and dependency lockfile have SHA-256 preservation checks against the verified Phase 3 baseline. The new content and behavior registry live in weather.ts, weatherQuestions.ts, weatherReferences.ts, and lesson/weatherAssessment.ts. Earlier sections describing Phase 1/2/3 are historical; Phase 4 adds only the capabilities described here.

Weather question banks are static reviewed content with 24 unique prompts per topic and at least two items per equivalence group. No new progression or persistence mechanism was introduced. The final app smoke saves/restores source mode and control state, refuses pending normal work, and tests observable London, invalid-input and HTTP-error paths. The full grading increment perturbs London data independently of the HTTP fixture to reject a missing result assertion.

Phase 4 integration accepted 2026-09-14: 63 unit tests, valid content (15 published/14 drafts), TypeScript/Vite build, 33 development and 19 production browser scenarios passed. Serialized fixture/live adapters execute correctly in the production export. See HANDOFF.md for commands, migration and preservation evidence, the earlier isolated test timeout and the Phase 5 prompt. No Phase 5 code is implemented.

## Phase 5 React dashboard

GitHub commit `7999236` adds six published React topics without changing Session schema 1, learning extension version 1, the compiler, runtime capability interfaces, or dependency lockfile. `src/content/react.ts`, `reactQuestions.ts` and `reactReferences.ts` contain the lesson sequence, 144 questions and editable reference programs. `src/lesson/reactAssessment.ts` supplies browser behavior checks; the existing grader dispatches to them and gives persistence assessments isolated training-storage scenarios.

The learner dashboard mounts through `main.jsx` and composes JSX components. Task updates preserve stable IDs and derive filters/counts. The durable reference restores the known legacy task array or current `{version:2,tasks}` envelope, validates records and duplicate IDs, preserves invalid data until explicit recovery, and queues writes. This version 2 is the learner task payload, not a course-session schema change. Failed saves retain visible edits. Separate project/challenge training maps continue to use the existing host capability.

A local `taskApi.js` module supplies deterministic delayed task fixtures. Effects teach cleanup, cancellation, stale success/error protection, and accessible loading/empty/error feedback. This module performs no network requests and introduces no new host API. Weather retains its separate optional live capability and consent boundary.

React exports use the existing compiler and ZIP exporter. The root contains bundled React and the compiled dashboard, while `source/` contains exact editable originals. Standalone persistence uses the existing project-namespaced adapter. Editing source alone does not rebuild root index.html; edit in the host and export again. No course mastery, checkpoints, or saved training-map snapshot is exported.

Acceptance covers published references, unfinished starters, incorrect behavior, distinct early/full increments, storage recovery and reload, the six-topic UI journey, and standalone export. The continuation repairs defects found by those checks before sign-off; see HANDOFF.md for final evidence. Client-visible grading remains educational checking. The existing optimistic storage and limited hostile-code isolation constraints still apply. Ecommerce and accounts remain future phases.
