---
name: thermo-nuclear-code-quality-review
description: Deep maintainability audit of a scoped diff for code-judo simplification, abstraction quality, giant files, spaghetti growth, types, module depth, and test value. Use for thermo-nuclear code quality review or a deep structural audit.
disable-model-invocation: true
---

# Thermo-nuclear code quality review

Perform a deep, ambitious maintainability audit of the assigned changes. Rethink their structure without changing intended behavior. Working code still deserves scrutiny when a better model could remove substantial complexity.

Follow `skill://thermos` for when to review, reuse, and owner triage. Those policies do not narrow the audit to behavioral defects or named concerns. Report findings only. Never edit or spawn nested reviewers.

## Review scope and depth

The diff establishes responsibility, not the limit of the context you read. Read affected functions and modules, their contracts, and cross-file consumers when they determine the quality of the change. Do not report unrelated pre-existing problems.

Actively search for structural regressions and missed opportunities for dramatic simplification. A named concern is a starting point, not a ceiling. Do not stop at local cleanup or require a runtime failure before reporting a maintainability finding.

## Code-judo simplification

Look for a reframing that deletes whole branches, helpers, modes, conditionals, or layers. Prefer a simpler state model or an existing ownership boundary over rearranging the same complexity.

- Ask whether the implementation needs every concept it introduces.
- Collapse duplicate flows into one direct flow.
- Delete pass-through wrappers, identity helpers, and generic mechanisms that hide a simple data shape.
- Reuse the canonical helper or move logic to the module that already owns the concept.
- Compare the current implementation with a concrete behavior-preserving alternative. Explain what disappears and what the replacement costs.

Report a visible simplification even when behavior already works. Do not invent hypothetical callers, layers, handlers, or extension points to justify a redesign. A proposal earns its place through the complexity it removes or the invariant it makes clear.

## File size and cohesion

Measure changed file sizes before and after. Crossing from below 1,000 lines to above it is a strong inspection signal. Check whether the addition belongs in a focused helper, subcomponent, or module with a real responsibility.

Report unjustified sprawl, mixed ownership, and an actionable decomposition. A raw line count alone is not a finding or a blocker. A justified, cohesive large file does not need cosmetic extraction into more layers.

## Control flow and state

Inspect new ad-hoc conditions, scattered feature checks, one-off booleans, nullable modes, and special cases in busy flows. Find the missing model or misplaced owner behind tangled control flow.

Prefer a typed model, explicit dispatcher, pure helper, or state machine when it removes complexity. A local conditional that directly expresses the domain does not need a new abstraction. Refactors that only move the same branching elsewhere have not simplified the design.

## Types, boundaries, and canonical ownership

Inspect unnecessary optionality, `unknown`, `any`, casts, and loosely shaped objects. Check whether they hide an invariant or normalize an unclear contract through silent fallback.

Look for feature logic leaking into shared paths, implementation details leaking through APIs, duplicated canonical behavior, and logic in the wrong package or service. Propose the existing canonical owner or an explicit type boundary when it makes the flow simpler.

## Module depth and seams

Apply `skill://principle-small-door-big-room`. Inspect shallow pass-through modules, interfaces nearly as wide as their implementation, and injection points that do not own a real decision.

Question a seam with one adapter and no demonstrated boundary need. Two real adapters can justify a seam. Adapter count alone does not establish quality. Apply the deletion test. If removing the module makes complexity disappear, it was likely unnecessary. If the same complexity moves into callers, the module may earn its place.

## Orchestration, concurrency, and atomicity

Inspect serialized independent work, unnecessary shared state, and partial updates that leave related state inconsistent. Compare with a simpler parallel or atomic flow when the contracts allow it. Name ordering constraints before proposing parallelism.

Flag avoidable allocation, copying, or computation in compiled code when the changed implementation introduces it. Keep the remedy grounded in the actual path rather than speculative micro-optimization.

## Test value

Apply the full authoring gate, junk patterns, and retention bar in `skill://principle-tests-pay-rent` to every added or changed test. Source inspection and static assertions need a credible independent contract, not a copy of the implementation. Flag self-referential expectations, implementation-pinning snapshots, mocks that implement the behavior being asserted, and tests that pass with the code deleted.

Name the behavior, invariant, or independent contract the test protects and the credible regression that breaks it. Ask for deletion when that evidence cannot justify the test. Do not request tests that pin wiring, incidental wording, or implementation shape.

## Findings and remedies

Prioritize structural regressions, dramatic simplification opportunities, tangled control flow, boundary and type problems, file cohesion, module depth, and test value. Omit cosmetic nits when larger issues deserve attention. No finding quota.

Every finding names a changed file and line, the structural cost or missed simplification, and a concrete behavior-preserving remedy. For an opportunity, compare the current and proposed flows. For a regression, explain the added coupling, hidden state, indirection, or maintenance burden. A preference without that evidence is not a finding.

Prefer deletion, a simpler model, the canonical owner, or an existing helper. A broader in-scope restructuring is valid when it materially reduces complexity. Do not limit the reviewer to the smallest textual patch, and do not add layers merely to satisfy a checklist.

## Priority and verdict

Calibrate P0-P3 by impact and urgency, not category. P0 is critical, P1 is high impact, P2 is medium, and P3 is minor. A serious structural regression can be P1 without a behavioral or security failure. Show its concrete maintenance impact and why it needs action now. Do not automatically promote file length, one adapter, or a possible alternative design to P1.

Return findings first, then `approve` or `changes_requested`. An evidenced P0 or P1 means `changes_requested`. Otherwise return `approve` with useful P2 and P3 findings, including code-judo opportunities. Do not hide an issue because it is non-blocking or pretend working behavior proves good structure.

The owner decides what to accept under `skill://thermos`. Approval does not require the simplest imaginable architecture or zero findings. Verify accepted fixes on their affected paths. Follow thermos for any further review and its scope.
