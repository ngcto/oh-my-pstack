---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
---

# Arena

Fan out N parallel attempts at the same task. Read every candidate end to end. Pick the strongest as the base. Graft the best ideas from the others into it. Verify the synthesized result.

## Start

Open a `todo` list with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Cross-judge
4. Pick
5. Graft
6. Verify

## Phase A: Frame

The N candidates will receive the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric. State what success looks like for *this* task, then turn it into 3-6 concrete gradeable criteria. The rubric is the picker's tool in Phase D. Candidates only see the task.
3. Pick the runners. Call the `pstack_models` tool with `role: "arena-runners"`. It returns the resolved panel: one entry per selector, with the concrete model, its family, and a `diverse` flag. Each returned `selector` becomes the `model` field of one task item. If the tool is absent, read `rule://pstack-models` (or `~/.omp/agent/rules/pstack-models.md`) and use its `arena-runners` line, falling back to `@slow, @default, @task`. Aliases that resolve to the same concrete model collapse into one seat. If the panel is not diverse, say so once ("one model family available, so this arena is one opinion, not three") and run the deduped list. Do not pad with clones of the same model to fake diversity. Spawn more seats when the arena covers multiple design directions. Same model N times is fine only when the work is generation-bound rather than judgment-sensitive, and then the Frame should say so.
4. Assign output paths. Each candidate writes to its own location (an `isolated: true` task worktree when the attempt writes code, otherwise a `local://arena/<slug>/candidate-<n>/` file), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Spawn all N candidates in one `task` call, one item per resolved runner entry, each with `agent`, `model` set to that entry's selector, the task, the path to the shared grounding, its own output path, and instructions to produce both the artifact and a short rationale. Tasks run in the background by default. Attempts that write code set `isolated: true` so each lands in its own git worktree and no two attempts touch the same tree. Read-only design or prose attempts need no worktree. Give every item a `solutionSpace` that says how open-ended the attempt is and never mention the sibling candidates.

Each rationale names the alternatives the candidate considered and what it rejected.

If a candidate fails to produce output, proceed with N-1 and note the dropout in the synthesis record.

## Phase C: Cross-judge

After all Phase B candidates complete, call `pstack_models` with `role: "arena-cross-judge"` and choose one resolved entry. Prefer a different model family from the parent's. If no entry differs in family, use the strongest one and note that the judge shares the parent's family. Spawn one read-only judge on that selector, using the `scout` agent or another agent whose `tools` list has no edit or write. It sees the rubric and the candidates by path label, scores each criterion, and recommends a base with rationale. It runs in parallel with the parent's reading in Phase D, not with the candidates themselves. Don't spawn the judge while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking.

Score each candidate against the rubric criterion by criterion, not on holistic feel. Compare against the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base on which candidate a future maintainer can extend most easily without breaking invariants. Prefer the cleaner boundary or smaller API when two feel tied, per the Laziness Protocol.

Record the pick and the reason in a short synthesis note alongside the base artifact, including the cross-judge's verdict.

## Phase E: Graft

Walk each losing candidate once more and identify what is worth porting into the base. The signal is usually one or two things per candidate, not most of it.

Fold each graft in by hand, per the **redesign-from-first-principles** principle skill. Don't paste mechanically. The result has to remain coherent under one mental model.

For code attempts run in `isolated: true` worktrees, the base candidate's changes are applied with the task tool's apply/merge semantics. Then graft the chosen parts of the others by hand, or apply the losing candidate's patch and cut it down to the part worth keeping. Never merge a losing worktree wholesale.

Record what was grafted, from which candidate, and what was rejected and why.

When N candidates converge on the same shape, that is a strong agreement signal. Note the convergence in the record and ship the consensus shape. No graft is needed. When N candidates wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

The synthesized artifact has to hold up under the same scrutiny as any other output, per the **prove-it-works** principle skill.

If verification surfaces a problem the arena did not catch, either Phase A was wrong (re-frame and re-run) or one candidate caught it and you missed the graft (go back to Phase E). Don't paper over.

## Outputs

One synthesized artifact. One short synthesis note alongside, naming the base, the grafts (with source candidate), the rejections, the dropouts if any, and the verification result.
