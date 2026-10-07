# Changelog

## Unreleased

### Changed

- Local review is proportional to risk. Low-risk tasks need no review agent. Routine changes use relevant checks and the existing `blast-radius` skill for focused verification. Thermos is reserved for explicit deep-review requests or concrete unresolved high-impact risks.
- Playbooks reuse review coverage across PR creation, pushes, babysitting, and merge prep. Accepted fixes use targeted proof instead of another broad review. Available GitHub bot or human feedback covers routine PR review without local corroboration.
- Thermo reviewers report evidenced defects and concrete maintenance costs. P2 and P3 suggestions, file-length thresholds, and missed redesign opportunities no longer block delivery or start a zero-findings loop.

## 0.2.1

### Changed

- `control-ui` uses Browser Use for web/CDP work and Cua Driver for native and GUI-only work instead of omp's built-in UI globals. Dependent playbooks and verification guides use the same drivers.
- Bundled `browser-use` and `cua-driver` skills check the required executable and setup on first use. Missing installation, connections, daemons, or permissions require the user's approval. The plugin does not install or configure tools automatically.
- Browser Use calls disable content telemetry per invocation, require an existing daemon after approved setup, and create owned tabs before navigation.

## 0.2.0

Upstream: pstack 0.15.9 (cursor/plugins commit `e43c7ee`, 2026-10-03). Previous sync: 0.15.6.

### Added

- Skill `correct`: mines history for repeated agent mistakes and fixes each at the highest level that works.

### Changed

- `architect` screens candidates as an agent contributor would change them. `design-red-flags.md` adds split ownership, two ways to do one task, importable internals, and hand-synced list.
- Perf issue step 2 uses seven ordered performance mantras instead of eight strategy families. `hillclimb` step 4 borrows their order. `benchmark-checklist` wording follows.

## 0.1.0

Upstream: pstack 0.15.6.

Initial release. A native oh-my-pi port of Cursor's pstack.

### Changed from upstream pstack

- Plain voice is the default. The always-applied rule `rules/pstack-voice.md` replaces the `/bro` skill. "simpler" restates the last reply in plainer words.
- GitHub through `gh` is the only forge. The `origin` CLI and every Origin forge path are gone.
- Thermos runs in every review step: the pre-PR gate, babysit, shipping verdicts, autopilot verifier rounds, review-bot triage, and per-PR review in orchestrate and multi-phase plans. `interrogate` stays the multi-model panel and applies both thermo rubrics.
- GitHub native Stacked PRs (`gh stack` and the stacks REST API) replace Graphite. New `stacked-prs` skill. Shipping lands the contiguous verified run with `gh stack merge`. Auto-merge is not used for stacks.
- Model choice is per role with omp role aliases (`@slow`, `@smol`, `@task`, `@default`) instead of model slugs. Overrides live in `pstack-models.md` under `~/.omp/agent/rules/` or `.omp/rules/`.
- Review-bot triage is vendor-neutral. `bugbot-triage.md` is now `review-bot-triage.md`.
- Skill frontmatter is normalized for omp. Cursor-only keys (`mode`, `icon`, `color`, `reminder`) are removed, and names equal directory names.

### Added

- Principle `tests-pay-rent`, from OpenClaw `test-audit`.
- Principle `small-door-big-room`, from mattpocock `codebase-design`.
- Skills `deslop`, `control-cli`, `control-ui`, ported from cursor-team-kit and rewritten for omp tools.
- Skills `thermos`, `thermo-nuclear-review`, `thermo-nuclear-code-quality-review` and agents `thermo-review`, `thermo-quality`, from thermos.
- Extension: sticky `/poteto-mode` command (on, off, status) and the `pstack_models` tool, plus `before_subagent_spawn` routing for `thermo-review`, `thermo-quality`, and `poteto-agent`.
- Repo lint gate and tests (`bun run check`).

### Dropped

- `bro` skill.
- `make-bot-ui` skill.
- The dormant benny automation pack.
- Origin CLI support.
- Graphite and every `gt` concept.
- Cursor-only skill frontmatter and Cursor-specific tooling (`/add-plugin`, `.cursor/` paths, built-in `create-skill` and `/babysit` caveats).
- Guide images.
