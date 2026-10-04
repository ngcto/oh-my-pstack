export const MODE_ENTRY = "pstack-mode";

export type ModeAction = "on" | "off" | "status";

export interface ModeRequest {
	readonly action: ModeAction;
	readonly task: string;
}

const OFF_WORDS = new Set(["off", "stop", "disable", "exit"]);
const STATUS_WORDS = new Set(["status", "?"]);

/** `/poteto-mode`, `/poteto-mode off`, `/poteto-mode status`, `/poteto-mode fix the scroll drift`. */
export function parseModeArgs(args: string): ModeRequest {
	const text = args.trim();
	const head = text.split(/\s+/, 1)[0]?.toLowerCase() ?? "";
	if (text === "") return { action: "on", task: "" };
	if (OFF_WORDS.has(head) && text.length === head.length) return { action: "off", task: "" };
	if (STATUS_WORDS.has(head) && text.length === head.length) return { action: "status", task: "" };
	return { action: "on", task: text };
}

export interface ModeEntry {
	readonly type: string;
	readonly customType?: string;
	readonly data?: unknown;
}

/** The newest persisted mode flag on the current branch wins. */
export function restoreMode(entries: readonly ModeEntry[]): boolean {
	for (let index = entries.length - 1; index >= 0; index--) {
		const entry = entries[index];
		if (entry?.type !== "custom" || entry.customType !== MODE_ENTRY) continue;
		const data = entry.data as { active?: unknown } | undefined;
		return data?.active === true;
	}
	return false;
}

export const MODE_REMINDER = [
	"poteto-mode is on for this session (set with /poteto-mode, cleared with /poteto-mode off).",
	"New task: if a playbook matches or the work needs rigor, follow skill://poteto-mode and its playbooks. Casual turn or the user opted out: do not apply it.",
	"Reviews go through the thermos skill; stacked work goes through the stacked-prs skill.",
].join(" ");

export function activationPrompt(task: string): string {
	const lead =
		"Poteto mode is on. Read skill://poteto-mode in full, including its principles index, then match the task to a playbook and open the todo list from that playbook's steps.";
	return task === "" ? `${lead} Wait for the task.` : `${lead}\n\nTask: ${task}`;
}
