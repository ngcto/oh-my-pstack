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

Use [`/blast-radius`](../../skills/blast-radius/SKILL.md) inline when the change's safety depends on an invariant or downstream effect. It discovers critical assumptions, traces their consumers, and exercises real failure cases. This is a focused way to investigate deeply, not proof that every issue in the diff has been audited.

Request [`/thermos`](../../skills/thermos/SKILL.md) for one deep review, or use it when focused verification leaves a concrete high-impact risk unresolved. Both complete lenses search for unnamed failures, cross-package consequences, structural regressions, and code-judo simplifications. Name the concern before a risk-driven run without restricting findings to it. `/interrogate` runs the same rubrics across multiple models when that diversity would help. Thermos is the cheaper alternative for deep findings through one pair of reviewers, not a weaker rubric.

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

The [Opening a PR playbook](../../skills/poteto-mode/playbooks/opening-a-pr.md) works from a worktree, rebases the work into small ordered commits, cleans the diff, keeps current verification evidence, unslops the prose, and returns the PR link. It follows the [review levels](../../skills/thermos/SKILL.md) without adding a pre-PR thermos gate. Open without waiting for bots that start on PR creation. Use bot or human feedback for routine PR review when available. Evidenced P0 or P1 findings, including serious structural regressions, block until fixed or dismissed. Verify accepted fixes on their affected paths. Dismiss unsupported claims with a concrete reason. Keep useful P2 and P3 findings for the owner's decision without forcing another round. Five narrow PRs beat one fat one, and stacked follow-ups beat a growing branch. Stacks use GitHub native Stacked PRs through `gh stack`, covered by the [`stacked-prs`](../../skills/stacked-prs/SKILL.md) skill. `gh stack submit --auto` leaves generated titles and empty bodies, so the stacker then sets each PR's title and description with `gh pr edit`. If a repo doesn't have the preview enabled, the playbooks fall back to plain sequential PRs and say so once.

Reuse reviews across implementation, PR creation, babysitting, shipping, and autonomous verification. A push, rebase, new head SHA, or stage change does not trigger another review. Keep evidence current by refreshing verification only on affected paths. Another local review needs an explicit request or a new high-impact risk outside the reviewed scope. Scope it to that delta.

## Drive the PR to merge-ready with Babysit

An open PR starts collecting blockers immediately. Checks fail, reviewers comment, trunk moves. Hand that churn to the [Babysit playbook](../../skills/poteto-mode/playbooks/babysit.md):

```text
/poteto-mode babysit this pr. get it green.
```

Babysit watches the PR with a bundled watcher and takes blockers in order: conflicts, then review threads, then CI. It reuses existing reviews and verifies accepted fixes on the affected path instead of repeating a broad audit. Every accepted fix batches into one push, so the checks restart once instead of after every fix. The comment triage is skeptical, because humans and review bots file real catches and noise in the same list. Verify a concrete claim before classifying or closing its thread, even without a code change. Do not launch thermos just to corroborate it. Fix evidenced blockers and accepted improvements. Dismiss noise with the disproof posted on the thread. If the owner declines a valid non-blocking suggestion, keep the finding as `consider`, acknowledge that decision, and resolve the thread without code changes. Keep true out-of-scope or intended findings as `noted` instead of dismissing them as false. Stop when evidenced blockers are resolved and relevant checks pass, not when every suggestion is gone. When all you want is status, ask smaller and Babysit answers without starting the loop:

```text
/poteto-mode check on pr 123. anything outstanding?
```

Babysit starts only when requested and stops at merge-ready. It never merges, even with everything green, because merging is a different decision.

## Land the stack with Shipping

Green is not the same as safe. When you're ready to land, say so:

```text
/poteto-mode land the stack.
```

The [Shipping playbook](../../skills/poteto-mode/playbooks/shipping.md) verifies each PR independently before it lands or merges anything. The change's author cannot supply the independent verdict. A prior independent verdict or GitHub review that covers the change may satisfy the review part. CI and relevant checks must cover the current head. Behavior changes also need live evidence. Refresh affected checks without repeating a covered review under the [same policy](../../skills/thermos/SKILL.md). Record the current verified head and base even when the patch-id is unchanged. Then Shipping lands only the contiguous verified run from the bottom, which merges the chosen PR and every unmerged PR below it, all or nothing. It pins the verified head SHA through the `merge-async` API, or re-reads the head SHA right before `gh stack merge`, which cannot pin one. It reports the first PR that breaks the chain. A verified PR sitting above an unverified one waits, because merging it would pull the gap in underneath. GitHub doesn't support auto-merge for stacked PRs, so Shipping uses the merge queue or merges once the run is mergeable.

Next: [Run work while you sleep](./07-overnight.md).
