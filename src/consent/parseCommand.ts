export type CommandKind = "command" | "yes";

export interface ParseCommandOptions {
	acceptYes: boolean;
	body: string;
	command: string;
}

const yesPhrases = new Set(["+1", ":+1:", "👍", "do it", "yes", "yes please"]);

export function parseCommand({
	acceptYes,
	body,
	command,
}: ParseCommandOptions): CommandKind | undefined {
	const normalizedCommand = normalize(command);

	for (const line of quotableLines(body)) {
		const normalized = normalize(line);

		if (normalized === normalizedCommand) {
			return "command";
		}

		if (acceptYes && yesPhrases.has(normalized)) {
			return "yes";
		}
	}

	return undefined;
}

function normalize(line: string) {
	return line
		.trim()
		.replaceAll(/^`+|`+$/g, "")
		.replaceAll(/[!.?]+$/g, "")
		.replaceAll(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

// Lines inside quotes and code fences are usually someone repeating these
// instructions, not asking for them to run.
function* quotableLines(body: string) {
	let fenced = false;

	for (const line of body.split("\n")) {
		const trimmed = line.trim();

		if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
			fenced = !fenced;
			continue;
		}

		if (!fenced && !trimmed.startsWith(">")) {
			yield line;
		}
	}
}
