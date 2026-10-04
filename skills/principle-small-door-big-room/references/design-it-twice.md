# Design It Twice

Your first interface is unlikely to be the best. When a deepening candidate has no obvious interface, design it several radically different ways in parallel, then compare. Uses the vocabulary in [SKILL.md](../SKILL.md). This composes with the `architect` skill (whole-system design) and the `arena` skill (competing full attempts). Use this file for one module's interface.

## 1. Frame the problem

Before spawning anything, write a short explanation for the user:

- The constraints any new interface must satisfy.
- The dependencies it relies on and their category (see [deepening.md](deepening.md)).
- A rough code sketch that makes the constraints concrete. It is not a proposal.

Show it, then start step 2 immediately. The user reads while the agents work.

## 2. One batch of designers

Send one `task` batch, or one eval `workpool`, of 3 or more agents. Use `scout`-class read-only agents, since they design and do not edit (scout has no bash, which is fine for design). Scout runs on a cheap model by default, and design is a judgment call, so the caller MUST pass `model` on every item: read the `hardest` role (or `judgment`) with the `pstack_models` tool and use its selector. A workpool binds one agent, so set `model` on each pushed item there too. Each gets a separate technical brief: file paths, coupling details, the dependency category, what sits behind the seam, the SKILL.md vocabulary, and the project's domain terms. Give each a different design constraint:

- **Minimize the interface.** One to three entry points at most. Maximum leverage per entry point.
- **Maximize flexibility.** Support many use cases and extension.
- **Optimize the common caller.** Make the default case trivial.
- **Ports and adapters** (when dependencies cross a seam). Design around injected adapters.

Each agent returns:

1. The interface: types, methods, params, plus invariants, ordering, and error modes.
2. A usage example showing a real caller.
3. What the implementation hides behind the seam.
4. Dependency strategy and adapters.
5. Trade-offs: where leverage is high and where it is thin.

## 3. Present, compare, recommend

Present the designs one at a time so each can be absorbed. Then compare in prose on **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**. End with an opinionated recommendation: which design is strongest and why. If pieces of different designs combine well, propose the hybrid. The reader wants a strong read, not a menu.
