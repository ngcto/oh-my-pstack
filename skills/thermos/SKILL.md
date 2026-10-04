---
name: thermos
description: "Run both thermo-nuclear review lenses (bugs/security and code quality) in parallel on one scoped diff and synthesize a deduped verdict. Use for thermos, double thermo review, pre-PR review, per-PR review of a stack layer, or any review step that needs the default gate."
disable-model-invocation: true
---

# Thermos

Two diff-scoped review lenses run in parallel on the same scope, then one synthesized verdict.

- agent `thermo-review` (skill `thermo-nuclear-review`): bugs, breakage, security, devex regressions, feature-gate leaks. Only added or modified code.
- agent `thermo-quality` (skill `thermo-nuclear-code-quality-review`): maintainability, code-judo, 1k-line rule, spaghetti, boundaries, module depth, test value.

Thermos is the default review gate. `interrogate` is the escalation: use it when design is contested, stakes are high, or the user asks for multi-model or adversarial review. Thermos is read-only. It never edits. Fixing is the owner's job.

## Who calls this

- `opening-a-pr`: pre-PR gate.
- `babysit`: every new patch, scoped to the delta since the last verdict.
- `shipping`: independent per-PR verdict, one scope per stack layer.
- `autopilot`: verifier rounds, as mandatory lanes next to the swarm lanes.
- `orchestrate` and multi-phase plans: per-PR review step.
- feature, bug-fix, refactoring, and perf playbooks: the "review before PR" step.
- `review-bot-triage`: thermos is the first-party counterweight to review bots. A bot finding thermos also raised is high signal.

Run `no-comments` and `deslop` before thermos, not after.

## Workflow

1. Determine the scope from the user request, PR, current branch, or local uncommitted work. Resolve `base` (default `main`) and `head`. For a PR, get the number, title, and body with `gh pr view <n>`.
2. Write the scope spec. Do not paste the diff. The spec holds:
   - base ref and head ref (or "working tree" for uncommitted work)
   - PR number if any
   - an intent paragraph: what the change is for and what breakage is intended
   - for a stack layer: the one layer under review (`git diff <parent-branch>...<branch>`) and the names of the layers below, for context only
   - optionally a pointer to a saved diff at `local://review/<id>.diff` when the diff is big
3. Read model roles. Call `pstack_models` with `role: "thermos-review"` and `role: "thermos-quality"`. If the tool is absent, read `rule://pstack-models` and fall back to the defaults. The extension also applies these roles automatically when the agents spawn, so passing `model` is optional. Pass it when the role resolves to something other than the agent's alias.
4. Spawn both lenses in ONE `task` call. `tasks[]` holds 2 x scopes items, two per scope (one scope for a normal review, one per layer for a stack):
   - `agent: thermo-review` with the scope spec and a `solutionSpace` like "open-ended audit, breakage paths unknown".
   - `agent: thermo-quality` with the same scope spec and a `solutionSpace` like "structure may admit a much simpler reframing".
   Use one `task` call with heterogeneous `agent` items, not a `workpool`. A workpool binds one agent and replaces its structured output with a free-form schema. The task tool keeps each agent's own schema, so you get the verdict and priority 0-3 findings back structured. Name items by scope and lens (for example `Layer2Review`, `Layer2Quality`).
5. Wait for all items. Synthesize.

## Synthesis

Findings first, then the verdict. No praise.

Tag each finding with the lens from the item that produced it (`thermo-review` or `thermo-quality`). Do not trust a finding's own `lens` value for that. The agents' `lens` field is `review-bot` or `human` only when the finding was sourced from PR discussion.

1. Dedup findings across the two lenses and across scopes. Merge same-root findings into one entry with both lenses credited.
2. Overlap raises weight. A finding both lenses raised, or one a review bot raised that a lens also raised, ranks higher.
3. Resolve disagreements with your own judgment. Read the code. Do not average.
4. Bucket every finding:
   - **act-on**: real, in scope, fix before the step proceeds.
   - **consider**: plausible or stylistic, owner decides.
   - **noted**: true but out of scope or intended, recorded only.
   - **dismissed**: wrong or already handled, with a concrete reason.
5. Verdict is `approve` or `changes_requested`. Any P0 or P1 in act-on means `changes_requested`. It blocks the step until fixed or dismissed with a concrete reason.
6. If `show-me-your-work` is active, add a trail entry: scope, lenses run, buckets, verdict, dismissals with reasons.

If the agents' summaries are already visible to the user, do not restate them. Surface the unified verdict, the highest-signal findings, and remaining uncertainty.

## Review a stack

One scope per unmerged layer, bottom to top.

1. Get the layers from `gh stack view --json` (or the stacks REST endpoint).
2. Each layer's diff is `git diff <base-parent-branch>...<layer-branch>`, that PR's base to its head. The bottom layer's parent is trunk.
3. Lower layers are context only. A layer is not blamed for code that lower layers added.
4. Spawn a `thermo-review` and `thermo-quality` pair per layer in the same single `task` call (step 4 above), then synthesize per layer. Report one verdict per PR.
5. Re-review a layer when its head SHA changes. Do not re-review unchanged layers. Scope the re-review to the delta: base = the SHA of the last verdict, head = the layer's current head. Name the layer's parent branch in the spec as context so the reviewer can tell what lower layers own.
