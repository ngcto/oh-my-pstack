import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type RoleKind = "single" | "panel";

export interface RoleSpec {
	readonly name: string;
	readonly kind: RoleKind;
	readonly defaults: readonly string[];
}

/** Single source of truth. `skills/setup-pstack/references/roles.md` mirrors it; `scripts/lint.ts` enforces that. */
export const ROLES: readonly RoleSpec[] = [
	{ name: "code", kind: "single", defaults: ["@task"] },
	{ name: "judgment", kind: "single", defaults: ["@slow"] },
	{ name: "hardest", kind: "single", defaults: ["@slow"] },
	{ name: "how-explorer", kind: "single", defaults: ["@smol"] },
	{ name: "how-explainer", kind: "single", defaults: ["@slow"] },
	{ name: "why-investigators", kind: "single", defaults: ["@smol"] },
	{ name: "why-synthesizer", kind: "single", defaults: ["@slow"] },
	{ name: "reflect-tooling", kind: "single", defaults: ["@slow"] },
	{ name: "reflect-judgment", kind: "single", defaults: ["@slow"] },
	{ name: "swarm-workers", kind: "single", defaults: ["@task"] },
	{ name: "thermos-review", kind: "single", defaults: ["@slow"] },
	{ name: "thermos-quality", kind: "single", defaults: ["@slow"] },
	{ name: "arena-runners", kind: "panel", defaults: ["@slow", "@default", "@task"] },
	{ name: "arena-cross-judge", kind: "panel", defaults: ["@slow", "@default", "@task"] },
	{ name: "architect-runners", kind: "panel", defaults: ["@slow", "@default", "@task"] },
	{ name: "interrogate-reviewers", kind: "panel", defaults: ["@slow", "@default", "@task"] },
];

/** Agents whose spawn model follows a role when the user has configured one. Code delegates are not listed: skills pass their role model explicitly. */
export const AGENT_ROLE: Readonly<Record<string, string>> = {
	"thermo-review": "thermos-review",
	"thermo-quality": "thermos-quality",
};

export const RULE_FILE = "pstack-models.md";

export type RoleSource = "default" | "user" | "project";

export interface Overrides {
	readonly user: ReadonlyMap<string, readonly string[]>;
	readonly project: ReadonlyMap<string, readonly string[]>;
	readonly warnings: readonly string[];
}

export function findRole(name: string): RoleSpec | undefined {
	return ROLES.find(role => role.name === name);
}

function stripFrontmatter(text: string): string {
	const normalized = text.replace(/\r\n/g, "\n");
	if (!normalized.startsWith("---\n")) return normalized;
	const end = normalized.indexOf("\n---", 4);
	if (end === -1) return normalized;
	const after = normalized.indexOf("\n", end + 4);
	return after === -1 ? "" : normalized.slice(after + 1);
}

export function splitSelectors(value: string): string[] {
	return value
		.split(",")
		.map(part => part.trim())
		.filter(part => part.length > 0);
}

/** Parses `role: selector[, selector...]` lines. Unknown roles and empty values are reported, never thrown. */
export function parseRuleFile(text: string, label: string): { roles: Map<string, string[]>; warnings: string[] } {
	const roles = new Map<string, string[]>();
	const warnings: string[] = [];
	for (const [index, raw] of stripFrontmatter(text).split("\n").entries()) {
		const line = raw.trim();
		if (line === "" || line.startsWith("#")) continue;
		const colon = line.indexOf(":");
		if (colon === -1) {
			warnings.push(`${label}: line ${index + 1} is not "role: selector": ${line}`);
			continue;
		}
		const name = line.slice(0, colon).trim();
		const selectors = splitSelectors(line.slice(colon + 1));
		const spec = findRole(name);
		if (!spec) {
			warnings.push(`${label}: unknown role "${name}"`);
			continue;
		}
		if (selectors.length === 0) {
			warnings.push(`${label}: role "${name}" has no selector`);
			continue;
		}
		if (spec.kind === "single" && selectors.length > 1) {
			warnings.push(`${label}: role "${name}" takes one selector, using the first of ${selectors.length}`);
			roles.set(name, [selectors[0] as string]);
			continue;
		}
		roles.set(name, selectors);
	}
	return { roles, warnings };
}

function readRuleFile(path: string): { roles: Map<string, string[]>; warnings: string[] } {
	if (!existsSync(path)) return { roles: new Map(), warnings: [] };
	try {
		return parseRuleFile(readFileSync(path, "utf8"), path);
	} catch (error) {
		return { roles: new Map(), warnings: [`${path}: ${error instanceof Error ? error.message : String(error)}`] };
	}
}

export function loadOverrides(agentDir: string, cwd: string): Overrides {
	const user = readRuleFile(join(agentDir, "rules", RULE_FILE));
	const project = readRuleFile(join(cwd, ".omp", "rules", RULE_FILE));
	return { user: user.roles, project: project.roles, warnings: [...user.warnings, ...project.warnings] };
}

export interface ResolvedModel {
	readonly selector: string;
	readonly model: string | null;
	readonly family: string | null;
}

export interface ModelRef {
	provider: string;
	id: string;
}

export interface ModelFacade {
	resolve(spec: string): ModelRef | undefined;
	family(model: ModelRef): string;
	current(): ModelRef | undefined;
	list(): ModelRef[];
}

export interface RoleResolution {
	readonly role: string;
	readonly kind: RoleKind;
	readonly source: RoleSource;
	readonly selectors: string[];
	readonly resolved: ResolvedModel[];
	readonly unavailable: string[];
	readonly diverse: boolean;
	/** One authenticated model per family the panel does not yet cover. Only set for a non-diverse panel. */
	readonly candidates: string[];
}

function withoutLevel(selector: string): string {
	return selector.replace(/:(off|minimal|low|medium|high|xhigh|max)$/, "");
}

export function resolveRole(name: string, overrides: Overrides, models: ModelFacade): RoleResolution | undefined {
	const spec = findRole(name);
	if (!spec) return undefined;
	const project = overrides.project.get(name);
	const user = overrides.user.get(name);
	const source: RoleSource = project ? "project" : user ? "user" : "default";
	const configured = project ?? user ?? spec.defaults;

	const resolved: ResolvedModel[] = [];
	const selectors: string[] = [];
	const unavailable: string[] = [];
	const seen = new Set<string>();
	for (const selector of configured) {
		const base = withoutLevel(selector);
		const level = selector.slice(base.length);
		// OMP rejects a role alias with no configured model (e.g. an unset @task) at spawn time. The session model is
		// what such a child should run on, so hand back @default, which OMP always accepts.
		const direct = models.resolve(base);
		const model = direct ?? (base.startsWith("@") ? models.current() : undefined);
		if (!model) {
			unavailable.push(selector);
			continue;
		}
		const key = `${model.provider}/${model.id}${level}`;
		if (seen.has(key)) continue;
		seen.add(key);
		selectors.push(direct ? selector : `@default${level}`);
		resolved.push({ selector, model: `${model.provider}/${model.id}`, family: models.family(model) });
	}
	const families = new Set(resolved.map(entry => entry.family));
	const diverse = families.size >= 2;
	const candidates: string[] = [];
	if (spec.kind === "panel" && !diverse) {
		for (const model of models.list()) {
			const family = models.family(model);
			if (families.has(family)) continue;
			families.add(family);
			candidates.push(`${model.provider}/${model.id}`);
		}
	}
	return { role: name, kind: spec.kind, source, selectors, resolved, unavailable, diverse, candidates };
}

/** Selectors a spawned agent should use, or undefined when the user has not configured its role. */
export function spawnModelFor(agent: string, overrides: Overrides): { role: string; selectors: string[] } | undefined {
	const role = AGENT_ROLE[agent];
	if (!role) return undefined;
	const selectors = overrides.project.get(role) ?? overrides.user.get(role);
	return selectors ? { role, selectors: [...selectors] } : undefined;
}
