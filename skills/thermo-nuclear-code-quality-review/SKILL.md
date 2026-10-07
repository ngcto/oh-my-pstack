---
name: thermo-nuclear-code-quality-review
description: Review a scoped diff for concrete maintainability regressions and unnecessary complexity. Use for a thermo-nuclear code quality review or an explicit deep maintainability audit.
disable-model-invocation: true
---

# Thermo-nuclear code quality review

Review the changed code and enough surrounding context to establish its impact. Follow `skill://thermos` for review level, reuse, and stop conditions. Report findings only. Never edit or widen the task.

## Review bar

The goal is useful feedback on this change, not an ideal redesign. Working, direct code that follows the repo's conventions can be approved with non-blocking suggestions.

- Flag a concrete regression introduced by the diff. Name the affected path, the cost, and the evidence.
- Prefer deletion, an existing helper, or a small local correction over a new abstraction.
- Suggest a layer, handler, interface, policy object, or state machine only when the current change has a demonstrated need that a simpler fix cannot meet.
- Do not demand speculative hardening, support for hypothetical callers, or a repo-wide restructure.
- A possible simplification is optional feedback, not a blocker. Do not ask the owner to redesign working code merely because another shape is possible.

## What to inspect

1. **Unnecessary complexity.** Wrappers, duplicate flows, hidden state, or generic mechanisms that add a concrete maintenance burden to the changed path.
2. **Ownership and contracts.** Logic in the wrong existing owner, duplicated canonical behavior, or types that obscure an invariant the code relies on.
3. **Control flow.** Scattered conditions that produce inconsistent behavior or make a real transition difficult to maintain. A local `if` or a one-off helper is not itself a design defect.
4. **Module boundaries.** Use the deletion test from `skill://principle-small-door-big-room` when a changed module adds indirection. Do not require more modules to satisfy an abstract preference.
5. **Tests.** Use `skill://principle-tests-pay-rent` for changed tests. Flag assertions that cannot catch the claimed regression. Do not demand tests of wiring, wording, or incidental structure.
6. **Size.** A large file can prompt inspection, but 1,000 lines is not a gate. Suggest a split only when the change creates a concrete cohesion or ownership problem and the split reduces complexity.
7. **Concurrency and partial updates.** Report reachable inconsistent state or unnecessary coordination, not a theoretical race in code whose callers prevent it.

Do not turn this checklist into a requirement to produce a finding in every category. Trace only dependencies needed to support or dismiss a plausible issue in the changed code. Stop when those questions are resolved.

## Findings and priorities

Every finding names a changed file and line, the concrete problem, and the smallest remedy. A preference without a demonstrated cost is not a finding. Omit cosmetic nits.

- P0 and P1 are for confirmed severe failures, such as data loss, security exposure, or a major broken contract. Structure alone does not earn that priority.
- P2 is a concrete but non-blocking maintainability improvement.
- P3 is optional minor feedback. Usually omit it.

Do not inflate priority because the code crosses a line-count threshold, misses a refactoring opportunity, uses one adapter, or differs from your preferred style. Independent agreement raises confidence, not impact.

## Verdict

Return `changes_requested` only for a confirmed P0 or P1 defect. Otherwise return `approve`, with the few concrete non-blocking findings worth the owner's attention.

Approval does not require zero findings or the simplest imaginable architecture. After the owner fixes an accepted blocker, targeted verification is enough. Do not request another open-ended review round.
