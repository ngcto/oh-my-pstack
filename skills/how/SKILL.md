---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
---

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Each spawn below names a role from the `pstack_models` tool. Call `pstack_models` with `{ role: "<role>" }` and pass the returned selector as the `model` field of the task item. If the tool is absent, read `rule://pstack-models` when it exists and use the role's line, otherwise the default alias. If a selector is rejected, use the role's default alias and say so.

## Step 1. Assess Complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no explorers. One explainer explores and explains in a single pass. Go to Step 2b.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): spawn parallel explorers first, then hand off to the explainer. Go to Step 2a.

When in doubt, take the simple path.

## Step 2a. Explore (complex questions only)

Decompose the question into 2 to 4 exploration angles, each a distinct slice of the subsystem. Spawn all explorers together with eval `workpool("scout", { name: "how-explorers", context: <the question> })` and one `.push(...)` per angle, or as one `tasks[]` batch on the `task` tool:

- `agent`: `scout` (read-only discovery)
- `model`: role `how-explorer`, default `@smol`
- `name`: one CamelCase name per angle

Each explorer gets the prompt in `references/explorer-prompt.md` with its angle filled in (as the `task` field, with the question in the shared `context`). Set `solutionSpace` to describe how open the angle is. Then go to Step 3.

## Step 2b. Direct Explain (simple questions)

Spawn one `scout` subagent that explores and explains in one pass:

- `agent`: `scout` (read-only)
- `model`: role `how-explainer`, default `@slow`

Build its prompt from `references/explainer-prompt.md` without the explorer-findings section. Go to Step 4.

## Step 3. Synthesize (complex questions only)

Once all explorers have returned, spawn one `scout` subagent to synthesize their findings into one explanation:

- `agent`: `scout` (read-only, so it can still check the code)
- `model`: role `how-explainer`, default `@slow`

Build its prompt from `references/explainer-prompt.md` with every explorer's findings filled in.

## Step 4. Present

Present the explainer's output to the user. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.

## Output Format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
