import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface SkillCommand {
	readonly name: string;
	readonly description: string;
}

/** `poteto-mode` is its own sticky command; principles are reference leaves that skills read by name. */
export function isCommandSkill(name: string): boolean {
	return name !== "poteto-mode" && !name.startsWith("principle-");
}

export function parseDescription(skillText: string): string {
	const raw = /^description:\s*(.+)$/m.exec(skillText)?.[1]?.trim() ?? "";
	const text = raw.replace(/^"|"$/g, "").replace(/\\"/g, '"');
	const sentence = /^(.+?[.!?])(\s|$)/.exec(text)?.[1] ?? text;
	return sentence.length > 140 ? `${sentence.slice(0, 137)}...` : sentence;
}

export function discoverSkillCommands(skillsDir: string): SkillCommand[] {
	if (!existsSync(skillsDir)) return [];
	return readdirSync(skillsDir)
		.filter(isCommandSkill)
		.sort()
		.flatMap(name => {
			const file = join(skillsDir, name, "SKILL.md");
			if (!existsSync(file)) return [];
			return [{ name, description: parseDescription(readFileSync(file, "utf8")) }];
		});
}

export function skillPrompt(name: string, args: string): string {
	const task = args.trim();
	return task === "" ? `Read skill://${name} in full and follow it.` : `Read skill://${name} in full and follow it.\n\n${task}`;
}
