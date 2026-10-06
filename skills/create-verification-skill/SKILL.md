---
name: create-verification-skill
description: "Generate a project-local verification skill that drives your app the way a user does, in any language, framework, or platform. Use for \"create a verification skill\", \"make a control skill for this repo\", \"make a verify skill\", or when a project has no scripted way to prove UI, CLI, or service behavior."
disable-model-invocation: true
---

# Create a verification skill

Every serious project needs a scripted way to drive the real app and prove behavior: launch it, exercise a feature the way a user would, and capture evidence. This skill generates that as a project-local skill (`.omp/skills/verify-<app>/`) tailored to the repo. You write the generator's output for the next agent, not for a human: it will be read cold, mid-task, by an agent that has never seen the app.

OMP discovers skills one directory deep, so the generated skill is `.omp/skills/verify-<app>/SKILL.md` and everything else lives inside that directory under `references/` or `scripts/`. Never nest another skill below it. Read `omp://skills.md` if discovery rules are in doubt.

## 1. Interview the repo, not the user

Answer these from the codebase and only `ask` the user what you cannot observe:

- **Surface:** what does a user actually touch? A web UI, a CLI/TUI, a desktop app, an API, a mobile app, a library? A repo can have several; pick the primary one and note the rest.
- **Run:** how does the app start locally? Prefer the repo's own documented dev command (package scripts, Makefile, README quickstart). Note ports, env vars, seed data, auth.
- **Drive:** how can an agent interact with it programmatically? Existing harnesses first: Playwright/Cypress specs, expect scripts, PTY helpers, curl-able endpoints, a debug port. Only then pick a generic recipe. Read `skill://control-ui` for web, Electron, IDE, and native desktop apps; it selects `skill://browser-use` or `skill://cua-driver` and gates missing setup on user approval. The `control-cli` skill covers CLI and TUI (a named `bash` service for prompts and REPLs, tmux for full-screen TUIs). Plain HTTP covers services.
- **Observe:** what evidence can be captured? Screenshots, terminal transcripts, response bodies, logs, exit codes, DB state.
- **Isolate:** can two instances run side by side (ports, data dirs, profiles)? If not, say so in the generated skill: refusing to double-drive a shared instance beats corrupting the user's session.

If the checkout doesn't build or start as-is, fix that first (or report it precisely) before generating; a skill written against a broken base teaches wrong steps. When an irrelevant missing asset blocks startup (a static dir the API never serves, a sample config), the generated skill may create it, clearly marked as verification scaffolding, and remove it in cleanup.

## 2. Generate the skill

Write `.omp/skills/verify-<app>/SKILL.md` with YAML frontmatter (`name: verify-<app>`, equal to the directory name, and a quoted `description` that names the app, the surface, and when to reach for it, with trigger phrases; without frontmatter the skill never registers) and these sections, each grounded in what the interview actually found (no placeholders left):

- **Launch:** the exact command that starts the app for verification, and how to tell it's ready (a log line, a port answering, a prompt). Include teardown. For a server or UI, start it as a named service, `bash {command, name, ready: {port|log}}` (no `async`, no `timeout`), so `read proc://<name>` shows its output and `write proc://<name>/kill` stops it. For a short-lived CLI or TUI there is no server to keep alive: launch means build the binary (or install deps) once, then start each drive in its own isolated service or tmux session.
- **Doctor:** one read-only check that answers "is this instance worth driving?": process up, right version/build, port owned by us, auth valid. An agent runs this first whenever anything looks off.
- **Drive:** the harness recipe with real selectors/commands from this repo, not examples. Read `skill://control-ui` or `skill://control-cli` and give the concrete Browser Use endpoint and CLI commands, Cua exact-window calls, or tmux command. Prefer stable handles (ARIA labels, data attributes, prompt strings, route paths) over coordinates and tab order.
- **Evidence:** what to capture for a proof and where it goes. State the proof standards: exercise the real user path, not internal setters or test-only endpoints; capture the action and the resulting state, not just the final screen; verify side effects (files written, rows inserted, messages sent) alongside what's visible; mocks only where a production boundary already isolates the external system. When the safe path is a dry-run or test mode, verify what it actually skips by observing (files, network, git refs) rather than trusting its name: some dry-runs still touch the network or open a browser.
- **Cleanup:** how to tear down instances the run created. Never kill by process name; stop owned services with `write proc://<name>/kill`, close owned Browser Use tabs with `close_tab(target)`, end this Cua session with `end_session`, or stop owned tmux sessions. Do not stop shared daemons or close user-owned windows. Cleanup removes instances and scratch state, never the evidence: proof artifacts survive the teardown, in a location the skill names.
- **Helpers:** any script the skill ships lives in `scripts/` inside the skill directory, is executable, and its invocation is shown in the skill body. A helper the reader has to reverse-engineer is not a helper.

## 3. Seed the feature map

Create `.omp/skills/verify-<app>/references/features/README.md` plus one file per user-facing feature you can identify (aim for the top 3-5 to start, from routes, commands, menus, or docs). Follow the shape in [`references/feature-map-example/`](references/feature-map-example/), with a README index and one file per feature. Each file answers, from the user's point of view: what the feature is, how to reach it, how to drive it with the harness, and what observable end state proves it works. The four H2s are `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, and `Gotchas`. The map is the repo's maintained verification source; a proof that drives one convenient entry point is incomplete when the map lists others. Link the map from the generated `SKILL.md` so the next agent finds it.

## 4. Prove the generated skill before handing it over

Run its own instructions end to end once: launch, doctor, drive ONE mapped feature (one is enough; the map exists so later runs can cover the rest), capture evidence, clean up. After cleanup, confirm the evidence still exists at the named location; a cleanup that eats the proof fails this step. Fix what fails, and run the generated cleanup after every failed iteration too, so broken attempts don't strand processes and ports. A generated skill that was never executed is a draft, not a deliverable.

## 5. Offer the maintenance loop

Point the user at the `maintain-verification-skill` skill for keeping the map honest as the app changes. Suggest a cadence only if they ask.
