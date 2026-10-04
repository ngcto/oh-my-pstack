import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { getAgentDir } from "@oh-my-pi/pi-coding-agent";
import { join } from "node:path";
import { discoverSkillCommands, skillPrompt } from "./skill-commands.ts";
import { activationPrompt, MODE_ENTRY, MODE_REMINDER, parseModeArgs, restoreMode } from "./mode.ts";
import { loadOverrides, resolveRole, ROLES, spawnModelFor } from "./roles.ts";

interface ModelsParams {
	role?: string;
	list?: boolean;
}

export default function ohMyPstack(pi: ExtensionAPI): void {
	const z = pi.zod;
	let active = false;

	pi.setLabel("oh-my-pstack");

	const restore = (ctx: ExtensionContext): void => {
		active = ctx.agent.kind === "main" && restoreMode(ctx.sessionManager.getBranch());
	};

	pi.on("session_start", async (_event, ctx) => {
		restore(ctx);
		const { warnings } = loadOverrides(getAgentDir(), ctx.cwd);
		if (warnings.length > 0) ctx.ui.notify(`pstack-models: ${warnings.join("; ")}`, "warning");
	});
	// /new, /resume, forks and /tree change the branch without a new session_start.
	pi.on("session_switch", async (_event, ctx) => restore(ctx));
	pi.on("session_branch", async (_event, ctx) => restore(ctx));
	pi.on("session_tree", async (_event, ctx) => restore(ctx));

	pi.on("before_agent_start", async event => {
		if (!active) return;
		return { systemPrompt: [...event.systemPrompt, MODE_REMINDER] };
	});

	pi.on("before_subagent_spawn", async (event, ctx) => {
		const route = spawnModelFor(event.agent, loadOverrides(getAgentDir(), ctx.cwd));
		if (!route) return;
		return { model: route.selectors, note: `pstack role "${route.role}"` };
	});

	pi.registerCommand("poteto-mode", {
		description: "Turn poteto-mode on (sticky), off, or check it. Optional task after the command.",
		getArgumentCompletions: prefix => {
			const options = ["off", "status"].filter(option => option.startsWith(prefix.trim().toLowerCase()));
			return options.length === 0 ? null : options.map(value => ({ value, label: value }));
		},
		handler: async (args, ctx) => {
			const request = parseModeArgs(args);
			if (request.action === "status") {
				ctx.ui.notify(`poteto-mode is ${active ? "on" : "off"}`, "info");
				return;
			}
			active = request.action === "on";
			pi.appendEntry(MODE_ENTRY, { active });
			if (!active) {
				ctx.ui.notify("poteto-mode is off", "info");
				return;
			}
			pi.sendUserMessage(activationPrompt(request.task));
		},
	});

	// Marketplace installs namespace file commands as /oh-my-pstack:name, so the bare names come from here.
	for (const skill of discoverSkillCommands(join(import.meta.dir, "..", "skills"))) {
		pi.registerCommand(skill.name, {
			description: skill.description,
			handler: async args => {
				pi.sendUserMessage(skillPrompt(skill.name, args));
			},
		});
	}

	pi.registerTool({
		name: "pstack_models",
		label: "pstack models",
		description:
			"Resolve the model selectors for a pstack role (single or panel) from defaults plus ~/.omp/agent/rules/pstack-models.md and .omp/rules/pstack-models.md. " +
			"Pass each returned selector as the `model` of a task item. Panels report `diverse` (2+ model families). " +
			"A non-diverse panel also returns `candidates`: models from other families you could offer the user. " +
			"Use list:true to see authenticated models and the known roles (used by setup-pstack).",
		approval: "read",
		loadMode: "essential",
		parameters: z.object({
			role: z.string().optional().describe("Role name, e.g. interrogate-reviewers, thermos-review, code"),
			list: z.boolean().optional().describe("List authenticated models, family tokens, and known roles"),
		}),
		async execute(_toolCallId, rawParams, _signal, _onUpdate, ctx: ExtensionContext) {
			const params = rawParams as ModelsParams;
			const overrides = loadOverrides(getAgentDir(), ctx.cwd);
			if (params.list) {
				const models = ctx.models.list().map(model => ({
					selector: `${model.provider}/${model.id}`,
					family: ctx.models.family(model),
				}));
				const roles = ROLES.map(role => ({ name: role.name, kind: role.kind, defaults: role.defaults }));
				return json({ models, roles, warnings: overrides.warnings });
			}
			if (!params.role) return json({ error: "pass role or list:true", roles: ROLES.map(role => role.name) });
			const resolution = resolveRole(params.role, overrides, ctx.models);
			if (!resolution) return json({ error: `unknown role "${params.role}"`, roles: ROLES.map(role => role.name) });
			return json({ ...resolution, warnings: overrides.warnings });
		},
	});
}

function json(value: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], details: value };
}
