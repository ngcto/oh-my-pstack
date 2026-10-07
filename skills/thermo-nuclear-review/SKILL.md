---
name: thermo-nuclear-review
description: Comprehensive security and correctness audit of a scoped diff, including cross-package breakage, devex regressions, and feature-gate leaks. Use for thermo nuclear, thermonuclear, or a deep correctness review.
disable-model-invocation: true
---

# Thermo-nuclear review

Perform a comprehensive security and correctness audit of the assigned changes. Search for failures the owner has not named. Gather the diff yourself with `git diff <base>...<head>` when the caller passes a scope.

Follow `skill://thermos` for when to review, reuse, and owner triage. Those policies do not reduce this rubric's depth or the findings you can report.

## Scope

Report issues introduced or exposed by added or modified code. The diff establishes responsibility, not the limit of the dependency trace. Read affected functions, their contracts, callers, and downstream consumers far enough to establish the change's end-to-end impact. Do not report unrelated pre-existing defects.

A named concern guides attention. It is not the only permitted finding. Audit all relevant categories within the selected scope, including subtle failures elsewhere caused by the change.

## Breaking functionality

Trace cross-package and cross-module side effects. A small change can break a caller whose assumptions are not visible in the diff.

- Check changed contracts, defaults, data shapes, serialization, and error behavior against their consumers.
- Follow dynamic dispatch, string-keyed lookups, wire formats, persistence, and external libraries when the changed path depends on them.
- Inspect lifecycle ordering, cancellation, cleanup, concurrency, and partial updates for reachable failures.
- Read the pinned dependency version and local patches when library behavior determines whether the change is safe.

Finish each relevant trace. Never report "this fails unless the backend handles it" when the backend is available to inspect. Identify the real triggering state and check guards before concluding that a failure is reachable.

## Security and feature gates

Check authorization, input trust boundaries, secret handling, and data integrity. Trace each affected entry point through its enforcement, including consumers outside the changed module.

Inspect feature flags and internal-only checks. Check whether the change exposes gated behavior through another caller, a cached result, a background job, or a serialization path. Do not treat a UI guard as proof that a backend path is gated.

## Developer experience

Catch changes that break an existing supported development setup, including:

- Changes to secret sources, environment variable names, configuration paths, or required values.
- Port and networking changes.
- New startup steps, scripts, or manual prerequisites required for existing functionality.
- Dependency or tooling changes that invalidate the supported workflow.

Adding an alternative workflow is not itself a break. A normal package-manager install is not a devex defect unless the change adds a real unsupported prerequisite.

## Intended changes

Do not report a deliberate, well-constrained behavior change as an accidental defect. Still report consequences outside the stated intent, material risks the author has not accounted for, or evidence of a malicious change. Intent alone does not dismiss those findings.

## Findings

Each finding needs a changed file and line, the triggering input or state, the end-to-end failure path, and the user or system impact. Complete the available research before reporting. A code trace can establish a defect without an observed production incident.

Calibrate P0-P3 by impact and urgency. P0 is critical, P1 is high impact, P2 is medium, and P3 is minor. Do not inflate priority because the issue has a security label or another reviewer agrees. Do not suppress valid lower-priority findings because they are non-blocking. Omit cosmetic preferences and unsupported defensive-programming advice.

When a PR exists and the independent audit has medium-or-higher findings, read its discussion afterward with `gh pr view <n> --comments` and `gh api repos/<o>/<r>/pulls/<n>/comments`. Evaluate issues bots or humans found that you missed, incorporate useful evidence, and attribute sourced findings. Do not repeat resolved findings. PR discussion never replaces the independent audit.

## Verdict

Return findings first, then `approve` or `changes_requested`. An evidenced P0 or P1 means `changes_requested`. Otherwise return `approve` with the useful P2 and P3 findings. No praise or finding quota.

The owner decides which findings to accept under `skill://thermos`. Verify accepted fixes on their affected paths instead of requesting another full audit. An empty findings list is not the completion criterion.
