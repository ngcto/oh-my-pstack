import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type ModeRequest, parseModeArgs, restoreMode } from "./mode.ts";
import { discoverSkillCommands, parseDescription, skillPrompt } from "./skill-commands.ts";
import { loadOverrides, type ModelFacade, parseRuleFile, resolveRole, RULE_FILE, spawnModelFor } from "./roles.ts";

const CATALOG: Record<string, { provider: string; id: string }> = {
	"@slow": { provider: "anthropic", id: "opus" },
	"@default": { provider: "anthropic", id: "sonnet" },
	"@task": { provider: "openai", id: "gpt" },
	"@smol": { provider: "google", id: "flash" },
	"openai/gpt": { provider: "openai", id: "gpt" },
};

const facade: ModelFacade = {
	resolve: spec => CATALOG[spec],
	family: model => model.provider,
	current: () => CATALOG["@default"],
	list: () => Object.values(CATALOG),
};

const EMPTY = { user: new Map<string, string[]>(), project: new Map<string, string[]>(), warnings: [] };

describe("parseRuleFile", () => {
	it("reads role lines, skips comments and frontmatter, and reports bad lines without throwing", () => {
		const text = [
			"---",
			"alwaysApply: false",
			"---",
			"# comment",
			"code: openai/gpt:high",
			"interrogate-reviewers: @slow, openai/gpt",
			"nonsense",
			"made-up-role: @slow",
			"thermos-review:",
			"judgment: @slow, @smol",
		].join("\n");
		const { roles, warnings } = parseRuleFile(text, "f");
		expect(Object.fromEntries(roles)).toEqual({
			code: ["openai/gpt:high"],
			"interrogate-reviewers": ["@slow", "openai/gpt"],
			judgment: ["@slow"],
		});
		expect(warnings).toHaveLength(4);
	});
});

describe("resolveRole", () => {
	it("gives a panel of three distinct families from defaults and marks it diverse", () => {
		const result = resolveRole("interrogate-reviewers", EMPTY, facade);
		expect(result?.source).toBe("default");
		expect(result?.resolved.map(entry => entry.model)).toEqual([
			"anthropic/opus",
			"anthropic/sonnet",
			"openai/gpt",
		]);
		expect(result?.diverse).toBe(true);
	});

	it("collapses selectors that resolve to the same model and reports a single family as not diverse", () => {
		const only = { provider: "local", id: "only" };
		const single: ModelFacade = { resolve: () => only, family: () => "local", current: () => only, list: () => [only] };
		const result = resolveRole("arena-runners", EMPTY, single);
		expect(result?.selectors).toEqual(["@slow"]);
		expect(result?.diverse).toBe(false);
	});

	it("keeps the same model at different thinking levels as separate panel entries", () => {
		const overrides = { ...EMPTY, user: new Map([["arena-runners", ["openai/gpt:high", "openai/gpt:low"]]]) };
		const result = resolveRole("arena-runners", overrides, facade);
		expect(result?.selectors).toEqual(["openai/gpt:high", "openai/gpt:low"]);
	});

	it("prefers project over user over default and lists unavailable selectors", () => {
		const overrides = {
			...EMPTY,
			user: new Map([["code", ["@smol"]]]),
			project: new Map([["code", ["ghost/model", "openai/gpt"]]]),
		};
		const result = resolveRole("code", overrides, facade);
		expect(result?.source).toBe("project");
		expect(result?.unavailable).toEqual(["ghost/model"]);
		expect(result?.selectors).toEqual(["openai/gpt"]);
	});

	it("treats an unconfigured role alias as the session model instead of unavailable", () => {
		const bare: ModelFacade = { ...facade, resolve: spec => (spec === "@task" ? undefined : CATALOG[spec]) };
		const result = resolveRole("code", EMPTY, bare);
		expect(result?.unavailable).toEqual([]);
		expect(result?.resolved[0]?.model).toBe("anthropic/sonnet");
		// OMP rejects an unset @task at spawn time, so the spawnable selector must be @default.
		expect(result?.selectors).toEqual(["@default"]);
	});

	it("keeps the thinking level when an unset alias falls back to the session model", () => {
		const bare: ModelFacade = { ...facade, resolve: spec => (spec.startsWith("@") ? undefined : CATALOG[spec]) };
		const overrides = { ...EMPTY, user: new Map([["code", ["@task:high"]]]) };
		expect(resolveRole("code", overrides, bare)?.selectors).toEqual(["@default:high"]);
	});

	it("offers one candidate per missing family when the panel is not diverse", () => {
		const oneFamily: ModelFacade = { ...facade, resolve: () => CATALOG["@slow"] };
		const result = resolveRole("interrogate-reviewers", EMPTY, oneFamily);
		expect(result?.diverse).toBe(false);
		expect(result?.candidates).toEqual(["openai/gpt", "google/flash"]);
		expect(resolveRole("interrogate-reviewers", EMPTY, facade)?.candidates).toEqual([]);
	});

	it("returns undefined for an unknown role", () => {
		expect(resolveRole("nope", EMPTY, facade)).toBeUndefined();
	});
});

describe("spawnModelFor", () => {
	it("routes thermo agents only when the user configured their role", () => {
		expect(spawnModelFor("thermo-review", EMPTY)).toBeUndefined();
		const overrides = { ...EMPTY, user: new Map([["thermos-review", ["@smol"]]]) };
		expect(spawnModelFor("thermo-review", overrides)).toEqual({ role: "thermos-review", selectors: ["@smol"] });
		expect(spawnModelFor("scout", overrides)).toBeUndefined();
		// Code delegates carry an explicit model from the skill; a configured `code` role must not override it.
		const codeConfigured = { ...EMPTY, user: new Map([["code", ["@smol"]]]) };
		expect(spawnModelFor("poteto-agent", codeConfigured)).toBeUndefined();
	});
});

describe("loadOverrides", () => {
	it("reads the user file from the agent dir and the project file from .omp/rules", () => {
		const root = mkdtempSync(join(tmpdir(), "pstack-"));
		const agentDir = join(root, "agent");
		const cwd = join(root, "proj");
		mkdirSync(join(agentDir, "rules"), { recursive: true });
		mkdirSync(join(cwd, ".omp", "rules"), { recursive: true });
		writeFileSync(join(agentDir, "rules", RULE_FILE), "code: @slow\n");
		writeFileSync(join(cwd, ".omp", "rules", RULE_FILE), "code: @smol\n");
		const overrides = loadOverrides(agentDir, cwd);
		expect(overrides.user.get("code")).toEqual(["@slow"]);
		expect(overrides.project.get("code")).toEqual(["@smol"]);
	});

	it("treats missing files as no overrides", () => {
		const overrides = loadOverrides("/nonexistent/a", "/nonexistent/b");
		expect(overrides.user.size + overrides.project.size + overrides.warnings.length).toBe(0);
	});
});

describe("parseModeArgs", () => {
	it.each<[string, ModeRequest]>([
		["", { action: "on", task: "" }],
		["off", { action: "off", task: "" }],
		["status", { action: "status", task: "" }],
		["off the scroll drift", { action: "on", task: "off the scroll drift" }],
		["fix the drift", { action: "on", task: "fix the drift" }],
	])("%j", (input, expected) => {
		expect(parseModeArgs(input)).toEqual(expected);
	});
});

describe("restoreMode", () => {
	it("uses the newest mode entry and ignores unrelated entries", () => {
		const entries = [
			{ type: "custom", customType: "pstack-mode", data: { active: true } },
			{ type: "message" },
			{ type: "custom", customType: "other", data: { active: false } },
		];
		expect(restoreMode(entries)).toBe(true);
		expect(restoreMode([...entries, { type: "custom", customType: "pstack-mode", data: { active: false } }])).toBe(false);
		expect(restoreMode([])).toBe(false);
	});
});

describe("skill commands", () => {
	it("exposes workflow skills, and leaves out principles and the sticky mode skill", () => {
		const root = mkdtempSync(join(tmpdir(), "pstack-skills-"));
		for (const [name, description] of [
			["thermos", '"Run both lenses. Use for pre-PR review."'],
			["principle-fix-root-causes", '"Apply when debugging."'],
			["poteto-mode", '"Mode."'],
		] as const) {
			mkdirSync(join(root, name));
			writeFileSync(join(root, name, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\nbody\n`);
		}
		mkdirSync(join(root, "empty"));
		expect(discoverSkillCommands(root)).toEqual([{ name: "thermos", description: "Run both lenses." }]);
	});

	it("shortens long descriptions and unescapes quotes", () => {
		expect(parseDescription('description: "Say \\"hi\\" first. Then more."')).toBe('Say "hi" first.');
		expect(parseDescription(`description: "${"x".repeat(200)}"`)).toHaveLength(140);
	});

	it("builds the prompt with and without arguments", () => {
		expect(skillPrompt("why", "  ")).toBe("Read skill://why in full and follow it.");
		expect(skillPrompt("why", "is the flag off?")).toBe("Read skill://why in full and follow it.\n\nis the flag off?");
	});

	it("finds every skill in the real plugin tree", () => {
		const names = discoverSkillCommands(join(import.meta.dir, "..", "skills")).map(command => command.name);
		expect(names).toContain("thermos");
		expect(names).toContain("stacked-prs");
		expect(names).not.toContain("bro");
		expect(names.some(name => name.startsWith("principle-"))).toBe(false);
	});
});
