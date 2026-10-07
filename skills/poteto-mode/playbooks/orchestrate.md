### Orchestrate

**You own the program, never the code. Author briefs, drain the queue, keep the frontier green, decide.** For a whole project handed to one standing coordinator session: multi-day, many stacked PRs, dozens to hundreds of subagents, the human checking in twice a day instead of every five minutes. One task driven to a predicate is Autonomous run. One ambitious run needing a bespoke workflow is figure-it-out. Route here when the work outlives any single agent. Work one agent could finish inside the session's budget is not a program.

Ceremony must scale with the program. On cheap near-identical units, collapse it as each section directs.

Three rules carry the rest.

- Completions are queue events, not interrupts.
- Every spawn and every resume carries the standing orders verbatim.
- The brief is the product. A vague brief fails quietly, because a worker cannot ask you a question.

#### Roles and placement

- **Coordinator (this session).** Frames, authors briefs, drains the inbox, owns the human report, makes judgment calls. It never authors or edits code. Conflicted merges, restacks, and code changes are always tasks. Mechanically landing a verified unit (fast-forward or clean cherry-pick of a worker's commit, then push) is bookkeeping the coordinator may do itself on repos where local git is cheap. Queueing finished work behind an idle stacker is how a deadline harvests nothing. The loop is agentic end to end. Agents are spawned, resumed, and drained only through the `task` tool (eval `workpool()` for waves). State reads and writes go through `scripts/orch/orch.ts` at drain points, one command in and one line out. The CLI never spawns, waits, or wakes anything.
- **Sub-coordinator.** Durable, one per track, and only when the program exceeds what one coordinator's drains can manage. A track the coordinator can drain itself needs no middle layer. Each nested layer re-pays a full orientation preamble, and a blocking sub-coordinator hides its children while the parent idles. Owns its track's units and boards, authors its workers' briefs, spawns its own workers and verifiers through the `task` tool. Nesting is capped by `task.maxRecursionDepth` (default 2), so raise it in `~/.omp/agent/config.yml` before a sub-coordinator tree, or keep the depth at coordinator and workers. Rolls up aggregates at wave boundaries. Never forwards raw child reports. Cap in-flight children at what one drain can process, roughly ten, as a rolling window. Never as blocking batches, which cost the slowest child of every batch.
- **Worker / verifier.** Every writer takes `isolated: true` on its `task` item, so it works in its own git worktree, and publishes by pushing its branch and opening or updating its PR. Isolation needs `task.isolation.enabled` and has a fallback when it is off, both in poteto-mode's Subagents section. With `task.isolation.apply` on (the default), OMP applies a successful worker's changes to the coordinator's checkout by itself, so set it to false before the program starts (the `setup-pstack` skill offers that) or treat the coordinator checkout as scratch that is never committed. The coordinator never integrates worker code from a worktree, only from the worker's PR. Verifiers that drive a real surface need this machine: `control-ui` or `control-cli` runtime verification, simulators, and auth that exists only here. Workers see no transcript of this session, so their briefs inline what they need or point at repo paths and store paths. Prefer fewer, broader workers. One writer per worktree or branch (principle-separate-before-serializing-shared-state). When a dedicated verifier is needed, run it on a different model family than the worker, taking the selectors from `pstack_models` roles.

Depth stays at coordinator, track, worker. Author the track decomposition per project (build, landing, and verification are common cuts, not a required shape). Hard-coded swarm trees were tried and parked as too rigid.

#### Store layout

Create `local://orchestrate/<project-slug>/` for the program. `local://` is the session's shared artifact store, readable by subagents, so the register, briefs, and tables reach workers by path. The `orch` CLI takes plain filesystem paths, so resolve it once with `export ORCH_STORE=$(realpath local://orchestrate/<project-slug>)`. Every file has exactly one writer. Owners publish facts, readers aggregate at read time. Use `bun scripts/orch/orch.ts` for bookkeeping, written below as `orch`, while its canonical plain TSV and JSON stay readable without the CLI.

- `preferences.md` is the standing-orders register: numbered lines, one constraint each (model policy, stack shape and count, verification bar, forbidden paths, escalation policy, the stacker holder). Paste it verbatim into every spawn and every resume. Directives decay across resumes, and each dropped one costs a human turn. When you catch yourself restating an instruction, append the line before you act (principle-encode-lessons-in-structure).
- `overview.md` is the durable PR and issue DB. Append. Never rewrite wholesale per event.
- `units.tsv` has one row per unit: id, track, state, branch, PR, head SHA, brief path. Update rows in place.
- `frontier.json` is the computed merge frontier, per Stack safety.
- `ledger.tsv` is the verification ledger, per Verification.
- `inbox/` holds completion pointers. `gates.md` parks human gates (question, options, default on no answer).
- `decisions.tsv` is the trail via the show-me-your-work skill.
- `status.md` is derived from `units.tsv` and `ledger.tsv` at each drain, never hand-maintained. Regenerate it from the tables instead of narrating events into it.

#### The brief

Your prompts to agents are your only product, and a sloppy brief compounds into slop across the whole tree. Every spawn carries all of it. A field you cannot fill is a unit you have not scoped yet.

```
GOAL         one sentence, the outcome, executable by a stranger with no access to this session
SCOPE        paths this unit may write; paths it may not; its exclusive worktree or branch
CONTEXT      pointers to files and PRs; upstream reports pasted in full when this unit
             depends on them, because workers cannot see siblings
ACCEPTANCE   checkable criteria, one per line
VERIFY       exact commands or the control-skill path, plus known gotchas
TIMEBOX      rough cap on runtime; on expiry, return partial findings and stop rather than run on
FORBIDDEN    no rebase, no `gh stack` mutating commands, no force-push, no fixes outside scope, plus unit-specific bans
REPORT       status, branch, head SHA, PRs, verdict, what you actually ran, deviations,
             suggested follow-ups
STANDING     <preferences.md pasted verbatim>
```

Size the brief to the unit. A one-command unit gets the template collapsed to a paragraph that still names goal, scope, the verify command, and the report shape. A 4KB scaffold around a two-line edit costs more to write and obey than the edit. Spawns may reference the standing-orders file by its `local://` path. Verbatim paste is for every resume and any spawn that cannot read the store.

A sub-coordinator brief adds its track boundary and unit list, its spawn budget, the drain protocol, and the rollup format (per child: name, status, PR, head SHA, verdict, one line, plus track status and frontier delta).

A dependency is a context relay, not just ordering. Undeclared upstream context makes the worker guess. Missing fields are a refuse-to-spawn condition. Audit one sampled worker brief per sub-coordinator per wave, concurrently with the wave it samples, never as a gate in front of it. A failing brief stops that track and fixes the sub-coordinator's instructions, not just the worker, because brief quality decays late in a run. Never resume-chain a brief. Respawn fresh with consolidated scope.

#### Steps

1. **Frame.** State the done predicate as something countable ("all 126 units merged, each ledger-verified `unit-test-verified` or better"). Quantify scope: units, rough effort, expected stacks, and the wall-clock budget. If one agent could finish inside that budget, stop here and run Autonomous run instead. Collapsing must not depend on another document being present. It means do the work directly in this session, plain workers where they help, verification inline, landing as you go, and none of the store, register, or pilot machinery below. Schedule landing against the budget. By roughly 70% of it, stop spawning and land what is verified. Name the tracks per project. A contested decomposition or one-way door goes through the arena skill before the pilot. Present the framing once. Reversible prep proceeds without waiting.
2. **Install the runtime.** Run `orch init`. Open the trail via the show-me-your-work skill, write the standing orders before any spawn, and seed `frontier.json` from existing PRs with `orch frontier set --repo <repo-dir>`.
3. **Pilot.** Push one unit through the whole path: brief, worker, verification, stack entry, ledger row, merge. The pilot exists to falsify the brief template, the verify recipe, and the unit size while that costs one agent instead of fifty. Fix the contract from pilot evidence before any fan-out. Scale the pilot to the unit. On programs of near-identical cheap units, the first unit is the pilot, run as a normal unit with its verify command inline, and fan-out starts the moment it lands. The dedicated pilot pipeline (separate verifier agent, audit gate) is for expensive or novel unit shapes, not for clone-units where a serialized pilot has nothing to falsify.
4. **Scale.** Spawn a rolling window of workers up to the in-flight cap, refilling as children finish. Blocking batches pay the slowest child of every batch. Spawn track sub-coordinators only past the one-drain threshold in Roles. Recompute ready work after each drain. Relay upstream reports into downstream briefs. Keep sibling communication upward only. The sampled brief audit runs alongside the wave it samples and stops the next refill on failure, not the current one.
5. **Drain.** Run the queue discipline below at every drain point.
6. **Land.** Landing is continuous, never a terminal phase. Integration starts with the first verified unit and runs alongside the remaining waves. On heavy repos the stacker is a standing role from wave one, integrating as units verify. On repos where local git is cheap, the coordinator lands verified units itself per Roles. Keep the frontier green before upper-stack work. Stack safety governs. Advance `frontier.json` only on merge or reported new head SHAs.
7. **Close.** Drain the final inbox, reconcile every spawned agent to a terminal row (done, abandoned, zombie-reconciled), confirm the predicate on the real artifact, confirm every landed PR has a verdict for its current head SHA, audit the trail per show-me-your-work including its cross-model review, encode recurring corrections into `preferences.md` or the brief template. Leave the store intact. It is the postmortem.

#### Queue and drain

- On a completion notification, run `orch inbox push <agent> <unit> <status> [--report PATH]` and return to what you were doing. Never deep-review inline. A completion that needs review becomes a verifier unit. Never review a diff inside a drain.
- Drain in batches at four points: the end of a critical section, a track rollup, a frontier watcher wake (an async `bash` job, `async: true` with no `name` and `timeout: 0`, that polls `gh stack view --json` or the stacks REST endpoint on a `sleep` interval of 15 minutes or longer and exits only on a frontier delta, so its completion wakes you. The operator may instead type `/loop --until '<frontier changed command>' <drain prompt>`, since no tool starts `/loop`), and before a human report. Begin each batch with `orch inbox drain`. Arrivals during a drain wait for the next one.
- Critical sections you finish first: authoring a brief, a stack operation, a conflict decision, writing a gate, updating ledger or frontier.
- Each drain classifies every pointer (landed, needs-verify, failed, zombie, noise), writes the resulting rows through `orch unit add`, `orch unit set`, and `orch ledger record`, runs `orch status`, then spawns the next wave in one message.
- Account for every spawned child at its track's rollup: arrived, respawned, or its scope explicitly absorbed. Silently redoing a missing child's work hides both the wasted spend and the coverage gap its result existed to close.
- A drain turn ends with the three lines from `orch status`: counts against the states, what changed, gates open. Detail lives in `status.md`. The full reply contract applies at checkpoints and close.

#### Stack safety

- The frontier is a computed object, never narrative. Recompute `frontier.json` after every merge and every stack mutation from `gh stack view --json` (bottom-to-top `branches[]` with `head`, `base`, `isMerged`, `needsRebase`, `pr`) in the stacker's clone, or from `GET /repos/{o}/{r}/stacks[?pull_request=N]` through `gh api -H 'X-GitHub-Api-Version: 2026-03-10'` when no checkout has the stack. Record the ordered unmerged PR list, branch names, head SHAs, a generation number, and the lowest unmerged PR. GitHub base refs are authoritative and retarget automatically after a bottom merge, so never hand-retarget with `gh pr edit --base`. A checkout that never saw the stack exits 2 (not in a stack), and the command errors rather than guessing, so fall back to the REST endpoint.
- Exactly one stacker per stack may run `gh stack` mutating commands (`init`, `add`, `rebase`, `sync`, `push`, `submit`, `link`, `unstack`, `merge`), serialized within its stack. Record the holder in the standing orders. `gh stack` serializes on a clone-wide lock (exit 8, retry and never delete the lock), which does not make concurrent writers safe. Run restacks (`gh stack rebase` then `gh stack push`, or `gh stack sync` only when no prompt can hang the run) in the stacker's own isolated worktree, started as a `task` item with `isolated: true` (or in a `/wt` worktree the operator or stacker creates, when isolation is off), so a many-layer rebase never churns the coordinator's checkout or a worker's. OMP has no cloud environment, so there is no off-machine restack. Read-only state (`gh stack view --json`, the REST endpoint) is safe for anyone.
- Workers never rebase and never run `gh stack` mutating commands. Babysitters follow `playbooks/babysit.md`, one per stack, scoped to one immutable frontier generation. They report conflicts (exit 3 from the stacker's rebase) to the stacker rather than restacking.
- PR closes and stack surgery (`gh stack unstack`, then `init`) go through the stacker only. Closing a base PR orphans every layer above it. Landing goes through `gh stack merge <pr> --yes`, which merges `<pr>` and every unmerged PR below it atomically, so a merge target is always the highest PR of the contiguous verified run. Merges and stack surgery are units with briefs like any other.
- One retro watcher follows merged PRs for reverts, post-merge CI breaks, and orphaned follow-ups.

#### Verification

Scale verification to the unit. When VERIFY is a single cheap command, the worker runs it and reports the output, and the coordinator checks the receipt. A dedicated verifier agent (on a different model family than the worker) is for units whose verification is expensive, judgment-laden, or high-blast-radius. A verifier agent whose entire product would be rerunning one command is ceremony, not verification.

Every landable PR needs an independent root verdict based on relevant checks and current-head receipts. Use `skill://thermos` for review choice, reuse, and stopping. Autonomous execution does not raise the review level. A prior independent audit or GitHub review can satisfy the review part without a fresh reviewer. A small low-risk unit can use a direct check and receipt judged by the coordinator. When the policy selects thermos, it replaces duplicate diff-audit lanes rather than running beside them. Pass any chosen diff review a scope spec (base ref, head SHA, PR number, intent paragraph, and for a stack layer only that layer's `git diff <parent-branch>...<branch>` plus the names of the layers below), never a pasted diff. Review does not replace relevant runtime proof. Send confirmed in-scope blockers accepted by the owner back as a fix unit, then verify the affected path. Apply the central stop rule instead of requiring zero findings or clearing P2 and P3 suggestions. Because `gh stack merge <pr>` lands every PR below `<pr>`, the landable set is the contiguous bottom-up run of verified PRs, and the merge target is the highest PR in that run.

Write ledger rows with `orch ledger record`. Check the current PR and head SHA with `orch ledger check`. `ledger.tsv`, one row per verdict, keyed by PR number plus head SHA: `live-ui-verified | unit-test-verified | type-check-only | verifier-blocked | verifier-failed`. CI green is an input to a verdict, not a verdict. Behavioral work needs better than `type-check-only`. `verifier-blocked` is not a pass. Respawn when the environment heals. `verifier-failed` gets a fix unit, not a re-verify. A worker may self-report. The independent root verdict overrides it on the same key. A new head needs its own ledger row, not a fresh full audit. Apply the patch-id rule in `skill://poteto-mode/playbooks/shipping.md` to carry forward valid receipts, refresh affected checks or lanes, and record the evidence for the current head. Review reuse and any further review follow `skill://thermos`. Re-run mergeability and CI at the current head. The ledger answers "was this verified", not memory and not the transcript.

A unit is not done until its output is externalized the moment it lands, never batched to the end of the run. The worker pushes its branch, the coordinator records the current-head verdict in the ledger, and receipts land in the store. Work that exists only on one VM when that VM dies was never done.

#### Liveness and failure

- Never resume an agent to check on it. A resume restarts an idle agent. Probe read-only: the ledger, `units.tsv`, `gh`, pushed branches, the agent's status in the agent hub (`Alt+A`) or `agent://<id>`. Transcript mtime is not liveness.
- A silent death gets a synthetic postmortem row in the inbox (unit, failure mode, last evidence, options). Replan on evidence as it arrives. Never wait for full quiescence.
- Retry by mode: cap-hit or oom, respawn with smaller scope. Network-drop, retry as-is. Tool-error, retry on a different model. Unknown, retry once. Two retries, then abandon the unit and replan around it.
- A zombie that returns hours late reconciles against the current frontier and ledger before anything is accepted. Salvage unique findings through a fresh unit, never a blind merge.
- When continued spawning would produce garbage tree-wide (bad upstream output, broken acceptance, dead infra), write a stop line at the top of the standing orders, let in-flight work finish, fix the cause, clear it.
- Bound your own infra retries the same way you bound a child's. After a few consecutive tool aborts, stop retrying. Write a terminal handoff to durable state (what is done, where it lives, the exact command to resume) and end the run.
- After an omp restart or a compaction: running subagents are gone, pushed branches and PRs are not. Re-read the standing orders and `units.tsv` from `local://orchestrate/<project-slug>/`, recompute the frontier, reattach work by PR and branch rather than agent id, respawn one sub-coordinator per track from its stored brief plus current state, drain, resume. If the session's `local://` is gone, rebuild the tables from `gh` and the pushed branches before anything else. The dead session's store lock clears itself on the next write. `orch` replaces a lock whose holder pid is gone.

#### Escalation

Reaches the human, batched into the status page rather than per item: irreversible actions (force-push to shared branches, deploys, deletions, closing someone else's PR), genuine product or preference calls no experiment settles, a standing order that contradicts observed reality, a program-level dead end that survived a replan. Park each as a `gates.md` entry before asking, and route work around it.

Never reaches the human: frontier nudges, restack mechanics, retries, CI flake triage, review-thread triage, format fixes, scope the brief already forbids (refuse and continue), and "should I keep going". When in doubt, act and log.

Mid-run discoveries fix only what blocks the frontier. Everything else parks in follow-ups. At this fan-out a small scope leak multiplies into PRs nobody asked for.

**Reply:** at checkpoints and close: the predicate and the count against it from `units.tsv` and `ledger.tsv`, tracks and what each landed, the frontier (PR list plus SHAs), verdicts with the checks and review sources actually used, what was abandoned and why, gates awaiting the human (the only asks), the store path, and the trail path. Numbers from the tables, not narrative. Include PR links.
