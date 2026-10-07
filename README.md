# oh-my-pstack

Rigorous engineering workflows for oh-my-pi (omp). It is a native port of Cursor's pstack, built by Lauren Tan (poteto). Twenty-three playbooks, thirty-three skills, twenty-six principles, and four agents route through one entry point, `/poteto-mode`. Replies are plain-spoken by default, review is thermo-nuclear, and stacked PRs run on GitHub's own Stacked PRs.

This is a derivative work. The skills, playbooks, principles, and guide come from upstream pstack (MIT, Lauren Tan / poteto, <https://github.com/cursor/plugins/tree/main/pstack>). Thermos and the ported `deslop`, `control-cli`, `control-ui` come from Cursor's `thermos` and `cursor-team-kit` plugins (MIT). The UI driver guides use Browser Use, Browser Harness, and Cua Driver (MIT). Two new principles come from OpenClaw's `test-audit` and Matt Pocock's `codebase-design` (both MIT). The stacked-PR mechanics come from GitHub's `gh-stack` (MIT). Full credits are in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## what changes vs pstack

Seven deltas from upstream:

1. **No `/bro` skill.** Plain voice is the default. [`rules/pstack-voice.md`](./rules/pstack-voice.md) is always applied. Say "simpler" to get an even plainer restatement.
2. **No `origin` CLI.** GitHub through `gh` is the only forge.
3. **Review proportional to risk.** Small, low-risk changes need no review agent. Routine behavior changes use targeted checks and [`blast-radius`](./skills/blast-radius/SKILL.md) for concrete uncertainty. [`thermos`](./skills/thermos/SKILL.md) is a single deep review for explicit requests or unresolved high-risk concerns. Existing reviews are reused across PR creation, pushes, and merge prep.
4. **New principle [`tests-pay-rent`](./skills/principle-tests-pay-rent/SKILL.md)**, from OpenClaw's `test-audit`. Authoring gate, junk patterns, retention bar, audit sweeps.
5. **New principle [`small-door-big-room`](./skills/principle-small-door-big-room/SKILL.md)**, from `codebase-design`. Deep modules, seams, the deletion test.
6. **`deslop`, `control-cli`, `control-ui` ship here** instead of living in a second plugin. UI control uses the bundled `browser-use` and `cua-driver` guides rather than omp's built-in UI globals.
7. **GitHub native Stacked PRs replace Graphite.** `gh stack` plus the stacks REST API. See [stacked PRs](#stacked-prs).

And it is omp-native instead of Cursor-shaped:

- **Role aliases, not model slugs.** Defaults are `@slow`, `@smol`, `@task`, `@default`, so it works on any provider with zero config. Users override per role.
- **`pstack_models` tool.** The extension resolves a role to concrete models, flags whether a panel is really diverse, and lists your authenticated models for `/setup-pstack`.
- **Sticky `/poteto-mode` extension command.** On, off, or status. The mode persists across turns.
- **Voice rule.** Plain replies come from an always-applied rule, not a skill you have to call.
- **Native tools.** `task` and eval `workpool` for fan-out, eval `archive` for `recall`, `xd://lsp`, `xd://debug`, and `xd://ast_grep` for code intelligence. UI work uses the Browser Use and Cua Driver CLIs through `control-ui`.

## install

```bash
omp plugin marketplace add ngcto/oh-my-pstack
omp plugin install oh-my-pstack@oh-my-pstack
```

Local development:

```bash
omp plugin link <path-to-this-repo>
# or, for one session (skills, agents, rules only; add the extension explicitly)
omp --plugin-dir <path-to-this-repo> -e <path-to-this-repo>/extensions/index.ts
```

`--plugin-dir` alone does not load extension modules, so the `/poteto-mode` command, the bare workflow commands (`/thermos`, `/why`, ...), the `pstack_models` tool, and role routing are missing without the `-e` flag. `omp plugin link` and marketplace installs load everything.

Run `/reload-plugins` after changing skills, agents, or rules. Extension modules (the `/poteto-mode` command and the `pstack_models` tool) load at startup, so restart omp after installing or changing them.

Prerequisites:

- `gh`, authenticated.
- `gh extension install github/gh-stack` for stacked PRs. GitHub Stacked PRs are in public preview.
- git 2.36 or newer.

UI drivers are optional until first use. [`control-ui`](./skills/control-ui/SKILL.md) selects [`browser-use`](./skills/browser-use/SKILL.md) for web/CDP work or [`cua-driver`](./skills/cua-driver/SKILL.md) for native and GUI-only work. The agent checks the selected executable and setup before driving. If anything is missing, it asks you to install and complete setup, or approve help. Nothing installs automatically.

## get started

1. Run [`/setup-pstack`](./skills/setup-pstack/SKILL.md). It detects your models, asks for a reasoning budget, and writes an override file. Skip it to keep the defaults.
2. Use [`/poteto-mode`](./skills/poteto-mode/SKILL.md) whenever the work needs rigor.

New here? The [guide](./docs/guide/README.md) walks a first real task from setup to overnight runs.

```
/poteto-mode this pr has a subtle bug where the scroll drifts every 750ms even when idle. repro first, then fix and verify.
```

## playbooks

`/poteto-mode` matches your task to one of twenty-three playbooks and copies its steps into a todo list.

| playbook | for |
|---|---|
| [investigation](./skills/poteto-mode/playbooks/investigation.md) | a read-only question. how does x work, why was y built this way, are we sure. |
| [bug fix](./skills/poteto-mode/playbooks/bug-fix.md) | reproduce a defect, root-cause it, and fix with runtime evidence. |
| [perf](./skills/poteto-mode/playbooks/perf-issue.md) | trace a measured slowness and improve it against a baseline. |
| [hillclimb](./skills/poteto-mode/playbooks/hillclimb.md) | sustained, scientific improvement of one metric against a target, looping hypotheses with before/after measurement and one commit per accepted win. |
| [runtime forensics](./skills/poteto-mode/playbooks/runtime-forensics.md) | diagnose a live symptom (leak, idle-cpu spin, glitch) from instrumentation. |
| [trace forensics](./skills/poteto-mode/playbooks/trace-forensics.md) | diagnose a captured profiling artifact (cpuprofile, trace, spindump, heap snapshot). |
| [feature](./skills/poteto-mode/playbooks/feature.md) | new or changed behavior, built from a named data shape. |
| [refactoring](./skills/poteto-mode/playbooks/refactoring.md) | a behavior-preserving change to structure or shape. |
| [prototype](./skills/poteto-mode/playbooks/prototype.md) | a throwaway sketch to make a design or behavioral decision cheaply, or to settle an empirical fork by observing it. |
| [visual parity](./skills/poteto-mode/playbooks/visual-parity.md) | pixel-exact ui equivalence between two implementations. |
| [authoring a skill](./skills/poteto-mode/playbooks/authoring-a-skill.md) | writing or editing a SKILL.md. |
| [eval](./skills/poteto-mode/playbooks/eval.md) | test how a skill or prompt change affects agent behavior, blinded. |
| [babysit](./skills/poteto-mode/playbooks/babysit.md) | drive a pr or a stack to merge-ready: conflicts, review threads, ci. |
| [shipping](./skills/poteto-mode/playbooks/shipping.md) | independently verify a green stack, then land the contiguous verified run bottom-up with `gh stack merge`. |
| [autonomous run](./skills/poteto-mode/playbooks/autonomous-run.md) | drive a long task to completion without stopping. |
| [orchestrate](./skills/poteto-mode/playbooks/orchestrate.md) | a standing project handed to one coordinator chat: multi-day, many stacked prs, fleets of subagents. |
| [autopilot-full](./skills/poteto-mode/playbooks/autopilot-full.md) | run independent prs to merged with one owner per pr and a root swarm verdict on each round. |
| [autopilot-stack](./skills/poteto-mode/playbooks/autopilot-stack.md) | build and verify one linear stack for the operator to review and land. |
| [session pickup](./skills/poteto-mode/playbooks/session-pickup.md) | resume or take over a prior agent's in-flight work. |
| [pause safely](./skills/poteto-mode/playbooks/pause-safely.md) | suspend in-flight work cleanly so it can be resumed later. |
| [multi-phase plan](./skills/poteto-mode/playbooks/multi-phase-plan.md) | work that spans phases or stacked prs. |
| [worktree cleanup](./skills/poteto-mode/playbooks/worktree-cleanup.md) | reclaim disk by pruning merged or abandoned worktrees and stale ios simulators (macos), safety-gated. |
| [opening a pr](./skills/poteto-mode/playbooks/opening-a-pr.md) | open a ready pr from small ordered commits with a conventional commits title and a briefing-style body. invoked at the end of every other playbook. |

## skills

| skill | use it when |
|---|---|
| [`architect`](./skills/architect/SKILL.md) | settle types, signatures, and module shape before code. |
| [`arena`](./skills/arena/SKILL.md) | N parallel attempts at the same thing, then graft the best parts. |
| [`automate-me`](./skills/automate-me/SKILL.md) | draft your own `-mode` skill from how you have actually worked. |
| [`benchmark-checklist`](./skills/benchmark-checklist/SKILL.md) | vet a benchmark or measured speedup before you report it. |
| [`blast-radius`](./skills/blast-radius/SKILL.md) | find what a small change could break elsewhere, with the safety fact proven by running code. |
| [`browser-use`](./skills/browser-use/SKILL.md) | drive web and Electron/Chromium CDP targets with the Browser Use CLI; check installation and setup on first use. |
| [`control-cli`](./skills/control-cli/SKILL.md) | drive, inspect, and profile an interactive CLI or TUI with a repeatable local harness. |
| [`control-ui`](./skills/control-ui/SKILL.md) | verify web, IDE, Electron, and native UIs through Browser Use or Cua Driver with screenshots and observed state. |
| [`correct`](./skills/correct/SKILL.md) | find the mistakes agents keep repeating and make each one impossible: architecture first, then types, lint and ci, then tests, docs last. keeps a rule table. |
| [`create-verification-skill`](./skills/create-verification-skill/SKILL.md) | generate a project-local skill that drives your app the way a user does. |
| [`cua-driver`](./skills/cua-driver/SKILL.md) | drive native and GUI-only workflows with exact window targets, fresh element tokens, and user-approved setup. |
| [`deslop`](./skills/deslop/SKILL.md) | remove AI slop from a branch diff before you open a PR. |
| [`figure-it-out`](./skills/figure-it-out/SKILL.md) | no bundled playbook fits. design a rigorous, auditable one for the task. |
| [`how`](./skills/how/SKILL.md) | walk through how a subsystem works, or where something should live. |
| [`interrogate`](./skills/interrogate/SKILL.md) | several models try to break a diff, each applying both thermo rubrics. |
| [`maintain-verification-skill`](./skills/maintain-verification-skill/SKILL.md) | keep a verification skill and its feature map honest. |
| [`no-comments`](./skills/no-comments/SKILL.md) | strip comments through the read-only comment-sicko agent. |
| [`poteto-mode`](./skills/poteto-mode/SKILL.md) | default entry point for any non-trivial task. sticky. |
| [`recall`](./skills/recall/SKILL.md) | rebuild your recent working context from your own history and the shared record. |
| [`reflect`](./skills/reflect/SKILL.md) | turn a long session into concrete edits on existing skills. |
| [`setup-pstack`](./skills/setup-pstack/SKILL.md) | pick which models pstack uses per role and at what budget. |
| [`show-me-your-work`](./skills/show-me-your-work/SKILL.md) | keep a reviewable decision trail (tsv) for long or unattended work. |
| [`stacked-prs`](./skills/stacked-prs/SKILL.md) | stack mechanics for GitHub native Stacked PRs via `gh stack` and the stacks REST API. |
| [`swarm`](./skills/swarm/SKILL.md) | N parallel workers over slices or races, one aggregated report. |
| [`tdd`](./skills/tdd/SKILL.md) | failing test first, then the fix, when there is a cheap test path. |
| [`teach`](./skills/teach/SKILL.md) | runs `how` and `why` and weaves one plain explanation. |
| [`technical-writing`](./skills/technical-writing/SKILL.md) | layered doc standard for docs, RFCs, readmes, PR bodies, commit messages. |
| [`thermo-nuclear-code-quality-review`](./skills/thermo-nuclear-code-quality-review/SKILL.md) | concrete maintainability regressions and unnecessary complexity on a scoped diff. |
| [`thermo-nuclear-review`](./skills/thermo-nuclear-review/SKILL.md) | evidenced correctness and security defects on a scoped diff. |
| [`thermos`](./skills/thermos/SKILL.md) | proportional review policy and an optional two-lens deep review with one deduped verdict. |
| [`typescript-best-practices`](./skills/typescript-best-practices/SKILL.md) | grounds the type-system principle in TypeScript syntax. loads on .ts files. |
| [`unslop`](./skills/unslop/SKILL.md) | cut AI tells from any writing. |
| [`why`](./skills/why/SKILL.md) | find why something was built this way, from source control and MCPs. |

## principles

Twenty-six short skills, one principle each: the 24 from upstream plus two new ones (in bold). `poteto-mode` indexes them and applies the ones a task triggers.

| principle | group | rule |
|---|---|---|
| [laziness-protocol](./skills/principle-laziness-protocol/SKILL.md) | core | Bias toward deletion and the smallest change that solves the problem. |
| [foundational-thinking](./skills/principle-foundational-thinking/SKILL.md) | core | Get the core types and data structures right so downstream code becomes obvious. |
| [redesign-from-first-principles](./skills/principle-redesign-from-first-principles/SKILL.md) | core | Redesign as if the requirement had been a foundational assumption, instead of bolting it on. |
| [attack-the-premise](./skills/principle-attack-the-premise/SKILL.md) | core | When fixes sharing one premise keep failing the same gate, question the premise. |
| [subtract-before-you-add](./skills/principle-subtract-before-you-add/SKILL.md) | core | Remove dead weight first, then build on the simpler base. |
| [minimize-reader-load](./skills/principle-minimize-reader-load/SKILL.md) | core | Count layers and hidden state between question and answer, and cut them. |
| [outcome-oriented-execution](./skills/principle-outcome-oriented-execution/SKILL.md) | core | Converge on the target architecture; no throwaway compatibility states. |
| [experience-first](./skills/principle-experience-first/SKILL.md) | core | Choose user delight over implementation convenience. |
| [exhaust-the-design-space](./skills/principle-exhaust-the-design-space/SKILL.md) | core | Build 2-3 competing prototypes and compare before committing. |
| [build-the-lever](./skills/principle-build-the-lever/SKILL.md) | core | Build the tool that does or proves the work; the tool is what a reviewer reruns. |
| [model-the-domain](./skills/principle-model-the-domain/SKILL.md) | architecture | Encode the domain in a structure instead of scattered conditionals. |
| [boundary-discipline](./skills/principle-boundary-discipline/SKILL.md) | architecture | Guard at system boundaries; trust internal types. |
| [type-system-discipline](./skills/principle-type-system-discipline/SKILL.md) | architecture | Make illegal states unrepresentable; parse at boundaries; never lie to the compiler. |
| [make-operations-idempotent](./skills/principle-make-operations-idempotent/SKILL.md) | architecture | Converge to the same end state regardless of partial prior runs. |
| [migrate-callers-then-delete-legacy-apis](./skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | architecture | Migrate callers and delete the old API in the same wave. |
| [separate-before-serializing-shared-state](./skills/principle-separate-before-serializing-shared-state/SKILL.md) | architecture | Eliminate the sharing first; serialize only when one shared writer is a real invariant. |
| [small-door-big-room](./skills/principle-small-door-big-room/SKILL.md) | architecture | **New.** Build deep modules: a lot of behavior behind a small interface, with seams only where they earn it. |
| [prove-it-works](./skills/principle-prove-it-works/SKILL.md) | verification | Verify the real artifact, not a proxy or a self-report. |
| [fix-root-causes](./skills/principle-fix-root-causes/SKILL.md) | verification | Reproduce, ask why until you reach the cause, fix it there. |
| [sequence-verifiable-units](./skills/principle-sequence-verifiable-units/SKILL.md) | verification | Small units that each end in a verifiable state, in an order that proves itself. |
| [test-behavior-not-implementation](./skills/principle-test-behavior-not-implementation/SKILL.md) | verification | Assert what users observe against a literal expected value. |
| [tests-pay-rent](./skills/principle-tests-pay-rent/SKILL.md) | verification | **New.** Every test names the behavior it protects, the regression that fails it, and why nothing cheaper covers it. Junk tests get deleted. |
| [explain-the-number](./skills/principle-explain-the-number/SKILL.md) | verification | Find what limits a measured number before you trust or report it. |
| [guard-the-context-window](./skills/principle-guard-the-context-window/SKILL.md) | delegation | Route bulk to subagents; keep summaries in the main thread. |
| [never-block-on-the-human](./skills/principle-never-block-on-the-human/SKILL.md) | delegation | On reversible work, proceed and present; confirm only irreversible actions. |
| [encode-lessons-in-structure](./skills/principle-encode-lessons-in-structure/SKILL.md) | meta | Turn a repeated instruction into a lint, check, or script. |

## agents

| agent | what it is |
|---|---|
| [`comment-sicko`](./agents/comment-sicko.md) | A deranged comment-hater that savors deletion and condemns workaround code. Read-only reporter. |
| [`poteto-agent`](./agents/poteto-agent.md) | Full-access worker that runs in poteto-mode style. Routing target for playbook steps, code-writing delegates, and ad-hoc helpers. Autoloads the poteto-mode skill, so prefer it over the plain task agent whenever poteto's rigor is wanted. Spawn a fresh one per new task. |
| [`thermo-quality`](./agents/thermo-quality.md) | Diff-scoped maintainability review for concrete regressions and unnecessary complexity. Gathers its own diff from a scope spec. Read-only. |
| [`thermo-review`](./agents/thermo-review.md) | Diff-scoped correctness and security review for evidenced failures in changed code. Gathers its own diff from a scope spec. Read-only. |

Use `poteto-agent` for any subagent spawned inside a playbook step. It autoloads `poteto-mode`, so it starts with the rules already read.

## thermos

[`Thermos`](./skills/thermos/SKILL.md) defines the review policy used by the playbooks. Low-risk work uses diff inspection and relevant checks without a review agent. Routine behavior changes use tests and a smoke run, with the bundled [`blast-radius`](./skills/blast-radius/SKILL.md) skill for one or two concrete uncertainties. When GitHub bots or humans cover routine PR review, use their feedback rather than duplicating it locally. Check that coverage exists. PR creation does not wait for a bot that starts only after the PR opens.

An explicit deep-review request or a concrete high-impact risk left unresolved by focused verification gets one thermos run. Its `thermo-review` and `thermo-quality` agents inspect the same scope in parallel and return one verdict. [`Interrogate`](./skills/interrogate/SKILL.md) replaces thermos when a multi-model review is requested or a high-risk design is genuinely contested.

Reuse reviews across implementation, PR creation, babysitting, and shipping. A push, changed SHA, rebase, or merge request is not a reason to run another audit. Verify accepted fixes on the affected paths. Stop when confirmed P0 or P1 blockers are resolved and relevant checks pass. P2 and P3 suggestions, file length, and possible alternative designs do not require rework or another round. Behavioral verification, GitHub checks, and stack merge safety still apply.

## stacked PRs

Graphite is gone. Stacks use GitHub native Stacked PRs through the `gh stack` extension and the stacks REST API. The [`stacked-prs`](./skills/stacked-prs/SKILL.md) skill holds the commands and rules, adapted from GitHub's official `gh-stack` skill.

- Agents only use non-interactive forms, like `gh stack view --json` and `gh stack submit --auto --open`.
- A stack lands bottom-up as one operation with `gh stack merge`. Auto-merge is not supported for stacked PRs.
- One agent writes stack topology. Workers commit on their own layer.
- **Preview caveat.** Stacked PRs are in public preview. If a repo does not have them (`gh stack` exit 9), the change is cross-fork, or you cannot install the extension, the fallback is plain sequential PRs off trunk, or a base-branch chain opened with `gh pr create --base <parent>` and landed one at a time. The agent says so once.

## model roles

pstack picks models per role. Defaults are omp role aliases. To override, write `~/.omp/agent/rules/pstack-models.md` (user) or `.omp/rules/pstack-models.md` (project, wins) with one `role: selector[, selector...]` line per role. A selector is an alias like `@slow` or `provider/model[:level]`. A missing line keeps the default. [`/setup-pstack`](./skills/setup-pstack/SKILL.md) writes the file for you. The full role table is in [`skills/setup-pstack/references/roles.md`](./skills/setup-pstack/references/roles.md).

| role | kind | default |
|---|---|---|
| code | single | `@task` |
| judgment | single | `@slow` |
| hardest | single | `@slow` |
| how-explorer | single | `@smol` |
| how-explainer | single | `@slow` |
| why-investigators | single | `@smol` |
| why-synthesizer | single | `@slow` |
| reflect-tooling | single | `@slow` |
| reflect-judgment | single | `@slow` |
| swarm-workers | single | `@task` |
| thermos-review | single | `@slow` |
| thermos-quality | single | `@slow` |
| arena-runners | panel | `@slow, @default, @task` |
| arena-cross-judge | panel | `@slow, @default, @task` |
| architect-runners | panel | `@slow, @default, @task` |
| interrogate-reviewers | panel | `@slow, @default, @task` |

A panel runs one subagent per entry. If every entry resolves to one model family, the panel is one opinion, and the agent says so instead of padding with clones.

## voice

[`rules/pstack-voice.md`](./rules/pstack-voice.md) is always applied. Answer first, plain words, one thought per sentence, every claim carries its evidence or label, no invented links. It covers replies and subagent reports. Files, commit messages, and PR bodies follow `technical-writing` and `unslop`.

## repo layout

```
.omp-plugin/     plugin.json, marketplace.json
extensions/      /poteto-mode command, pstack_models tool, role resolution
skills/          one directory per skill (omp discovers one level deep)
agents/          task agents
rules/           always-applied voice rule
docs/guide/      the guide
scripts/lint.ts  repo lint gate
```

## development

```bash
bun install
bun run check   # lint plus tests
```

## license

MIT. See [LICENSE](./LICENSE) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
