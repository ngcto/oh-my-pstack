### Authoring or modifying a skill

**You own the skill's voice.**

1. Read `omp://skills.md` for the discovery rules, then write the `SKILL.md`. Rules that bite: skills live exactly one level under `skills/` (`skills/<name>/SKILL.md`, nested dirs are not discovered), `name` equals the directory name in lowercase kebab, `description` is required and non-empty and says what the skill does and when to trigger it, frontmatter keys are limited to the supported set, and cross-skill references use `skill://<name>` URLs (`skill://<name>/<path>` for a file inside it). Name collisions resolve by source precedence, so pick a distinctive name or check the plugin namespace. If the work is an agent rather than a skill, agents are markdown files with frontmatter under `agents/` (see `omp://task-agent-discovery.md`).
2. Validate the skill: frontmatter has `name` and `description`, `name` matches the directory, referenced files exist, cross-skill links resolve. Run `bun scripts/lint.ts` when the repo has it.
3. Test cases if structural. Skip if subjective.
4. Choose review coverage under `skill://thermos`. Complete `skill://deslop` for changed code before any chosen review. Use `skill://no-comments` only for changed comments that need independent cleanup. Skip code-only cleanup for prose-only work and reuse cleanup already done on this diff. Verify accepted fixes on the affected path. Run **Opening a PR** with that coverage, not another review.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by name. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
