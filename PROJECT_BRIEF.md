# Project Code: durable brief

## Purpose and scope

Turn existing HTML, CSS, and basic JavaScript knowledge into working projects through original short readings and browser coding. Teach DOM/events/forms/state/rendering; modules and async APIs; planning and stack tradeoffs; setup and structure; debugging/testing/deployment; client/server boundaries, databases, and auth concepts. Preserve unfinished work. No runtime LLM dependency, AI tutor, payment collection, social features, or complex CMS.

**Phase 5 is complete and accepted (2026-09-15).** The React Task Dashboard was added in GitHub commit `7999236`; verified fixes are in `cf0bfee`. Preserve the Phase 1 runtime, Phase 2–4 published IDs and mastery, every saved project/challenge draft, schema-1 compatibility, scoped training data, Weather fixtures/live consent, and runnable export. Complete component planning, React setup, props/layout, task state, effects/persistence/error recovery, and testing/export. Ecommerce, accounts and publication remain later scope. This continuation stops after Phase 5. The next scoped task is Phase 6, using the prompt in docs/HANDOFF.md.

The historical Phase 4 acceptance recorded 63 unit tests, 15 published topics/14 drafts, a production build, 33 development browser scenarios and 19 production scenarios. GitHub now contains six React topics: 30 activities, 12 blanks, 144 questions, and 18 independent challenges. Current inventory is 21 published topics and eight ecommerce drafts. Acceptance: 71 unit tests, content validation and production build passed; all 38 development scenarios were verified across the full run and corrected Weather rerun; all 21 selected production scenarios passed. Exact results and the stale test expectation corrected during acceptance are recorded in docs/HANDOFF.md and docs/PHASES.md. Existing Todo/Weather content and persistence/mastery/runtime foundations have explicit preservation checks. The Phase 4 manifest uses CRLF hashes; preservation normalizes Git checkout line endings only, retaining the immutable expected hashes.

## Learning contract

Hierarchy: learning path → project → topic → activities. Meaningful topics interleave short readings with guided coding; include conceptual and code blanks with useful feedback and equivalent answers. Every completed topic requires the required guided activities, an understanding check with **10 distinct correct question IDs**, and **exactly three challenges** (apply; modify/debug; independently combine). Completed topics stay available for review.

Each topic has at least 20 reviewed questions covering prediction, debugging, explanation, and application. Show one at a time; cumulative credit; wrong answers never erase credit; count each stable ID once; prefer unseen then retry missed without dead ends; persist attempts and credited IDs. Revealed answers cannot earn same-item credit; require a fresh equivalent assessment item. Rewording/reordering is not a new identity. Grading is deterministic and behavior-based; reference solutions must pass and representative incorrect solutions fail. Client-visible grading is not tamper-proof.

Challenge definitions carry objectives, starters, examples, acceptance criteria, optional progressive hints, and references/solutions. Independent challenge workspaces remain separate from project work. Project edits carry forward; never silently replace learner code at the next step.

## Four projects

1. Vanilla JavaScript Todo: DOM, events, forms, state, CRUD, filtering, persistence.
2. Async Weather: modules, promises/async, validation, fetch, loading/errors, request races; deterministic fixtures and labeled live-data options.
3. React Task Dashboard: revisit familiar requirements via components, props, state, effects, and framework tradeoffs.
4. Original ecommerce store inspired by large online shops: catalog/search/filter/detail/routing/cart/simulated checkout/persistence/tests and independent feature milestone. No real payment information.

Each project covers product/requirements, 2–3 stack choices and selection, decomposition, setup, incremental features, debugging, empty/loading/error/success states, behavioral tests, deployment preparation, and runnable export. Teach prerequisites before use.

## Workspace and durability

Multi-file editor, preview, run/check controls, readable console/errors/results, resizable panels, autosave/resume/export, checkpoints and scoped resets. Clearly distinguish host backend from isolated learner execution, simulations from live APIs, saved locally from synced. Do not expose app credentials. Validate a narrow preview message interface, limit execution where possible, and recover broken/nonterminating code. Server lessons require a verified isolated server runtime or explicit future scope.

Persist files, workspace versions, location, answers/attempts/credits/challenge results/milestones/unlocks. Later add accounts, cross-device resume, guest migration, authorization, failed-save and conflict recovery. Content is versioned and validated separately from UI, with stable IDs and explicit prerequisites.

## Delivery and delegation

Astra owns architecture, security/runtime boundaries, integration and acceptance. Terra handles scoped engineering and tests; Luna handles bounded drafts/docs/fixtures, with stronger review. Maximum three simultaneous workers; small task context and separate file ownership; no recursive spawning. Escalate after a concrete failed attempt. Never invent usage or savings.

At each phase end update the five continuity files with actual acceptance, changed components, commands/check results, limitations/dependencies, and concrete next-phase actions. Do not claim later-phase functionality is complete.

