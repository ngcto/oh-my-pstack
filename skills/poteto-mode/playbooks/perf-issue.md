### Perf issue

**You own the measurement story. Plan, review, verify the numbers.** Tie every fix to a measurement, don't read source instead of measuring.

1. Capture a baseline trace via the matching control skill (for web surfaces the eval `browser` global offers `profileStart`, `traceStart`, metrics, and vitals; for a live process, `xd://debug`). Vet the baseline, and each later number, with the **benchmark-checklist** skill.
2. `how` to ground hypotheses. Don't claim a perf ceiling without running it first.
   Try the performance mantras in order, cheapest first:
   1. Don't do it. Stop work whose result nothing uses rather than cheapening it.
   2. Do it, but don't do it again.
   3. Do it less.
   4. Do it later.
   5. Do it when they're not looking.
   6. Do it concurrently.
   7. Do it cheaper.

   When an earlier mantra meets the target, stop.
3. Plan the fix from the trace. If it crosses a function boundary, `architect` first, and shape the boundary per **principle-small-door-big-room**. Delegate implementation to a subagent on the `code` role (see the roles contract in `setup-pstack`; call `pstack_models` with `role: "code"` and pass the returned selector as the task's `model`, default `@task`). Use the `hardest` role for subtle algorithms. Review the diff. Capture a post-fix trace. Any benchmark or regression test you add or change passes the **principle-tests-pay-rent** authoring gate.
   Apply the **sequence-verifiable-units** principle skill, verifying each attempt before trying the next.
4. Parse and compare the artifacts (JSON to sqlite, diff). "Inconclusive" or wrong-surface is not a pass. Flag it.
5. Run **no-comments** and **deslop** on the diff, then run the **thermos** skill on it (base to head, with an intent paragraph that states the baseline and post-fix numbers). Fix every P0 and P1, or dismiss with a concrete reason in the trail.
6. Cite the measurement in the PR.
7. Run **Opening a PR**.

For sustained improvement against a metric rather than a one-off fix, use the Hillclimb playbook (`playbooks/hillclimb.md`).

**Reply:** baseline number, post-fix number, delta, artifact path.
