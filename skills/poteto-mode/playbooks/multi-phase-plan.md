### Multi-phase or multi-PR plan

**You own the plan, not the code. The plan is a checklist an owner runs box by box and the operator audits from the evidence.** The plan is the deliverable. Do not implement.

1. When the change is one or two files with an obvious approach, skip the plan. Say so and stop.
2. Settle open questions by prototype before you write. Run `playbooks/prototype.md` for each. Keep the branch, the SHA, and the screenshots for Appendix A. Ask the operator only about a product or preference call that no run can settle. Give options (the **never-block-on-the-human** principle skill).
3. Explore in subagents with agent `scout` for read-only discovery or `poteto-agent` otherwise, on a model from the `pstack_models` roles (the **guard-the-context-window** principle skill). Each returns file pointers, conventions, test commands, and entry points. No inlined dumps.
4. Copy the skeleton below into the plan file and fill every placeholder. Unless the operator names a path, write the file to `local://plans/<program>-plan.md`, the session's shared artifact store, so every subagent can read it. Keep every heading and every sub-block in the order shown. One section per PR. One PR is one change with its own evidence (the **sequence-verifiable-units** principle skill). Name the execution playbook in **How to read this**. Pick between `playbooks/autopilot-full.md` and `playbooks/autopilot-stack.md` per the rule at the end of `playbooks/autopilot-stack.md`. A standing program takes `playbooks/orchestrate.md`.
5. Write under the `technical-writing` skill in full, then the `unslop` skill. The body is one Diátaxis mode, how-to. Appendices hold explanation and reference. Each heading states the task or the finding. No long dashes. No mid-sentence colons.
6. Run the plan checker and fix every line it prints (the **encode-lessons-in-structure** principle skill). It is `scripts/check-plan.mjs` in the poteto-mode skill directory: `node <poteto-mode skill dir>/scripts/check-plan.mjs "$(realpath local://plans/<program>-plan.md)"`.
7. Hand back. Post the plan path and the script's output, then stop. Execution starts on the operator's explicit go, under the execution playbook the plan names.

**Verification.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked (the **prove-it-works** principle skill). That sentence is the verification rule. Every verification block opens with it. The live block is mandatory. Ten lanes at the PR head drive the real surface through its control skill, per the **swarm** skill, on the `swarm-workers` role model (default `@task`, resolved through `pstack_models`). Each lane is one box with a concrete scenario, the screenshot it saves, and its pass predicate. One lane is the **Regression lane against trunk.** It runs the same load-bearing scenario on trunk and head. If trunk does not have the feature, the lane records that fact and gates the behavior the diff adds plus the end state the user waits for instead of inventing a trunk result. The perf gate is dual-sided. Trunk and head must both produce the named metric. If trunk lacks the feature, also isolate the work the diff adds and set an absolute budget for that work plus the end-to-end state the user waits for. Do not claim a ratio between unlike scenarios. The perf block names the metric, the interleaved probe, the trunk baseline measured first, and the rule with the number that fails. Review choice, reuse, and stopping follow `skill://thermos`. When the policy selects thermos, it replaces duplicate diff-audit lanes rather than adding another audit. Review never counts as a live lane. A PR that changes an interaction is review-gated. The operator reviews it in chat with screenshots and a video before merge. A PR that changes no interaction writes `**Review gate.** None. <PR id> is not review-gated.` and no boxes under it.

**Control skill.** Pick it by surface. Web, Electron, IDE, and native desktop UIs use `skill://control-ui`, which selects `skill://browser-use` or `skill://cua-driver` and requires user approval for missing installation or setup. CLIs and TUIs use `skill://control-cli`. Native mobile uses whatever simulator-driving skill the repo has. A PR that touches two surfaces gets lanes on both. A surface with no control skill is a risk in Appendix C, and its live block still names how each lane drives it.

````markdown
# <Program> plan

<Under ten lines. What changes, for whom, the rule the program enforces, and the PR ids in order.>

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skill://poteto-mode/playbooks/<execution playbook>.md`. <Who merges, and which PR ids are the operator's items that stop at merge-ready.>

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] Read these at program start. Re-read them at every tick.
  - [ ] `read skill://poteto-mode/playbooks/<execution playbook>.md`
  - [ ] `read skill://swarm`
  - [ ] `read skill://thermos`
  - [ ] `git show origin/main:<repo-local control skill or runbook path>`, or `read skill://control-ui` or `read skill://control-cli` when the repo has none
  - [ ] `read skill://poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `read skill://<each other leaf skill the program uses>`
- [ ] On the operator's go, set the program's done predicate with `/goal`, then start the audit clock as an async `bash` job running `sleep 3600` (`async: true`, no `name`, `timeout: 0`) whose completion wakes you to run the tick prompt below, restarted as the last act of every tick. Never leave the cadence to memory. `/loop` is the user's command, so an operator who wants a driver that outlives the session types `/loop --until '<done command>' <tick prompt>` themselves.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook with `read skill://poteto-mode/playbooks/<execution playbook>.md`. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks. A stacked program has exactly one stacker, and this plan names it as <holder>. Only the stacker runs `gh stack` mutating commands. Owners commit on their own layer and never rebase.
  - [ ] <PR id> and <PR id> are independent and first. Both branch from `main`.
  - [ ] <PR id> after <PR id>.
- [ ] Hold the file boundaries. <PR id or class> touches only `<glob>`.
- [ ] Hold the review gate. <PR ids> change an interaction. They wait for the operator's review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] GitHub via `gh` is the only forge. For a stacked program, check `gh stack view --json` and the `stacked-prs` skill once. Probe availability with `gh api -H 'X-GitHub-Api-Version: 2026-03-10' "repos/<owner>/<repo>/stacks" --silent`. On 404 (stacked PRs not enabled), record the plain-PR fallback. `gh stack view` never exits 9, so it is not the probe.
- [ ] Open the PR ready, never draft, per **Opening a PR**. Use `gh pr create --base <base-branch>`. A stacked layer is opened by the stacker with `gh stack top`, `gh stack add <branch>`, `gh stack rebase` then `gh stack push`, and `gh stack submit --auto --open`, and each layer's base is the branch below it. `submit --auto` leaves generated titles and empty bodies, so the stacker then runs `gh pr edit <n> --title ... --body-file ...` on each new PR per the title and description rules of **Opening a PR**.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run the `deslop` skill before each commit. Use `no-comments` when changed comments need independent cleanup. Choose or reuse review under `skill://thermos` after applicable cleanup. Do not repeat cleanup on the same diff.
- [ ] Triage every review-bot and security-reviewer comment per `references/review-bot-triage.md`. Do not wait for a separate local audit or launch one merely to corroborate the feedback.
- [ ] Rebase onto current trunk before the code-ready report and babysit. Keep that merge base in fix rounds. Rebase again only at merge prep, on a `git merge-tree` conflict with trunk, or on a CI failure that comes from a change on trunk. In a stacked program only the stacker rebases, with `gh stack rebase` then `gh stack push`, or `gh stack sync` when an interactive prompt cannot hang the run.

### Verdict and merge, for every PR

- [ ] At the code-ready head SHA, collect receipts for the gates, the ten live lanes from the PR's **Verify, live** block, and the perf lane from its **Verify, perf** block. Use `skill://swarm` for the parallel runtime checks. Reuse valid verification receipts under the patch-id rule in `skill://poteto-mode/playbooks/shipping.md`. Choose and reuse review under `skill://thermos`. Autonomous execution does not raise the review level. An existing independent audit or GitHub review can satisfy the review part. When the policy selects thermos, it replaces duplicate diff-audit lanes. Pass any chosen diff review a scope spec, not a pasted diff. For a stack layer the scope is `git diff <parent-branch>...<branch>`, with the layers below named for context. The root audits the receipts in the merge-ready report before the verdict.
- [ ] Record the root's independent passing verdict at the exact current head SHA when all required runtime lanes pass and the blocker and stop rules in `skill://thermos` are met. Send confirmed in-scope blockers to the owner, including a proven defect that a lane filed as a note. P2 and P3 suggestions may remain. Verify accepted fixes on the affected path. After a later push, apply the patch-id rule in `skill://poteto-mode/playbooks/shipping.md` and refresh only affected checks or lanes. A new SHA alone does not require a fresh full swarm or local review. Any further review follows `skill://thermos`.
- [ ] <The merge or append rule from the execution playbook, with the patch-id rule from `skill://poteto-mode/playbooks/shipping.md`. A stacked program lands the highest PR of the contiguous verified bottom-up run through step 5 of that playbook, which pins the verified head SHA with `merge-async` or compares it right before `gh stack merge <pr> --yes`.>

### Boot recipe, for every live lane

Each live lane runs in its own isolated worktree at the PR head, started with `isolated: true` on its `task` item (see the Subagents section of poteto-mode for the isolation setting and its fallback). Give each lane its own port and data directory when the surface binds one. Drive through the `control-ui` or `control-cli` skill.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] <Start the backend and the surface. Wait for ready.>
- [ ] <Deliver input only through the control skill's commands. Name the read-only diagnostics.>
- [ ] Save every screenshot to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the report.

## <Task as a verb phrase> (<PR id>)

**Depends on.** <PR id, or None.>

**Files.**

- [ ] Edit `<path>`.
- [ ] Create `<path>`.
- [ ] Delete `<path>`.

**Build.**

- [ ] <One change. Name the symbol and the file.>

**You see.**

- [ ] <One observable result, with the exact log line or screen state.>

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] <Test file and the case it gains, and the test passes the `principle-tests-pay-rent` authoring gate.> Run `<command>`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `<swarm-workers role model>` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run <the same load-bearing scenario> at trunk and head. If trunk lacks the feature, record that and gate <the behavior the diff adds plus the end state the user waits for>. Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 2. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 3. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 4. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 5. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 6. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 7. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 8. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 9. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 10. <Scenario.> Save `<slug>.png`. Pass when <predicate>.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. <What is measured at both trunk and head. If trunk lacks the feature, also name the diff-added work and the end-to-end state the user waits for.>
- [ ] Probe. <The command or procedure, run at trunk and at the head, interleaved. Both sides must produce the metric.>
- [ ] Baseline. Record the trunk <value> first.
- [ ] Rule. <Head against trunk, with the number that fails. If the scenarios differ, add absolute budgets for the diff-added work and the user-visible end state instead of an invalid ratio.>

**Review gate.** The operator reviews before merge.

- [ ] Copy lane <n> screenshots into `<media path>/<pr-id>-review-<slug>.png`.
- [ ] Record a 30 to 60 second video of the change in a lane's isolated worktree. Follow the selected driver's recording guide through `skill://control-ui`, or the `control-cli` skill's terminal recorder. Save it as `<media path>/<pr-id>-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's independent passing verdict at the exact head SHA, with pointers to valid runtime receipts and the reviews run or reused.
- [ ] Review-bot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] <The owner squash-merges its own PR with `gh pr merge <pr> --squash`, or the stacker submits it as the next layer and the operator lands the stack bottom-up with `gh stack merge <pr> --yes` on the highest verified PR.>

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

<Each open question a prototype answered, with the branch, the SHA, and the artifact links. Each question that stays unproven.>

## Appendix B. Alternatives rejected

<Each approach weighed and why it lost.>

## Appendix C. Risks

<Each risk with the PR it lands in and what the owner watches.>

## Appendix D. Links and reading list

<Docs to read before editing. Which PRs get the `how` skill and the `interrogate` skill. The trail per the `show-me-your-work` skill.>
````

**Reply:** the plan path, the PR ids with their dependencies and the review-gated set, what the prototypes proved and what stays unproven, and the check script's output.
