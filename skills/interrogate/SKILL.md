---
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Multiple LLM reviewers challenge changes from independent angles."
disable-model-invocation: true
---

# Interrogate

Run the two thermo lenses once per configured model and synthesize across models. A panel seat is one model. Each seat runs both `thermo-review` (bugs, breakage, security, devex, feature gates) and `thermo-quality` (maintainability, code-judo, boundaries, module depth, test value). The adversarial signal comes from model diversity, not assigned personas.

The deliverable is a synthesized verdict. Do NOT auto-apply changes.

## Step 1, Determine Scope

Identify what to review from context:

- If the user points at specific files or a diff, use that
- If on a feature branch, run `git diff main...HEAD` (or the appropriate base branch) for the full changeset
- If the user's message references recent work, gather the relevant files

Reviewers are read-only and have `bash`, so hand them the scope (base, head, PR number, and for a stack layer the parent branch) and let them run the diff themselves. Never paste a large diff into the prompt.

## Step 2, State the Intent

Before spawning reviewers, state the intent explicitly. Derive this from:

- The user's message
- Commit messages
- PR description if one exists
- The code itself

Write one clear paragraph. If you're unsure about the intent, ask the user before proceeding.

## Step 3, Spawn the Panel

Call `pstack_models` with `role: "interrogate-reviewers"`. It returns the resolved `selectors`, the deduped model list, and a `diverse` flag. If the tool is absent, read `rule://pstack-models` for the `interrogate-reviewers` line and fall back to the default `@slow, @default, @task`.

Each resolved entry is one seat, labeled Seat A, B, C, and so on. Launch every seat in ONE `task` call. For each seat add two items to `tasks[]`, both with `model` set to that seat's selector:

- `agent: thermo-review`, `solutionSpace`: "adversarial audit, breakage paths unknown"
- `agent: thermo-quality`, `solutionSpace`: "structure may admit a much simpler reframing"

Use one `task` call with heterogeneous items instead of a `workpool`. A workpool binds one agent and replaces its structured output with a free-form schema, which would lose the priority 0-3 findings the synthesis relies on. Name items like `SeatAReview`, `SeatAQuality`.

Every item gets the same task text:

1. The stated intent from Step 2.
2. The scope spec: base ref, head ref, PR number if any, and for a stack layer the one layer under review plus the names of lower layers for context.
3. One extra line: "Also apply the correctness and structure rubric at `skill://interrogate/references/rubric.md` (read it with `read`) where it adds something your own rubric does not cover. Do not force lenses that do not apply."

Aliases that resolve to the same model collapse into one seat. Do not pad with clones. If the panel is not diverse, say so in the reply ("one model family available, so this panel is one opinion, not three") and run the deduped list anyway. A single-seat panel is still worth running when the user asked for interrogate, but mention that `thermos` gives the same two lenses cheaper.

If the user configured the `thermos-review` or `thermos-quality` role, the pstack extension may reroute those agents to that model and override the seat's `model`. Check the model each item actually ran on. If seats collapsed onto one model, say the panel lost diversity.

## Step 4, Synthesize

Results are structured: each item returns a verdict, an explanation, and findings with priority 0-3, file and line, and confidence. Use them directly. Tag each finding with its seat (model) and lens, taken from which item produced it, not from the finding's own `lens` field.

1. **Parse all findings** from every seat and both lenses.
2. **Identify consensus**. A finding raised by 2+ seats (different model families) is highest signal. The same finding from both lenses inside one seat is one opinion, not two.
3. **Identify lone-model findings**. Still worth reading, but weight them lower than consensus.
4. **Deduplicate**. Different models describe the same issue differently. Merge and note which seats and lenses raised it.
5. **Note disagreements**. If one seat flags something and another explicitly says the opposite, that is useful context for the verdict.

## Step 5, Lead Judgment

You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator.

Read `references/lead-judgment.md` for the full framework.

Categorize every finding using these buckets:

- **Act on**. Real issues affecting correctness, security, or maintainability given the actual goals. These would block a real PR.
- **Consider**. Legitimate points, but you're not sure they outweigh the cost of addressing them right now. Worth the user's attention.
- **Noted**. Technically valid but not actionable. Context-dependent, premature optimization, or low-impact given the current stage.
- **Dismissed**. Wrong, nitpicky, or missing context. Brief explanation why.

For each finding, include:
- Which seat(s) (models) and lens(es) raised it, and its priority (P0-P3)
- The category (act on / consider / noted / dismissed)
- A one-line rationale for the categorization

## Output Format

Present the verdict in this structure:

### Intent
> [The stated intent paragraph from Step 2]

### Panel
- Seat [label]: [model name], [verdict and N findings for thermo-review], [verdict and N findings for thermo-quality] (one bullet per seat)

### Act On
[Findings that should be addressed. For each: description, priority, which seats and lenses raised it, why it matters.]

### Consider
[Findings worth thinking about. For each: description, which seats and lenses raised it, tradeoff involved.]

### Noted
[Valid but low-priority. Brief list.]

### Dismissed
[Rejected findings with brief rationale.]

### Agreement Map
[Where did seats agree, where did they diverge, and what does the pattern of agreement and disagreement tell us? Note per lens: consensus on bugs is a different signal than consensus on structure.]

## Relationship to thermos

`interrogate` is `thermos` with model diversity. Thermos runs the two thermo lenses once as two agents on `@slow` and is the default, cheap gate. Interrogate runs the same two agents once per panel seat across several models, then adds lead judgment. Escalate from thermos to interrogate when the design is contested, the stakes are high, or the user asks for multi-model or adversarial review.
