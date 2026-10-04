---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

Fan out N parallel workers. They may cover separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns one report.

## Start

Open a `todo` list with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is total workers, not the concurrency limit.
4. Pick the worker model with `pstack_models` role `swarm-workers` (default `@task`). If the tool is absent, read `rule://pstack-models` for the `swarm-workers` line and use the default. Pass each returned selector as the task item's `model`. If a selector is rejected, use the default and say so. For a model race, name each arm's model up front.
5. Give each worker its own writable output when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Spawn all N workers in one `task` batch, or push them into an eval `workpool` when N is large or results should stream back. Use agent `task` for writers, and `scout` or `reviewer` for read-only verification lanes. Pass the step 4 model. Writers that might collide set `isolated: true` so each gets its own git worktree. That flag only exists when `task.isolation.enabled` is on (default off; see the `setup-pstack` skill), and with `task.isolation.apply` on (the default once isolation is enabled) successful worktree changes are applied back to the parent checkout. When isolation is off, create the worktrees yourself with `/wt`, or run one writer at a time.

When a worker must start from a non-default branch, name the branch in its brief and have it check that branch out first.

When the swarm verifies a PR, the two thermo lenses are mandatory lanes, run through the `thermos` skill: agents `thermo-review` and `thermo-quality`, scoped to the same diff, launched as items of one `task` call with heterogeneous `agent` values (not a `workpool`, which would drop their structured output). The swarm's own lanes are the coverage-matrix, race, and gauntlet lanes. The thermo lanes never substitute for them and they never substitute for the thermo lanes.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and respawn that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.
