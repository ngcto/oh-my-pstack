# Set up pstack

In this page you install the plugin, optionally pick which models pstack uses, and run your first task.

## Install the plugin

Prerequisites: `gh` (authenticated) and git 2.36 or newer. For stacked PRs, also run `gh extension install github/gh-stack`. GitHub Stacked PRs are in public preview.

In a terminal, run:

```bash
omp plugin marketplace add ngcto/oh-my-pstack
omp plugin install oh-my-pstack@oh-my-pstack
```

For a local checkout, use `omp plugin link <path>`, or start omp with `omp --plugin-dir <path> -e <path>/extensions/index.ts`. `--plugin-dir` alone loads skills, agents, and rules but not the extension. Run `/reload-plugins` after changing skills, agents, or rules. The extension (the `/poteto-mode` command and the `pstack_models` tool) loads at startup, so restart omp after installing it.

UI tools are checked only when needed. [`control-ui`](../../skills/control-ui/SKILL.md) uses [`browser-use`](../../skills/browser-use/SKILL.md) for web and CDP targets, or [`cua-driver`](../../skills/cua-driver/SKILL.md) for native and GUI-only work. If the selected tool or its setup is missing, the agent asks you to install and set it up before driving. The plugin does not install drivers or change permissions automatically.

## Pick your models

This step is optional. Every role defaults to an omp role alias: `@slow` for judgment and prose, `@smol` for fast exploration, `@task` for code delegates, and `@default` for your current model. pstack works on any provider with no config. Run setup only to override.


```text
/setup-pstack
```

[`/setup-pstack`](../../skills/setup-pstack/SKILL.md) detects the models you have authenticated, asks for a reasoning budget, shows you each role (code delegates, judgment, the thermos reviewers, the panels), and asks what you want. Answer the questions. It writes `~/.omp/agent/rules/pstack-models.md`, or `.omp/rules/pstack-models.md` if you choose project scope. The project file wins. The extension reads it, and the `pstack_models` tool resolves each role for the skills.

You only override what you care about. A role with no line in the rule keeps its default. To restore a default, delete that role's line, or delete the file. A rerun of `/setup-pstack` keeps any role you changed by hand. Each line has the shape `role: selector[, selector...]`, and a selector is a role alias like `@slow` or a `provider/model[:level]` id. The full role table is in [the roles reference](../../skills/setup-pstack/references/roles.md).

You might be wondering what a panel is. For a panel role (`arena-runners`, `architect-runners`, `interrogate-reviewers`, `arena-cross-judge`) the value is a list, and one subagent runs per entry. Aliases that resolve to the same model collapse. If only one model family is available, the reply says the panel is one opinion, not three, and runs the deduped list. Set a role to `@default` to use whatever model your session runs. `swarm-workers` is the default model for every `/swarm` worker unless a race names a model for each arm.

## Accept the verification offer, or don't

At the end of setup, `/setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.omp/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers when it earns its place.

The override applies to new subagent spawns right away. No restart needed.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. `/poteto-mode` is sticky. It stays on for the conversation until you opt out by saying so.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
