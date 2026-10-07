---
name: thermos
description: "Run both full thermo-nuclear lenses in parallel for deep findings and one deduped verdict. Also choose when focused verification or existing review is enough without repeating an audit. Use for thermos or a deep review."
disable-model-invocation: true
---

# Thermos

Thermos runs two diff-scoped lenses in parallel and returns one deduped verdict. It is the deep-review option, not a mandatory PR gate.

- agent `thermo-review`, skill `skill://thermo-nuclear-review`, checks bugs, breakage, security, devex regressions, and feature-gate leaks.
- agent `thermo-quality`, skill `skill://thermo-nuclear-code-quality-review`, checks maintainability, code-judo simplification, file cohesion and 1k-line growth, spaghetti, types, boundaries, module depth, and test value.

Thermos is read-only. Fixing is the owner's job.

Review frequency and review depth are separate decisions. When thermos runs, use both complete rubrics. Search for unnamed failures and structural simplifications, trace consequences beyond the diff, and retain useful P0-P3 findings. A risk that prompted the run is a starting point, not the only permitted finding.

Thermos is a cheaper alternative to `skill://interrogate` because it runs one pair of lenses rather than a pair per panel seat. It does not use a weaker rubric. Model diversity adds independent perspectives, not permission to investigate deeply.

## Choose the review level

Use this policy in every playbook that opens, updates, verifies, or lands a PR. A lifecycle step is not a reason to start another review.

| Change or request | Default |
| --- | --- |
| Small, low-risk change such as prose, copy, a mechanical rename, or a local cleanup with no contract change | Read the diff and run the relevant checks. No review agent. |
| Routine behavior change | Prove the changed path with relevant tests and a smoke run. Use `skill://blast-radius` inline when an invariant or downstream effect needs deeper investigation. No mandatory local audit. |
| Concrete high-impact risk left unresolved by focused verification, such as authorization bypass, data loss, or a concurrency failure | State the risk, then run thermos once on the affected scope. |
| Explicit deep or multi-model review request | Run thermos with both full rubrics, or `skill://interrogate` for model diversity. Choose one method for the same decision rather than stacking review gates. |

Keep verification even when local review is skipped. CI, targeted tests, and live checks prove behavior. Review agents do not replace them. For a skill or prompt change, exercise the instructions with representative requests.

When GitHub bots or humans cover routine PR review, use that feedback instead of duplicating it locally. Check the available coverage rather than assuming a bot exists. Thermos can provide an independent search for deeper findings when requested or warranted by an unresolved concern. Do not merely re-check each bot comment. Open the PR without waiting for a bot that starts on PR creation. Do not start babysitting unless the task asks for it.

`skill://blast-radius` is an evidence-driven alternative when a change's safety depends on an invariant or downstream effect. Discover the critical assumptions, trace their consumers, and exercise real failure cases. Its focus saves work, not rigor. Report the coverage boundary instead of claiming a whole-diff audit. Choose `skill://interrogate` when independent model perspectives would help settle a contested high-risk design.

## Review once, then verify fixes

- Reuse an existing review of the same scope when moving between implementation, PR creation, babysitting, and shipping.
- A new head SHA, push, rebase, PR creation, or merge request does not by itself require a local review. Check which behavior changed and refresh only the affected verification.
- After accepting a finding, fix its root cause within the task and prove the affected behavior. Prefer deletion or a simpler model when that removes the problem. Do not rerun an open-ended audit just to check the fix.
- Start another local review only when the user asks or a substantive change introduces a new high-impact risk outside the reviewed scope. Review that delta and name the new risk.
- Stop when evidenced P0 and P1 blockers are fixed or dismissed with evidence and the required checks pass. Never chase zero findings. Keep useful P2 and P3 findings visible for the owner's decision. Non-blocking findings do not force another round or prevent handoff.
- Distinguish a demonstrated code-judo simplification from speculative redesign. The reviewer may propose a substantial behavior-preserving simplification. The owner decides whether to take it. Reject layers or handlers for hypothetical use cases and proposals with no concrete benefit.
- Triage GitHub feedback directly with `skill://poteto-mode/references/review-bot-triage.md`. Do not run thermos merely to corroborate a bot comment.

For code, run `skill://deslop` before a chosen review. Use `skill://no-comments` when changed comments need an independent cleanup pass. Skip code-only cleanup agents for prose-only work. Do not repeat cleanup already completed on the same diff.

## Run a deep review

Run these steps only when **Choose the review level** selects thermos or the user explicitly requests it. Reading this skill for its policy does not trigger the agents.

1. Determine the scope from the user request, PR, current branch, or local uncommitted work. Resolve `base` (default `main`) and `head`. For a PR, get the number, title, and body with `gh pr view <n>`.
2. Write the scope spec. Do not paste the diff. The spec holds:
   - base ref and head ref (or "working tree" for uncommitted work)
   - PR number if any
   - an intent paragraph: what the change is for and what breakage is intended
   - the explicit review request or unresolved concern that justifies this run, without restricting the findings to that concern
   - for a stack layer: the one layer under review (`git diff <parent-branch>...<branch>`) and the names of the layers below, for context only
   - optionally a pointer to a saved diff at `local://review/<id>.diff` when the diff is big
3. Read model roles. Call `pstack_models` with `role: "thermos-review"` and `role: "thermos-quality"`. If the tool is absent, read `rule://pstack-models` and fall back to the defaults. The extension also applies these roles automatically when the agents spawn, so passing `model` is optional. Pass it when the role resolves to something other than the agent's alias.
4. Spawn both lenses in ONE `task` call. Each selected deep-review scope gets two items. An explicit stack review selects all requested layers. A risk-triggered review selects only affected layers.
   - `agent: thermo-review` with the scope spec and a `solutionSpace` like "comprehensive correctness and security audit, breakage paths unknown".
   - `agent: thermo-quality` with the same scope spec and a `solutionSpace` like "deep structural audit, simpler models and code-judo opportunities open".
   Use one `task` call with heterogeneous `agent` items, not a `workpool`. A workpool binds one agent and replaces its structured output with a free-form schema. The task tool keeps each agent's own schema, so you get the verdict and priority 0-3 findings back structured. Name items by scope and lens (for example `Layer2Review`, `Layer2Quality`).
5. Wait for all items. Synthesize.

## Synthesis

Findings first, then the verdict. No praise.

Tag each finding with the lens from the item that produced it (`thermo-review` or `thermo-quality`). Do not trust a finding's own `lens` value for that. The agents' `lens` field is `review-bot` or `human` only when the finding was sourced from PR discussion.

1. Dedup findings across the two lenses and across scopes. Merge same-root findings into one entry with both lenses credited.
2. Independent overlap raises confidence, not severity. Two opinions do not turn a preference into a blocker.
3. Resolve disagreements with your own judgment. Read the relevant code. Do not average.
4. Bucket every finding:
   - **act-on**: evidenced, in-scope issue or simplification accepted by the owner. Fix the root cause without unrelated work.
   - **consider**: valid non-blocking improvement or lower-priority finding the owner has not selected, including code-judo opportunities. Preserve its evidence and tradeoff. Do not silently turn it into new work.
   - **noted**: true but out of scope or intended, recorded only.
   - **dismissed**: wrong, speculative, preference-only, or already handled, with a concrete reason.
5. Verdict is `approve` or `changes_requested`. Any unresolved evidenced P0 or P1 means `changes_requested`, including a serious structural regression. Fix or dismiss it with evidence, verify the affected path, and proceed without another full review. Declining a fix does not remove a blocker. Resolve a disputed finding explicitly rather than parking it in consider, hiding it, or lowering its priority. Approval does not require an empty findings list.
6. If `show-me-your-work` is active, add a trail entry: scope, lenses run, buckets, verdict, dismissals with reasons.

If the agents' summaries are already visible to the user, do not restate them. Surface the unified verdict, the highest-signal findings, and remaining uncertainty.

## Review a stack

For a selected deep review, use one scope per selected unmerged layer, bottom to top.

1. Get the layers from `gh stack view --json` (or the stacks REST endpoint).
2. Each layer's diff is `git diff <base-parent-branch>...<layer-branch>`, that PR's base to its head. The bottom layer's parent is trunk.
3. Lower layers are context only. A layer is not blamed for code that lower layers added.
4. Spawn a `thermo-review` and `thermo-quality` pair per layer in the same single `task` call (step 4 above), then synthesize per layer. Report one verdict per PR.
5. Apply **Review once, then verify fixes** to each layer. A changed head SHA is not a review trigger. If a new high-impact risk warrants another review, scope it to the delta since the prior review and name the layer's parent branch as context.
