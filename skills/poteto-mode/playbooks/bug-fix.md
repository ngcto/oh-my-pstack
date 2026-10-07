### Bug fix

**You own this task. Plan, review, verify.** Delegate investigation and the fix to subagents, stay in the lead.

Be scientific. Every shipped line traces to runtime evidence. Belt-and-suspenders that "might help" is a hypothesis, not a fix. It does not ship. When evidence refutes a hypothesis, revert what it motivated. The smallest change the evidence justifies ships, nothing more.

1. Reproduce it yourself on the matching surface via the control skill (Non-negotiables), even when a debug or instrumentation protocol says to ask the user to reproduce. Ask the user only with a stated, specific reason the control surface cannot reach the target, and only after driving it as far as it goes. If it won't reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires.
2. Binary-search the cause. Form the candidate hypotheses, then rule them out until one survives. Seed them with `how` over the affected subsystem and the **why** skill for regression history. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate. When program state is unclear, attach `xd://debug` to the running process or add instrumentation or logging and read it as the code runs. Don't guess. For a long or stubborn hunt, iterate on the repro predicate yourself, or ask the operator to start `/loop --until '<repro passes>' <prompt>` (a user command no tool can start). Confirm the surviving *mechanism* with runtime evidence before the step-3 architect/interrogate fan-out.
3. Plan the fix. If it crosses a function boundary, `architect` first, and shape the boundary per **principle-small-door-big-room**. Delegate implementation to a subagent on the `code` role (see the roles contract in `setup-pstack`; call `pstack_models` with `role: "code"` and pass the returned selector as the task's `model`, default `@task`) with a specific scope. Use the `hardest` role for gnarly concurrency or subtle algorithms.
4. Verify on the same surface. The original repro now passes. "Inconclusive" or wrong-surface is not a pass. Flag it. Unit tests show branch behavior, not bug absence.
5. Stage the commits so the failing repro lands before the fix in git history. See the **tdd** skill for the failing-test-first cadence when the bug has a cheap local test path. Skip it when the test would be expensive, integration-heavy, or unclear. Any test you add or change passes the **principle-tests-pay-rent** authoring gate: it must fail without the fix and name the behavior it guards.
   This is the canonical **sequence-verifiable-units** principle skill, the failing test first and the fix on top.
6. Complete `skill://deslop` for changed code. Use `skill://no-comments` only for changed comments that need independent cleanup. Skip both for prose-only work and reuse cleanup already done on this diff. Choose review coverage under `skill://thermos`, reusing any applicable prior review or available GitHub feedback. Verify accepted fixes on the affected path, not with another broad audit.
7. Run **Opening a PR**.

**Reply:** what was broken, root cause, fix, how you verified. Paste failing-then-passing repro output verbatim.
