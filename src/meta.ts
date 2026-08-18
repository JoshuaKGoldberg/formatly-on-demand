import type { FormatterName } from "formatly";

import type { DetectionMeta } from "./types.js";

import { isFormattablePath } from "./paths.js";

export const metaFileName = "meta.json";

export const patchFileName = "formatly.patch";

const formatterNames = new Set<string>([
	"biome",
	"deno",
	"dprint",
	"oxfmt",
	"prettier",
]);

const shaPattern = /^[\da-f]{40}$/;

// Detection runs in a job that executes pull request code, so everything it
// writes has to be re-verified before a job holding a token acts on it.
export function parseMeta(
	raw: string,
	{ maxFiles }: { maxFiles: number },
): DetectionMeta | undefined {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		return undefined;
	}

	if (typeof parsed !== "object" || parsed === null) {
		return undefined;
	}

	const {
		excludedWorkflowFiles,
		files,
		formatter,
		headSha,
		pullRequestNumber,
	} = parsed as Record<string, unknown>;

	if (typeof headSha !== "string" || !shaPattern.test(headSha)) {
		return undefined;
	}

	if (
		typeof pullRequestNumber !== "number" ||
		!Number.isInteger(pullRequestNumber) ||
		pullRequestNumber <= 0
	) {
		return undefined;
	}

	if (
		formatter !== null &&
		(typeof formatter !== "string" || !formatterNames.has(formatter))
	) {
		return undefined;
	}

	if (!Array.isArray(files)) {
		return undefined;
	}

	return {
		excludedWorkflowFiles:
			typeof excludedWorkflowFiles === "number" &&
			Number.isInteger(excludedWorkflowFiles) &&
			excludedWorkflowFiles >= 0
				? excludedWorkflowFiles
				: 0,
		files: files
			.filter(
				(file): file is string =>
					typeof file === "string" && isFormattablePath(file),
			)
			.slice(0, maxFiles),
		formatter: formatter as FormatterName | null,
		headSha,
		pullRequestNumber,
	};
}
