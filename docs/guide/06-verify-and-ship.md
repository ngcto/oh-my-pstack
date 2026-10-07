# Verify the result and open a PR

"It compiles" is not evidence. The [Prove It Works principle](../../skills/principle-prove-it-works/SKILL.md) makes the agent check the real artifact before it reports success, and your job is to make "the real artifact" checkable. This page covers stating a finish condition, generating a verification skill for your app, opening the PR, and driving it to merged.

## State the finish condition up front

Put what done means in the first prompt, in whatever words fit:

```text
/poteto-mode add json output to this command. text output stays byte-identical, the json parses, both run against the sample project. show me the evidence.
```

Now the agent has three checks it can run, not a mood to satisfy. When the reply comes back, it should carry the exact commands and outputs. If a check couldn't run, a good reply says "inconclusive", and you should treat a confident reply without evidence as a red flag.

Match the check to the change:

- A CLI change runs the real command.
- A UI change walks the changed flow in the running app.
- A parser or migration replays a saved input.
- A perf change compares before and after profiles.
- A storage change reads back the written value.

Follow the [proportional review policy](../../skills/thermos/SKILL.md). Small, low-risk changes use diff inspection and relevant checks without a review agent. Routine behavior changes use relevant tests and a smoke run of the changed path.

For a named uncertainty, use [`/blast-radius`](../../skills/blast-radius/SKILL.md) inline. It proves the one or two facts the change's safety depends on by running real code, rather than launching a broad audit.

Request [`/thermos`](../../skills/thermos/SKILL.md) for one deep review, or use it when focused verification leaves a concrete high-impact risk unresolved. Name that risk before a risk-driven run. Use `/interrogate` instead for a multi-model request or a genuinely contested high-risk design.

## Create a project verification skill

The UI bullet above hides a real requirement. The agent needs a scripted way to drive your app. If your project has one, great. If not, run:

```text
/create-verification-skill
```

[`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md) interviews the repository, not you. It works out what a user touches, how the app launches locally, and what can drive it. It reuses an existing harness first. Otherwise, [`control-ui`](../../skills/control-ui/SKILL.md) selects Browser Use for web/CDP work or Cua Driver for native and GUI-only work; a PTY handles CLIs and TUIs, and plain HTTP handles services. It checks what evidence proves behavior and whether two instances can run side by side. If the selected UI tool or setup is missing, it asks you to install and set it up before driving.

It writes `.omp/skills/verify-<app>/`, agent-facing instructions with exact Launch, Doctor, Drive, Evidence, and Cleanup sections, plus a feature map under `features/` that indexes what the app does and what result proves each feature works. The skill ships a [worked feature-map example](../../skills/create-verification-skill/references/feature-map-example/) with a README index and one file per feature using the four required H2s. Before handing it over, the generator proves the skill once end to end: launch, doctor check, drive one feature, capture evidence, clean up. If that proof fails, don't use the output.

From then on, "verify it in the app" is a step any agent can execute in this repo once the required driver is installed and configured.

Once the verify skill works, a [`/swarm`](../../skills/swarm/SKILL.md) can split a full pass by feature-map entry and aggregate the results.

## Keep the verification skill honest

Apps change and feature maps rot. When yours drifts, run:

```text
/maintain-verification-skill
```

[`/maintain-verification-skill`](../../skills/maintain-verification-skill/SKILL.md) audits the generated skill: one read-only source reader per feature in parallel, then one live pass that drives every mapped feature. It ends in exactly one of three outcomes. `clean` means full coverage and nothing to ship. `changed` means one PR of proven corrections, confined to the verification skill's own directory. `blocked` names the blocker. It never edits product code. If the live pass catches a product regression, it reports the regression instead of papering over it in docs.

## Open the PR

```text
/poteto-mode open the pr. small ordered commits, evidence in the description.
```

The [Opening a PR playbook](../../skills/poteto-mode/playbooks/opening-a-pr.md) works from a worktree, rebases the work into small ordered commits, cleans the diff, keeps current verification evidence, unslops the prose, and returns the PR link. It follows the [review levels](../../skills/thermos/SKILL.md) without adding a pre-PR thermos gate. Open without waiting for bots that start on PR creation. Use bot or human feedback for routine PR review when available. Only confirmed P0 or P1 findings accepted by the owner block. Fix accepted blockers and verify the affected path. Dismiss unsupported claims with a concrete reason. P2 and P3 suggestions are non-blocking. Five narrow PRs beat one fat one, and stacked follow-ups beat a growing branch. Stacks use GitHub native Stacked PRs through `gh stack`, covered by the [`stacked-prs`](../../skills/stacked-prs/SKILL.md) skill. `gh stack submit --auto` leaves generated titles and empty bodies, so the stacker then sets each PR's title and description with `gh pr edit`. If a repo doesn't have the preview enabled, the playbooks fall back to plain sequential PRs and say so once.

Reuse reviews across implementation, PR creation, babysitting, shipping, and autonomous verification. A push, rebase, new head SHA, or stage change does not trigger another review. Keep evidence current by refreshing verification only on affected paths. Another local review needs an explicit request or a new high-impact risk outside the reviewed scope. Scope it to that delta.

## Drive the PR to merge-ready with Babysit

An open PR starts collecting blockers immediately. Checks fail, reviewers comment, trunk moves. Hand that churn to the [Babysit playbook](../../skills/poteto-mode/playbooks/babysit.md):

```text
/poteto-mode babysit this pr. get it green.
```

Babysit watches the PR with a bundled watcher and takes blockers in order: conflicts, then review threads, then CI. It reuses existing reviews and verifies accepted fixes on the affected path instead of repeating a broad audit. Every known fix batches into one push, so the checks restart once instead of after every fix. The comment triage is skeptical, because humans and review bots file real catches and noise in the same list. Verify a bot-only claim with a relevant test or reproduction before acting. Do not launch thermos just to corroborate it. A real finding gets a fix, and noise gets dismissed with the disproof posted on the thread. Stop when confirmed blockers are resolved and relevant checks pass, not when every suggestion is gone. When all you want is status, ask smaller and Babysit answers without starting the loop:

```text
/poteto-mode check on pr 123. anything outstanding?
```

Babysit starts only when requested and stops at merge-ready. It never merges, even with everything green, because merging is a different decision.

## Land the stack with Shipping

Green is not the same as safe. When you're ready to land, say so:

```text
/poteto-mode land the stack.
```

The [Shipping playbook](../../skills/poteto-mode/playbooks/shipping.md) verifies each PR independently before it lands or merges anything. The change's author cannot supply the independent verdict. A prior independent verdict or GitHub review that covers the change may satisfy the review part. CI, relevant tests, and live evidence must cover the current head. Refresh affected checks without repeating a covered review under the [same policy](../../skills/thermos/SKILL.md). Then Shipping lands only the contiguous verified run from the bottom, which merges the chosen PR and every unmerged PR below it, all or nothing. It pins the verified head SHA through the `merge-async` API, or re-reads the head SHA right before `gh stack merge`, which cannot pin one. It reports the first PR that breaks the chain. A verified PR sitting above an unverified one waits, because merging it would pull the gap in underneath. GitHub doesn't support auto-merge for stacked PRs, so Shipping uses the merge queue or merges once the run is mergeable.

Next: [Run work while you sleep](./07-overnight.md).
