# Audit Sweeps

How to prune tests that no longer pay rent. The authoring gate, junk patterns, and retention bar in [SKILL.md](../SKILL.md) are the value bar for every step here. Optimize for confidence, not deletion count. Prefer a few high-confidence candidates over a large speculative inventory.

## Audit mode: one focused sweep

### 1. Discovery (read-only)

Report evidence before editing. For a broad scope, fan read-only `scout` agents out along production owner boundaries (core, plugins, UI and tooling, plus one cross-cutting pattern sweep) through an eval `workpool`. Each hunts the junk patterns. Scouts have no write tool and cannot run git, so each returns its findings in its report and the parent records them.

Before judging a candidate, read the complete test, its production owner, entry point, callers, callees, sibling implementations, overlapping tests, and CI routing. When the test claims dependency-backed behavior, read the dependency source or types. The history of why a test exists needs `git log` and `git blame`, so run that pass with a `reviewer` (or a `task` agent told to stay read-only), never a scout.

### 2. Candidate evidence record

Write every field before editing. A missing field means the candidate is not ready for deletion.

- Exact test name and location.
- The failure it can actually detect.
- Non-test callers of the production or support seam it covers.
- The stronger remaining owner-boundary proof, or why none is needed.
- History and the reason the test or seam exists.
- The production or test-support deletion it unlocks.
- Risk, and the focused validation command.

### 3. Edit shape

Choose one coherent owner-boundary batch. Delete test-only exports, globals, wrappers, and dead production paths instead of keeping aliases. Move retained regressions to their canonical owner. Fold repeated assertions into one generic contract. Aim for net-negative production LOC. Do not add replacement tests that restate the implementation, and do not turn uncertain candidates into cleanup to inflate the count.

### 4. Validation order

Never edit while a test run is in progress in the same checkout.

1. Run the smallest owner tests and their siblings.
2. If a removed grep or plan assertion guarded a real contract, run the executable that owns that contract.
3. Format the touched files, then `git diff --check`.
4. Run the changed-files gate the repository requires.
5. Read `git diff --numstat` and report production, tooling, and tests separately.
6. Run `thermos` on the final diff, scoped to the audit branch.

### 5. Handoff report

- Root cause and the low-value categories removed.
- Production owner simplifications.
- Retained false positives and why they stay.
- Proof actually run, focused and full.
- Production versus test LOC.
- Named follow-ups.

Commit, push, open a PR, or land only when authorized. Land one coherent change at a time. After it lands, refresh from the trunk and rerun discovery for the next batch.

## Campaign mode: a whole subsystem

Use when one subsystem's entire test surface needs pruning. Each step ends on its completion criterion. Do not start the next step early. Keep the ledgers as `local://` artifacts so lanes, layer plans, and the review read one source. The parent writes every ledger file from what the agents report.

1. **Baseline.** Record the subsystem's test and support line counts and every test file's pass or fail state at a pinned trunk SHA. Keep baseline failures in their own list: they are often real product bugs, not stale tests. Done when every in-scope file has a baseline result.
2. **Lanes.** Split the surface along production owner boundaries, not file prefixes. Include the subsystem's cases at shared core boundaries and its live or QA harness tests. Done when every test file belongs to exactly one lane.
3. **Ledger per lane.** Run one read-only `scout` per lane (an eval `workpool`). The scout reads every assigned test in full, including parameter tables, marks each declaration, and returns the ledger in its report; the parent writes `local://ledger-<lane>.md`. A table test is one declaration unless its rows need different marks.
   - `R`: retain, naming the contract and the bug it catches. A move to a better-named file stays `R`.
   - `F`: retain the contract, repair the assertion (for example a negative that passes when only one of several items is missing).
   - `C`: consolidate, naming the owner that absorbs the assertion first.
   - `D`: delete, naming the proof that remains or why no contract exists.

   Judge a test by its assertions, not its name. Done when every declaration has a mark and an evidence line.
4. **Layer plan per lane.** The ledger is input, not the edit list. A second read-only pass looks for the redundant layer: several suites replaying the same shared behavior through one mocked collaborator, around a stronger real-boundary suite. Run it with a `reviewer` or a `task` agent told to stay read-only, because it needs `git log` for history. Name the **keeper** suite for each contract, and prefer the real boundary with a fake network over a mocked collaborator. Fix ledger errors found here. Done when each plan names retired files, the keeper per contract, assertions to carry into keepers, and the test-only seams unlocked.
5. **Cutover.** Spawn `task` writers with `isolated: true`, one per lane, and merge their results. Isolation only exists when `task.isolation.enabled` is on (default off; see the `setup-pstack` skill). With it off, create one worktree per lane with `/wt` and let a lane owner work in each, or run one writer at a time. Serialize changes to shared harnesses and support files through one owner. With each lane, remove the test-only seams it unlocks: injection parameters, getters, reset exports, indirection layers. Update test inventories, CI routing, and any shrink-only size baselines. Record durable ownership rules learned from this campaign's real mistakes where the subsystem's contributors will read them. Done when every plan is applied and each keeper passes.
6. **Independent preservation review.** Run `thermos` on the final diff, then one `reviewer` per boundary group comparing deleted coverage against keepers. Reviewers only report: they look for contracts that lost their only proof and for new assertions that cannot fail, such as a rejection row production never reaches, and they never run builds or edit. The lane owner (or an isolated `task` writer) does the mutation check for each reported gap: mutate the production owner once, confirm the keeper goes red, then restore the source byte for byte. Done when every gap is restored or rejected with source evidence and every restored contract has a caught mutation.
7. **Product defects.** A baseline failure that survives into a keeper is a bug report. Fix it at its owner in a separate commit and prove it through the real user flow, with a control run that reverts the fix and shows the old behavior. Log unrelated discrepancies as follow-ups. Done when each repaired defect has a failing control and a passing candidate on the same harness.
8. **Reconcile and hand off.** Merge the trunk into a long campaign instead of rebasing. When the trunk edited a file the campaign deleted, keep the deletion, port the new contract into the keeper, and confirm each new regression still has a home. Rerun the whole subsystem suite on the merged head. Hand off with the audit report plus baseline and final line counts (production separate), lanes, retired layers and keepers, preservation gaps with their mutations, and defects with control and candidate proof.
