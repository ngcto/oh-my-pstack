import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ROLES } from "../extensions/roles.ts";

const ROOT = resolve(import.meta.dir, "..");
const problems: string[] = [];
const BUNDLED_AGENTS = new Set(["scout", "reviewer", "security-reviewer", "task", "sonic"]);

function fail(file: string, message: string): void {
	problems.push(`${relative(ROOT, file)}: ${message}`);
}

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (name === "node_modules" || name === ".git" || name === ".work") continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else out.push(path);
	}
	return out;
}

type Fields = Record<string, unknown>;

function frontmatter(file: string, text: string): Fields | null {
	const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text.replace(/\r\n/g, "\n"));
	if (!match) return null;
	try {
		const parsed = Bun.YAML.parse(match[1] as string);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Fields;
	} catch (error) {
		fail(file, `invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`);
		return {};
	}
	return null;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const files = walk(ROOT).filter(path => !path.includes(`${ROOT}/docs/guide/images`));
const skillDirs = readdirSync(join(ROOT, "skills")).filter(name => statSync(join(ROOT, "skills", name)).isDirectory());
const agentNames = readdirSync(join(ROOT, "agents"))
	.filter(name => name.endsWith(".md"))
	.map(name => name.slice(0, -3));

// 1. Skills and agents: frontmatter shape.
const CURSOR_KEYS = ["mode", "icon", "color", "reminder"];
for (const dir of skillDirs) {
	const file = join(ROOT, "skills", dir, "SKILL.md");
	if (!existsSync(file)) {
		fail(join(ROOT, "skills", dir), "skill directory has no SKILL.md");
		continue;
	}
	const fields = frontmatter(file, readFileSync(file, "utf8"));
	if (!fields) fail(file, "missing frontmatter");
	else if (Object.keys(fields).length > 0) {
		if (fields.name !== dir) fail(file, `name "${fields.name}" must equal directory "${dir}"`);
		if (text(fields.description).trim() === "") fail(file, "missing description");
		for (const key of [...CURSOR_KEYS, "paths"]) if (key in fields) fail(file, `non-OMP frontmatter key "${key}"`);
	}
}
for (const name of agentNames) {
	const file = join(ROOT, "agents", `${name}.md`);
	const fields = frontmatter(file, readFileSync(file, "utf8"));
	if (!fields) fail(file, "missing frontmatter");
	else if (Object.keys(fields).length > 0) {
		if (fields.name !== name) fail(file, `name "${fields.name}" must equal file name "${name}"`);
		if (text(fields.description).trim() === "") fail(file, "missing description");
		if (!/^@[a-z]+(:[a-z]+)?$/.test(text(fields.model))) fail(file, `model must be a role alias like "@slow", got "${text(fields.model)}"`);
		const tools = text(fields.tools).split(",").map(tool => tool.trim());
		if (tools.some(tool => tool === "edit" || tool === "write") && name !== "poteto-agent")
			fail(file, `review/read-only agent must not have ${tools.filter(tool => tool === "edit" || tool === "write").join("/")}`);
		for (const skill of text(fields["autoload-skills"]).split(",").map(part => part.trim()).filter(Boolean))
			if (!skillDirs.includes(skill)) fail(file, `autoload-skills names unknown skill "${skill}"`);
	}
}

// 2. Relative markdown links and backticked relative paths must resolve.
const LINK = /\]\((?!https?:|mailto:|#)([^)#\s]+)(?:#[^)]*)?\)/g;
for (const file of files.filter(path => path.endsWith(".md"))) {
	const text = readFileSync(file, "utf8");
	for (const match of text.matchAll(LINK)) {
		if (match[1] === "url") continue;
		const target = resolve(dirname(file), match[1] as string);
		if (!existsSync(target)) fail(file, `broken link ${match[1]}`);
	}
}

// 3. skill:// references must name a real skill (and a real file when a path follows).
for (const file of files.filter(path => path.endsWith(".md") || path.endsWith(".ts"))) {
	if (file.endsWith("lint.ts")) continue;
	const text = readFileSync(file, "utf8");
	for (const match of text.matchAll(/skill:\/\/([a-z0-9][a-z0-9-]*)((?:\/[A-Za-z0-9_.-]+)*)/g)) {
		const [, name, rest] = match;
		if (!skillDirs.includes(name as string)) fail(file, `skill://${name} does not exist`);
		else if (rest && /\.[a-z]+$/.test(rest) && !existsSync(join(ROOT, "skills", name as string, rest)))
			fail(file, `skill://${name}${rest} does not exist`);
	}
}

// 3b. Prose references to skills and agents must name something that exists.
const SKILL_WORDS = new Set(["this", "that", "same", "matching", "control", "mode", "verify", "project-local", "generated", "routed", "leaf", "principle"]);
for (const file of files.filter(path => path.endsWith(".md") && !path.includes("/node_modules/"))) {
	const body = readFileSync(file, "utf8");
	for (const match of body.matchAll(/(?:the|a|its|run|use|invoke)\s+(?:\*\*|`)([a-z][a-z0-9-]+)(?:\*\*|`)\s+skill\b/g)) {
		const name = match[1] as string;
		if (SKILL_WORDS.has(name) || skillDirs.includes(name)) continue;
		if (file.includes("/create-verification-skill/") || file.includes("/maintain-verification-skill/")) continue;
		fail(file, `prose names skill "${name}" which does not exist`);
	}
	for (const match of body.matchAll(/(?:agent|subagent)\s+`([a-z][a-z0-9-]+)`/g)) {
		const name = match[1] as string;
		if (!agentNames.includes(name) && !BUNDLED_AGENTS.has(name)) fail(file, `prose names agent "${name}" which does not exist`);
	}
}

// 3c. Review-shaped playbooks must route through thermos.
const MUST_MENTION_THERMOS = ["opening-a-pr", "babysit", "shipping", "autopilot-full", "autopilot-stack", "orchestrate", "multi-phase-plan", "feature", "bug-fix", "refactoring", "perf-issue", "hillclimb", "authoring-a-skill"];
for (const name of MUST_MENTION_THERMOS) {
	const file = join(ROOT, "skills", "poteto-mode", "playbooks", `${name}.md`);
	if (!existsSync(file) || !/thermos/i.test(readFileSync(file, "utf8"))) fail(file, "review-shaped playbook does not mention thermos");
}

// 4. Banned strings in everything the plugin ships (docs/guide included).
const BANNED: Array<[RegExp, string]> = [
	[/subagent_type|run_in_background|is_background|AskQuestion|generalPurpose/, "Cursor tool vocabulary"],
	[/\bgrok-|claude-opus|gpt-5|\bsol-max\b/i, "vendor model slug"],
	[/graphite/i, "Graphite"],
	[/`gt`|`gt |\bgt (sync|restack|log|info|submit|create|track|modify)\b|\bgt\b CLI/, "gt CLI"],
	[/origin pr\b|command -v origin|\[origin\]|`origin` (cli|forge)|\bOrigin (CLI|forge)\b|\borigin\/cli\b/i, "Origin CLI"],
	[/\b(glab|GitLab)\b|\bMR\b/, "non-GitHub forge"],
	[/\bcloud[- ]agent\b|\bthis chat\b|\bnew chat\b|\bprivate chats?\b|\bcoordinator chat\b/i, "Cursor-sense chat wording"],
	[/\/bro\b|skills\/bro\b/, "/bro"],
	[/(?<![A-Za-z])cursor/i, "Cursor"],
	[/\bTask (tool|call)s?\b/, 'say "task tool"'],
	[/[\u2013\u2014]/, "long dash"],
];
const ATTRIBUTION = /^Adapted from cursor-team-kit \(MIT\)\.?$/m;
// watch-pr detects review bots by their real logins and markers, so the word is data there.
const BANNED_EXEMPT = [
	/LICENSE/,
	/THIRD_PARTY_NOTICES\.md$/,
	/CHANGELOG\.md$/,
	new RegExp(`^${ROOT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/README\\.md$`),
	/\/scripts\/lint\.ts$/,
	/\/package\.json$/,
	/bun\.lock$/,
	/\/skills\/poteto-mode\/scripts\/watch-pr\//,
];
for (const file of files) {
	if (BANNED_EXEMPT.some(pattern => pattern.test(file))) continue;
	if (!/\.(md|ts|mjs|sh|json|tsv|yaml|yml)$/.test(file) || file.includes("/node_modules/")) continue;
	const text = readFileSync(file, "utf8").replace(ATTRIBUTION, "");
	for (const [pattern, label] of BANNED) {
		const hit = pattern.exec(text);
		if (hit) fail(file, `${label}: "${hit[0]}"`);
	}
}

// 5. The roles table must mirror extensions/roles.ts exactly.
const rolesDoc = join(ROOT, "skills", "setup-pstack", "references", "roles.md");
if (!existsSync(rolesDoc)) fail(rolesDoc, "missing");
else {
	const rows = readFileSync(rolesDoc, "utf8")
		.split("\n")
		.filter(line => /^\|\s*[a-z-]+\s*\|\s*(single|panel)\s*\|/.test(line))
		.map(line => line.split("|").map(cell => cell.trim().replace(/`/g, "")));
	const doc = rows.map(cells => `${cells[1]}:${cells[2]}:${cells[3]}`);
	const code = ROLES.map(role => `${role.name}:${role.kind}:${role.defaults.join(", ")}`);
	if (JSON.stringify(doc) !== JSON.stringify(code)) fail(rolesDoc, `roles table differs from extensions/roles.ts\n  doc : ${doc.join(" | ")}\n  code: ${code.join(" | ")}`);
}

// 6. Required and removed pieces.
for (const name of ["principle-tests-pay-rent", "principle-small-door-big-room", "thermos", "thermo-nuclear-review", "thermo-nuclear-code-quality-review", "deslop", "control-cli", "control-ui", "stacked-prs"]) {
	if (!skillDirs.includes(name)) fail(join(ROOT, "skills", name), "required skill missing");
}
for (const name of ["bro", "make-bot-ui"]) {
	if (skillDirs.includes(name)) fail(join(ROOT, "skills", name), "must not ship");
}
for (const file of files) if (/SOURCE-/.test(file)) fail(file, "raw upstream source copy must be removed");

if (problems.length > 0) {
	console.error(`${problems.length} problem(s)\n${problems.map(problem => `  ${problem}`).join("\n")}`);
	process.exit(1);
}
console.log(`lint ok: ${skillDirs.length} skills, ${agentNames.length} agents, ${files.length} files`);
