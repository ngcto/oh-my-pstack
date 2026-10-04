# pstack model roles

pstack picks models per role. Defaults are omp role aliases, so the plugin works on any provider with no config. A line in `pstack-models.md` overrides one role. A missing line keeps the default.

| role | kind | default | used by |
|---|---|---|---|
| code | single | `@task` | feature, refactoring, bug-fix, perf-issue, hillclimb delegates |
| judgment | single | `@slow` | prose, judgment calls |
| hardest | single | `@slow` | cross-cutting design, gnarly concurrency, subtle algorithms |
| how-explorer | single | `@smol` | `how` explorers |
| how-explainer | single | `@slow` | `how` explainer |
| why-investigators | single | `@smol` | `why` investigators |
| why-synthesizer | single | `@slow` | `why` synthesizer |
| reflect-tooling | single | `@slow` | `reflect` tooling reviewer |
| reflect-judgment | single | `@slow` | `reflect` judgment, divergent, synthesizer |
| swarm-workers | single | `@task` | `swarm` workers |
| thermos-review | single | `@slow` | agent `thermo-review` |
| thermos-quality | single | `@slow` | agent `thermo-quality` |
| arena-runners | panel | `@slow, @default, @task` | `arena` attempts |
| arena-cross-judge | panel | `@slow, @default, @task` | `arena` cross-judge pool (pick one whose family differs from parent when possible) |
| architect-runners | panel | `@slow, @default, @task` | `architect` design runners |
| interrogate-reviewers | panel | `@slow, @default, @task` | `interrogate` panel |

A single role runs one subagent. A panel runs one subagent per entry. Aliases that resolve to the same concrete model collapse, so a panel never pads with clones.
