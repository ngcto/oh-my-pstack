# Landing a stack

GitHub stacked PRs are a public preview. This file covers `gh stack merge`, merge queue behavior, the merge-async REST API, and failure handling. Lower-level command flags are in `gh stack merge --help`.

## Contents

- [gh stack merge](#gh-stack-merge)
- [Merge exit codes](#merge-exit-codes)
- [Merge queue](#merge-queue)
- [merge-async REST](#merge-async-rest)
- [After a merge](#after-a-merge)
- [Failures](#failures)
- [Rebase stack on the web](#rebase-stack-on-the-web)

## Rules of landing

- Stacks land bottom-up. Merging PR N merges it and every unmerged PR below it. A mid-stack PR cannot merge alone. PRs above stay open.
- The merge set must be contiguous from the lowest unmerged PR. In pstack the target is the highest PR of the contiguous run that has an independent per-PR verdict.
- Each PR is evaluated against the stack base's branch protection, required checks, required reviews, and CODEOWNERS as if it targeted trunk. Every PR in the set and below must satisfy them.
- History must be fully linear between stack branches. If it is not, run `gh stack rebase` then `gh stack push`.
- PRs must be open and not draft. `gh stack merge` checks only that; GitHub evaluates protections when the merge runs and reports failures.
- Bypassing merge requirements is not supported for stacks. Auto-merge is not supported for stacked PRs, for direct merges or the queue. There is no "arm it and walk away". Poll until mergeable, then merge, or use the merge queue.
- Merge methods: squash gives one commit per PR, merge gives one merge commit for the whole group, rebase replays every commit. Default when none is passed is the last-used method in the CLI and a merge commit in REST.

## gh stack merge

```bash
gh stack merge 42 --yes --squash       # PR 42 and everything below, atomic
gh stack merge 7 --yes --squash        # whole stack #7 (a bare number is a stack number first, then a PR number)
gh stack merge --yes --squash          # whole stack of the current branch
```

Flags: `--squash`, `--merge`, `--rebase`, `--merge-method <merge|squash|rebase>`, `-y/--yes`. Never run it bare, the wizard needs a TTY. Stack and PR numbers never overlap, so a bare number is unambiguous.

Direct merge is atomic: either the whole set lands or nothing does. Read the outcome from the stacks REST endpoint or `gh pr view <n> --json state` rather than parsing output. `gh stack view --json` cannot report a CLOSED PR (its state is OPEN unless merged or queued), so it is not enough to find a closed blocker.

`gh stack merge` does not pin a head SHA. Re-read the target PR's head SHA just before merging and compare it with the SHA that got the verdict, or use the merge-async REST call below with `sha`, which rejects the merge when the head moved.

## Merge exit codes

- `2`: no stack, nothing to merge (fully merged, no open PRs, or a closed or draft blocker named in the message).
- `3`: the failure message contained "conflict". No rebase is in progress, so there is nothing to `--continue`. Recover with `gh stack rebase` then `gh stack push`, then recompute the frontier and retry.
- `4`: GitHub API failure, or the 10-minute poll ended with `Merge is still in progress`. Do not retry blindly: a retry gives 409 when the request is still running. Recompute the frontier from the stacks endpoint, poll the merge-async uuid if you have it, and act on what landed.
- `5`: bad arguments. Also the draft, closed, or blocked-below target (`pull request #N is a draft`, `is closed`, `#M below it is ...`).
- `9`: async merge or stacks unavailable for this repo. Use the fallback from the `stacked-prs` skill.

## Merge queue

When the base branch uses a merge queue, the whole stack is enqueued together.

- The queue picks the merge method. A method flag is ignored with a warning.
- PRs are evaluated individually, bottom-up. If one is ejected, it and everything above it are ejected. PRs below it are unaffected. Fix the cause, then re-add the stack.
- The queue tries to keep the stack in one merge group and lets the group exceed its configured maximum size by up to 50 percent. A stack that still does not fit is split over consecutive groups, lower PRs first.
- `enqueued` is terminal for the merge request. Track the final outcome through the stack state (`isQueued`, then merged).

## merge-async REST

Stack merges use the asynchronous merge API. The legacy synchronous merge REST endpoint and `mergePullRequest` GraphQL mutation cannot merge a stack. `gh stack merge` is built on this.

Submit, pinning the head SHA you reviewed:

```bash
sha=$(gh api repos/{owner}/{repo}/pulls/102 --jq .head.sha)
jq -n --arg sha "$sha" '{merge_method:"squash", merge_action:"default", sha:$sha}' | \
  gh api -H 'X-GitHub-Api-Version: 2026-03-10' --method PUT \
  repos/{owner}/{repo}/pulls/102/merge-async --input -
```

Body fields, all optional: `merge_method` (`merge|squash|rebase`, not on `merge_queue`), `merge_action` (`default|direct_merge|merge_queue`; `default` merges directly or enqueues when the branch requires a queue), `commit_title` and `commit_message` (not on `merge_queue`), `sha` (head must match or the merge is rejected).

| HTTP | Meaning | Body `status` |
|---|---|---|
| 202 | accepted, runs in background. `details.uuid` to poll | `pending` |
| 200 | PR was already merged | `merged` |
| 409 | a merge request already exists for this PR. Its uuid is returned and its options may differ from yours | `pending` |
| 400 | not ready (closed or draft) | `failed` |
| 404 | async merge unavailable for the repo, or PR not found | none |
| 422 | invalid body, for example a bad `merge_method` | none |

Poll a `pending` request until the status leaves `pending`. A valid lookup is always 200:

```bash
gh api -H 'X-GitHub-Api-Version: 2026-03-10' \
  repos/{owner}/{repo}/pulls/102/merge-async/<uuid> --jq '{status, message: .details.message, sha: .details.sha}'
```

Statuses: `pending` (keep polling, about once a second), `merged` (`details.sha` is the merge commit), `enqueued` (added to the queue, terminal here), `failed` (`details.message` says why, nothing merged). Results are kept 24 hours after the last update, then the uuid returns 404.

## After a merge

- GitHub retargets the next unmerged PR to the stack base and runs a cascading rebase on the remaining branches. Do not run `gh pr edit --base` inside a stack.
- Locally run `gh stack sync --prune`. Squash merges are replayed with `git rebase --onto`, so no spurious conflicts.
- Recompute the frontier (see `api.md`). The old head SHAs of upper PRs changed, so re-pin `sha` and re-run checks on the new heads before the next landing.
- A fully merged stack cannot be extended. `gh stack submit` on new branches starts a new stack.

## Failures

- Pre-merge checks run first, but a merge can still fail (conflict, flaky infrastructure, protection evaluated late). Documented behavior is all-or-nothing for direct merges. GitHub's troubleshooting page also describes a stop partway: PRs below the failing one stay landed, the failing PR and everything above stay open. Treat both as possible: after any `failed` or ambiguous result, recompute the frontier from the stacks endpoint before acting, fix the failing PR, then retry the merge.
- Queue ejections cascade upward only. Re-add after fixing.
- A closed mid-stack PR blocks everything above it from merging. See `troubleshooting.md`.
- `409` on submit means someone already queued a merge. Poll the returned uuid instead of resubmitting.

## Rebase stack on the web

The "Rebase stack" button in the merge box rebases the whole stack onto trunk server-side and force-pushes. Those commits are **not signed**. If the repo requires signed commits, use `gh stack rebase` then `gh stack push` locally, which follows your git signing config.
