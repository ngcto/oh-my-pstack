---
name: deslop
description: "Remove AI-generated slop from a branch diff: noisy comments, abnormal defensive checks, `any` casts, deep nesting, style drift. Use for \"deslop\", \"clean up the AI code\", \"tidy this branch\", or before opening a PR and before review."
---

# Remove AI code slop

Diff the branch against trunk and remove AI-generated slop it introduced. Behavior stays the same.

## Scope

- Base: the caller's scope spec. For a stack layer the base is its parent branch. With no spec, use `git merge-base HEAD origin/HEAD`, falling back to `main`/`master`. Review `git diff <base>...HEAD` plus uncommitted changes.
- Touch only lines the branch added or changed. In a stack, never edit lines owned by lower layers.

## Focus areas

- Comments that restate code or clash with local style. When comment noise dominates the diff, run the `no-comments` skill first, then continue here.
- Defensive checks or try/catch blocks that are abnormal for trusted code paths.
- Casts to `any` used only to bypass type issues. Fix the type instead.
- Deep nesting that early returns would flatten.
- Anything else inconsistent with the file and its neighbors.

## Tools

- `xd://lsp` diagnostics find unused imports, needless casts, and type errors the cleanup exposes.
- `xd://ast_grep` finds a slop pattern across the diff. `xd://ast_edit` rewrites it mechanically when the same shape repeats.
- After edits, run the project's own typecheck and tests.

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Run before thermos review, not after.
- Keep the final summary to 1-3 sentences.

Adapted from cursor-team-kit (MIT).
