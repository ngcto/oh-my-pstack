### Opening a PR

Invoked at the end of every other playbook.

**Worktree.** Work from a git worktree off main. OMP `/wt` opens a worktree session, and `task` with `isolated: true` gives a subagent its own when isolation is on (see poteto-mode's Subagents section for the setting and the fallback). Subagents inherit the worktree they start in. Multiple `task` items on the same branch each get their own worktree, or `git fetch && git reset --hard origin/<branch>` between them. Dirty branch with unrelated work: patch out, fresh worktree, apply. Snarled worktree: reset from main, redo minimally.

**Commits.** Commit liberally. Rebase into small, ordered commits before opening PRs. Each commit is a future PR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit. New commit when separable.

**Review coverage.** Reuse the implementation's coverage under `skill://thermos`. Opening a PR is not another review gate. If coverage has not been chosen, choose it once under that policy and keep the relevant behavior checks. Complete any missing `skill://deslop` pass on changed code. If review is chosen, finish cleanup first. Use `skill://no-comments` only for changed comments that need independent cleanup. Skip code-only cleanup for prose-only work and reuse cleanup already done on this diff. Available GitHub review counts as coverage. Do not wait for bots that start on PR creation. Write every PR title, PR description, and commit body with the `technical-writing` skill, then apply `unslop`. Apply every technical-writing layer except Diátaxis. Use one word for each action, keep articles, and avoid `-ing` when a plain verb works.

**Titles.** Use Conventional Commits in the form `type(scope): subject`. Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf` as the type. Use the changed area, such as `pstack` or `poteto-mode`, as the scope. Keep the subject short and imperative. Name a real symbol when one carries the change. For example, `fix(pstack): retarget opening-a-pr babysit trigger`. Do not add a trailing period.

**Descriptions.** The PR body is a briefing, not the lab notebook. A reviewer who has the diff should learn why the change exists, what it leaves out, what it could break, and how you proved it works, in under a minute. Write short, simple sentences with few identifiers. Do not write walls of text. The squash commit body is the PR body. If the body would make the squash commit longer than about 40 lines, cut the body.

Put each section under a `##` heading, not a bold lead-in, so the sections stand apart. Use these sections in order. Drop a section when it has nothing to say.

- `## Why` gives the problem and the approach in one to three short sentences. Do not list SHAs or rebase genealogy. Do not add a "based on main" preamble.
- `## What changed` has one to three short bullets. Name a real symbol or path only when it carries the change. Name both sides of a rename or retarget.
- `## Scope` always names what the PR covers and what it deliberately leaves out, for example a related follow-up or a known gap. Use one to three short items. Do not list symbols or paths, and do not write a file-by-file essay.
- `## Tradeoffs` names only rejected alternatives that a reviewer would otherwise ask about. Skip this section when there was no real choice.
- `## Blast Radius` gives one or two sentences on who or what the change touches and why that is safe or risky. If main is red, state the cost of leaving it red.
- `## Verification` has one to three bullets. Each bullet names a real run path and its outcome. For a performance change, report one primary number with its unit in `before → after` form. Link the arena or swarm directory for the remaining evidence. Do not include sample-size methodology, swarm recitals, or metric tables.

After these sections, attach videos or screenshots when they prove a claim. Do not paste full SHAs, swarm or arena lane recitals, lever-correction essays, file-by-file checklists, or "CLEAN" verdicts. Put these details in a linked artifact. A commit body does not restate its subject.

**Forge.** GitHub through `gh` is the only forge. Use it for create, edit, view, watch, and merge, and record which repo it resolved. Do not require any other PR tool.

**Size and stacks.** Prefer five narrow PRs to one large PR. A stack is a native GitHub stack from the `gh stack` extension, and the `stacked-prs` skill holds the command details. One concern per layer, described in one sentence, with foundations at the bottom. Create the stack before writing files, not after:

```bash
gh stack init <first-branch>            # bottom layer, branched from trunk
git add ... && git commit ...
gh stack add <next-branch>              # next layer, branched from the current one
git add ... && git commit ...
gh stack rebase && gh stack push       # every layer on current trunk, since submit does not rebase
gh stack submit --auto --open           # push every branch, open ready PRs with the right bases
gh pr edit <n> --title "..." --body-file <file>   # per PR, see below
gh stack view --json                    # confirm the PRs and their order
```

Run `gh stack add` only on the top branch, so run `gh stack top` first when you navigated down. `gh stack submit --auto` titles each PR from the commit subject (single commit) or the humanized branch name and leaves the body empty, so the topology writer sets the real title and body on every PR right after it with `gh pr edit <n> --title "<Conventional Commits title>" --body-file <file>`, following **Titles** and **Descriptions** above. Name every branch explicitly. Never run `gh stack view`, `submit`, `init`, `add`, or `checkout` bare, since they prompt or open a TUI. Never use `gh stack modify`. Restructure with `unstack` then `init`. Rebase on trunk before substantial stack work.

One writer owns stack topology. Only that writer runs `init`, `add`, `rebase`, `sync`, `push`, `submit`, `unstack`, or `merge`. Workers commit on their own layer and report anything topology-shaped upward. Branch from trunk only for independent work, and open that as a plain PR.

If the probe `gh api -H 'X-GitHub-Api-Version: 2026-03-10' "repos/<owner>/<repo>/stacks" --silent` returns 404 (stacked PRs not enabled on this repo), `gh stack submit` exits 9, or the branches live in a fork, say so once and fall back. Open plain PRs each off trunk when the work is independent. For a chain, open each child with `gh pr create --base <parent-branch>` and land them one at a time. Never require a tool `gh` does not ship with.

**Readiness.** Open every PR ready, never as a draft. For a stack, pass `--open` to `gh stack submit --auto`. For a single PR, run `gh pr create` without `--draft`. If a PR still opens as a draft, run `gh pr ready <number>`. Run `gh pr view <number>` before you refer to PR status.

**Babysit.** Opening a PR does not start a babysit. Post the URL and keep building. Finish the phase or stack first. Run a separate babysit pass only when the user asks for one after the whole stack exists. A babysit for each new PR stalls the build and spends checks on commits that later waves restart. Push back when feedback drifts from intent.

A subagent that opens a PR reuses coverage under **Review coverage** above and posts the URL. Then it returns to the parent without babysitting, unless it is an Autopilot-full or Autopilot-stack owner. That owner's brief assigns the babysit loop and is the ask `playbooks/babysit.md` waits for. The owner starts the loop after its code-ready report and reports merge-ready or STACK-READY as its playbook says. The rules here and in `playbooks/babysit.md` that hold babysitting until a whole stack is built do not apply to that owner.
