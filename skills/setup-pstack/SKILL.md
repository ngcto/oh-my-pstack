---
name: setup-pstack
description: "Configure which models pstack uses per role and at what reasoning budget. Detects your authenticated models and writes a rule file that overrides the role defaults. Use for /setup-pstack, \"configure pstack models\", \"pstack budget\", or changing pstack's model choices."
---

# Setup pstack

Write `pstack-models.md`, the rule file that sets pstack's model per role. User scope is `~/.omp/agent/rules/pstack-models.md`. Project scope is `.omp/rules/pstack-models.md`, and it wins over the user file.

Roles, kinds, and defaults live in `references/roles.md`. Defaults are omp role aliases (`@slow`, `@smol`, `@task`, `@default`), so pstack works on any provider with no config. This skill is only for overriding them.

## Steps

### 1. Detect available models

Call the `pstack_models` tool with `{list: true}`. It returns the authenticated models with their family tokens. If the tool is absent, run `omp models --json`. If you can detect nothing, ask the user to paste the `provider/model` ids they have access to. Never write a concrete selector you have not confirmed is available. Role aliases (`@slow`, `@smol`, `@task`, `@default`, `@plan`) are always valid even though they are not detected models.

### 2. Load current state

Read `.omp/rules/pstack-models.md` and then `~/.omp/agent/rules/pstack-models.md` with `read`. Treat the role lines and the `# budget` comment as the current choices. Otherwise start from the defaults in `references/roles.md`. A line whose role is not in that table is from a retired role. Drop it.

### 3. Scope, budget, map, and confirm

**(a) Ask for scope** with the `ask` tool when it is not obvious. Options are `user (all projects)` and `project (this repo only)`. Default to user.

**(b) Ask for a budget** with the `ask` tool. Offer these four options with these exact labels, and name the current budget when the file records one.

- `unlimited (max)`
- `large (xhigh)`
- `medium (high)`
- `small (medium)`

**(c) Apply it.** The budget maps to a thinking level suffix appended to every concrete selector: `unlimited` is `:max`, `large` is `:xhigh`, `medium` is `:high`, `small` is `:medium`. Replace any existing level suffix instead of stacking one. Role aliases are left alone, because they inherit their model and level from `modelRoles` in the user's config. On a re-run, keep any role the user changed by hand. If a model does not support the target level, use the highest level it supports at or below the target. So `small` turns `anthropic/claude-x` into `anthropic/claude-x:medium`, and leaves `@slow` as `@slow`.

**(d) Show the roles and confirm.** Show every role with its selector list, marking any concrete selector not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models plus the aliases as options. For panel roles (`arena-runners`, `architect-runners`, `interrogate-reviewers`) the value is a list, one subagent runs per entry, and aliases that resolve to the same model collapse. `arena-cross-judge` is also a list, but `arena` selects one entry from it whose model family differs from the parent's when possible. `swarm-workers` is the default model for every worker unless a race or comparison assigns another model per arm. A panel is only a real panel when it spans 2+ model families, so when the user has one family, say so plainly.

### 4. Validate

Every concrete selector written must be in the detected set. Role aliases always pass. If a chosen selector is not available, stop and ask again. After writing, call `pstack_models` with `{role: "<role>"}` for a panel role and confirm `unavailable` is empty.

### 5. Write the rule file

Overwrite the whole file so re-runs stay idempotent. Lines use the shape `role: selector[, selector...]`. A selector is a role alias or `provider/model[:level]`. `#` lines are comments. Shape:

```
---
description: pstack per-role model choices (overrides role defaults)
alwaysApply: false
---
# pstack model configuration. One line per role: `role: selector[, selector...]`.
# Delete a line to restore that role's default (see the setup-pstack skill's references/roles.md).
# budget: large (xhigh)
code: anthropic/claude-x:xhigh
judgment: @slow
hardest: openai/gpt-x:xhigh
arena-runners: anthropic/claude-x:xhigh, openai/gpt-x:xhigh, google/gemini-x:xhigh
interrogate-reviewers: @slow, openai/gpt-x:xhigh
```

The ids above are placeholders for the shape. Write only ids confirmed in step 1, and write only the roles that differ from the defaults. The extension reads this file directly, so `alwaysApply: false` is fine and the file does not fill context. Deleting a line restores that role's default. Deleting the file restores every default.

### 6. Confirm

Tell the user which file was written, which roles it overrides, and that it applies to new task spawns right away. Re-running this skill updates it.

### 7. Offer subagent isolation (optional)

Playbooks that fan out parallel writers (Autopilot-full, Autopilot-stack, Orchestrate, Hillclimb, Visual parity, swarm live lanes) pass `isolated: true` on `task` items. That field exists only when `task.isolation.enabled` is true, and it defaults to false. Read `cfg://task.isolation.enabled`. If it is already true, skip to the apply question below. Otherwise ask once with the `ask` tool whether to turn it on, and name the trade. Isolated writers get their own worktree, and with `task.isolation.apply` left at its default of true, OMP applies each successful run's changes to the current checkout on its own.

On yes, `write cfg://task.isolation.enabled` with content `true`. A `cfg://` write needs the user's approval and only the top-level session may do it. If the write is refused or unanswered, do not retry. Show the user the line to add to `~/.omp/agent/config.yml` (or `.omp/config.yml` for one project) instead:

```yaml
task:
  isolation:
    enabled: true
```

A session-only write is not saved. Ask whether to keep it, and persist with `write cfg://task.isolation.enabled/save` with the same content. Then ask whether `task.isolation.apply` should be false, so worker changes are kept as patch or branch artifacts for review instead of landing in the checkout, and set it the same way. If the user declines isolation, say that the playbooks fall back to one worktree per writer created with `/wt` or `git worktree add`, or to one writer at a time.

### 8. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke the `create-verification-skill` skill. On no, move on without pushing.
