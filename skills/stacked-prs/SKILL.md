---
name: stacked-prs
description: "Stack mechanics for GitHub native Stacked PRs via the gh stack extension and the stacks REST API. Use when asked to stack, split a change into layers or dependent PRs, open stacked PRs, use gh stack, read stack state, sync or restack after trunk moves, or land the stack. Also the place babysit, shipping, and orchestrate playbooks delegate stack mechanics to."
---

# stacked-prs

A stack is an ordered chain of PRs in one repo. The bottom PR targets trunk, every other PR targets the branch below it, so a reviewer sees one layer's diff. `gh stack` prints it trunk-first:

```
(main) <- auth <- api <- frontend
```

Left is the **bottom**, right is the **top**. `auth` merges first. `up` moves toward the top, `down` toward trunk. Foundations go at the bottom.

Adapted from GitHub's official gh-stack agent skill (MIT, GitHub, Inc.; see `LICENSE-gh-stack`), with pstack conventions on top. GitHub stacked PRs are a public preview.

## When to stack

Stack when the change is large or spans concerns, each layer fits in one sentence, and the bottom layer is a foundation the upper ones need. Prefer five narrow PRs to one large one. Unrelated work gets its own stack. Layer design lives in `references/stack-design.md`.

Do not stack for a single-concern change (one PR), for a fork (stacks are same-repo only), or when the repo has not enabled the preview (`gh stack submit` exits 9). Then fall back to independent PRs off trunk, or a base-branch chain opened with `gh pr create --base <parent>` and landed one at a time. Say so once.

## Setup

```bash
gh extension install github/gh-stack
git config rerere.enabled true          # replay conflict resolutions
git config remote.pushDefault origin    # required with more than one remote
gh auth status
```

Needs Git 2.36+. `gh stack --help` working means the extension is installed. Probe the repo with `gh api -H 'X-GitHub-Api-Version: 2026-03-10' repos/{owner}/{repo}/stacks --silent`. A 404 means the preview is off (or no access). Exit 9 from a `gh stack` command says the same.

## Non-interactive use

`gh stack` branches on whether stdout is a TTY. Under a PTY the bare commands open prompts or a TUI and block forever. Always pass these.

| Always run | Never run bare | Why |
|---|---|---|
| `gh stack view --json` | `gh stack view` | TUI under a PTY |
| `gh stack submit --auto --open` | `gh stack submit` | prompts for a title per PR |
| `gh stack merge <target> --yes` | `gh pr merge` | `gh pr merge` cannot merge a stack |
| `gh stack init <branch>...` | `gh stack init` | prompts for names |
| `gh stack add <branch>` | `gh stack add` | prompts, fails even piped |
| `gh stack checkout <target>` | `gh stack checkout` | selection menu |
| `gh stack up` / `down` / `top` / `bottom` | `gh stack switch` | menu only |
| none | `gh stack modify` | TUI only. Restructure with `unstack` then `init` |
| `gh stack sync --prune` or `gh stack sync --remote <name>` | `gh stack sync` | prompts under a TTY: the prune prompt, the divergence prompt, the remote picker |

With several remotes pass `--remote <name>` to `push`, `submit`, `sync`, `rebase`, `link` unless `remote.pushDefault` is set. `checkout` and `trunk` have no `--remote` and need the config. `checkout <pr>` blocked by a different local stack covering those branches needs `gh stack unstack --local` first. `--print-path` on navigation locates a branch held by another worktree without stealing it. Check the exit status before using the path.

## pstack conventions

- **PRs open ready.** `gh stack submit --auto --open`. `--open` also readies existing PRs.
- **Titles and bodies come after submit.** `--auto` generates titles from commits or branch names and there is no flag to override. Run `gh pr edit <n> --title "<type>(<scope>): <summary>" --body-file <file>` per PR. Conventional-commits title, briefing body, per the `opening-a-pr` playbook in `poteto-mode`. Squash bodies become the commit body, so keep them short.
- **One topology writer per stack.** Only one agent runs `init`, `add`, `rebase`, `sync`, `push`, `submit`, `link`, `unstack`, `merge`, and branch navigation. `gh stack` serializes on a clone-wide lock (exit 8) but that does not make concurrent writers safe.
- **Workers commit on their own layer only**, in their own worktree, and never run the mutating commands above. The topology owner then runs `gh stack rebase --upstack` and `gh stack push`.
- **Review is thermos per layer.** Scope spec for one layer is `git diff <parent-branch>...<branch>` (the parent of the bottom layer is trunk), the PR number, and the names of layers below for context. One scope per layer, never the whole stack diff.
- **Nothing lands without an independent per-PR verdict.** Merging PR N lands everything below it, so the merge target is the highest PR of the contiguous verified bottom-up run.
- **Frontier.** The ordered unmerged PRs with head SHAs, recomputed after every merge or mutation. GitHub base refs are authoritative and retarget on their own. Never hand-retarget inside a stack with `gh pr edit --base`.
- Babysit, shipping, and orchestrate link here for mechanics. They keep their own loop logic.

## Core loop

```bash
gh stack init auth                 # create stack, check out first branch
git add ... && git commit -m "feat(auth): add middleware"
gh stack add api                   # next layer, branched from current
git add ... && git commit -m "feat(api): add routes"
gh stack submit --auto --open      # push all, open ready PRs, link the stack
gh pr edit 101 --title "..." --body-file ...   # per PR, then gh stack view --json
```

Branch names are verbatim (`gh stack add refactor/foo` creates `refactor/foo`). Create the stack before writing code. Never implement everything on trunk and split later.

Editing a lower layer. Check out its owner, never commit a lower concern on the top branch.

```bash
gh stack down                      # or: gh stack checkout api
git add ... && git commit -m "fix(api): handle empty body"
gh stack rebase --upstack          # replay layers above
gh stack top && gh stack push
```

Trunk moved or a lower PR merged. Run `gh stack sync --prune` when pruning merged local branches is wanted, otherwise `gh stack sync --remote <name>` (fetch, reconcile with GitHub, rebase, push, refresh PR state). Treat `sync` as potentially interactive in agent runs. When you need certainty that nothing will prompt, use `gh stack rebase` then `gh stack push` instead. Divergence non-interactively prints both chains, changes nothing, exits 0 with `Sync aborted`. See `references/troubleshooting.md`.

## Reading state

`gh stack view --json` writes JSON to stdout, status text to stderr. Branch on exit codes, not text.

```
trunk, currentBranch
branches[]  name, head?, base?, isCurrent, isMerged, isQueued, needsRebase
branches[].pr  number, url, state (OPEN | MERGED | QUEUED), absent without a PR. Never CLOSED: a closed PR still reports OPEN
```

Bottom to top. `head` and `base` are saved SHAs and may be stale or absent; use `git rev-parse <name>` for live SHAs.

Frontier without a checkout (`$PR` is any layer):

```bash
gh api -H 'X-GitHub-Api-Version: 2026-03-10' "repos/{owner}/{repo}/stacks?pull_request=$PR" \
  --jq '.[0].pull_requests // [] | map(select(.merged_at == null) | {number, state, draft, ref: .head.ref, sha: .head.sha})'
```

`view --json` cannot show a closed PR, so cross-check with the REST frontier above or `gh pr view <n> --json state`. A `closed` entry blocks everything above it. REST, GraphQL, webhook, and Actions details are in `references/api.md`.

## Landing

```bash
gh stack merge 42 --yes --squash   # PR 42 and every unmerged PR below it, atomic
gh stack merge 7 --yes --squash    # every unmerged PR in stack #7
```

PRs must be open and non-draft, history linear, protections evaluated against the stack base. `gh stack merge` cannot pin a head SHA, so re-read the target PR's head SHA just before merging and confirm it is the SHA that got the verdict, or use the merge-async REST call with `sha` (see `references/landing.md`). Auto-merge is not supported for stacked PRs. A merge queue on the base branch takes the whole stack and ignores method flags. After the bottom merges GitHub retargets the next PR to trunk and rebases the rest, then `gh stack sync --prune`. Merge exit codes, merge queue behavior, the merge-async REST flow, partial failures, and the unsigned "Rebase stack" button caveat live in `references/landing.md`.

## CI cost

Workflows run for every PR in the stack. Gate expensive jobs on `stack.position == stack.size` (top) or `stack.base.ref == base.ref` (lowest unmerged), after a `github.event.pull_request.stack != null` check. See `references/api.md`.

## Exit codes

| Code | Meaning | Recovery |
|---|---|---|
| 0 | ok | none. Note `sync` exits 0 on `Sync aborted` |
| 1 | generic | read stderr |
| 2 | not in a stack | `init`, or `checkout <target>` |
| 3 | rebase conflict | resolve, `git add`, `gh stack rebase --continue`. After `sync` everything was restored, rerun `gh stack rebase` first |
| 4 | GitHub API failure | `gh auth status`, retry |
| 5 | bad arguments | see `<cmd> --help` |
| 6 | ambiguous stack | `checkout` a branch unique to the stack |
| 7 | rebase in progress | `--continue` or `--abort` |
| 8 | stack file locked | retry after ~5s. Never delete lock files |
| 9 | stacked PRs not enabled | tell the user, use the fallback |
| 10 | modify recovery | `gh stack modify --abort` |

## Constraints

- Strictly linear. One parent, at most one child, max 100 PRs. Use separate stacks for parallel work.
- No in-place reorder or removal. `gh stack unstack` then `gh stack init --base <trunk> <branches...>` then `submit`. Existing PRs survive.
- `unstack` never deletes PRs or branches. Merged and queued PRs stay in the stack.
- `gh stack <cmd> --help` is authoritative for flags. `gh stack help <cmd>` only prints top-level help.

## References

- `references/stack-design.md` before creating a stack or choosing layers.
- `references/commands.md` when a command fails or you need preconditions, atomicity, side effects.
- `references/landing.md` for merge, merge queue, merge-async REST, partial failures.
- `references/api.md` for REST, GraphQL, webhooks, Actions expressions.
- `references/troubleshooting.md` for conflicts, divergence, restructuring, closed mid-stack PRs, locks.
