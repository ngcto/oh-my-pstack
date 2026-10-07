---
name: thermo-nuclear-review
description: Audit a scoped diff for evidenced correctness and security defects. Use for thermo nuclear, thermonuclear, explicit deep review, or a named high-risk concern involving bugs, breakage, security, devex, or feature-gate leaks.
disable-model-invocation: true
---

# Thermo-nuclear review

Audit the assigned diff for concrete correctness and security failures. Gather it yourself with `git diff <base>...<head>` when the caller passes a scope. Follow `skill://thermos` for review level, reuse, and stop conditions.

## Scope

Report only issues introduced by added or modified code. Read surrounding code and callers when needed to establish whether a plausible failure is reachable. Do not audit untouched subsystems or invent hypothetical users and inputs.

## What to check

- Broken behavior or contracts on a reachable path.
- Authorization, secret handling, data loss, and other concrete security risks.
- Devex changes that prevent an existing supported setup from running or building.
- Features accidentally exposed outside an existing flag or access boundary.

Trace a suspected issue far enough to prove or dismiss it. If the relevant guard, caller, or dependency is available, read it before reporting. Do not expand the audit after the scoped questions are resolved.

Intended, well-scoped behavior changes are not defects. Report an unintended consequence only when the code supports it. Keep the remedy inside this task and prefer the smallest correction.

## Findings

Each finding needs a changed file and line, the triggering input or state, the reachable failure path, and the user or system impact. Omit style preferences, generic defensive-programming advice, and speculative edge cases.

Calibrate priority by impact. P0 and P1 require a confirmed severe failure. P2 and P3 are non-blocking. A security label or agreement from another reviewer does not itself increase severity.

When a PR exists, inspect its discussion after the independent audit only if a concrete finding needs that context. Validate and attribute any bot or human claim you include. Do not duplicate already resolved findings or demand a local audit merely because a bot commented.

## Verdict

Return `changes_requested` only for a confirmed P0 or P1 defect. Otherwise return `approve`, including any concrete non-blocking findings worth reporting. No praise or finding quota.

After an accepted blocker is fixed, verify the affected path instead of requesting another full audit. An empty findings list is not the completion criterion.
