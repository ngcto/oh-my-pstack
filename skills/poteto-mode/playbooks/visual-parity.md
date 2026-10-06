### Visual parity

**You own pixel-exact equivalence. The baseline is the spec. You do not touch it.** Equivalence is verified by image diff, not by eye.

1. Establish the baseline first, before any migration: a visual regression harness that screenshots the current component across its states through `skill://control-ui`, plus the target when matching two implementations. No baseline, no parity claim. A blocking prerequisite, not a follow-up.
2. Anti-shortcut clauses, stated and held: no harness modifications, no baseline tampering, no component restructuring to make a diff pass. If the baseline looks wrong, stop and ask, don't edit it.
3. Migrate one component at a time. Parallelize across worktrees, one owner per component (`task` with `isolated: true`, which needs `task.isolation.enabled` (see Subagents in `poteto-mode`; without it use `/wt` worktrees or one owner at a time), the **separate-before-serializing-shared-state** principle skill). Shared primitives migrate first as a blocking phase.
4. Verify each component against its baseline with the repo's image comparison tool on screenshots captured through `skill://control-ui`. Keep viewport, scale, and app state identical. A nonzero diff is a fail. Investigate the pixel delta. Iterate per component until the diff is zero. An operator who wants an external driver types `/loop --until '<diff is zero command>' <prompt>` themselves.
5. Run **Opening a PR** per component or per safe batch.

**Reply:** components migrated, the diff result for each, the baseline harness location, what's left.
