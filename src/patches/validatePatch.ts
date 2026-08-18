import { isFormattablePath, workflowsDirectory } from "../paths.js";

export type PatchValidation =
	{ files: string[]; valid: true } | { problem: string; valid: false };

export interface ValidatePatchOptions {
	maxBytes: number;
	maxFiles: number;
}

const forbiddenHeaders = [
	"Binary files ",
	"GIT binary patch",
	"copy from ",
	"deleted file mode ",
	"new file mode ",
	"new mode ",
	"old mode ",
	"rename from ",
	"rename to ",
];

const forbiddenModes = ["120000", "160000"];

export function validatePatch(
	patch: string,
	{ maxBytes, maxFiles }: ValidatePatchOptions,
): PatchValidation {
	if (!patch.trim()) {
		return { problem: "the patch is empty", valid: false };
	}

	const bytes = Buffer.byteLength(patch, "utf8");

	if (bytes > maxBytes) {
		return {
			problem: `the patch is ${bytes.toString()} bytes, over the ${maxBytes.toString()} byte limit`,
			valid: false,
		};
	}

	const files: string[] = [];

	for (const line of patch.split("\n")) {
		if (line.startsWith("diff --git ")) {
			const filePath = parseDiffHeaderPath(line);

			if (!filePath) {
				return {
					problem: `it contains a file header this action can't verify: ${JSON.stringify(line)}`,
					valid: false,
				};
			}

			if (!isFormattablePath(filePath)) {
				return {
					problem: filePath.startsWith(workflowsDirectory)
						? `it changes ${filePath}, and this action never writes to ${workflowsDirectory}`
						: `it changes a path this action doesn't consider safe: ${JSON.stringify(filePath)}`,
					valid: false,
				};
			}

			files.push(filePath);
			continue;
		}

		if (isContentLine(line)) {
			continue;
		}

		const forbidden = forbiddenHeaders.find((header) =>
			line.startsWith(header),
		);

		if (forbidden) {
			return {
				problem: `it does more than modify existing files: ${JSON.stringify(line)}`,
				valid: false,
			};
		}

		if (
			line.startsWith("index ") &&
			forbiddenModes.some((mode) => line.endsWith(` ${mode}`))
		) {
			return {
				problem: `it changes a symlink or submodule: ${JSON.stringify(line)}`,
				valid: false,
			};
		}
	}

	if (!files.length) {
		return { problem: "the patch contains no file changes", valid: false };
	}

	if (files.length > maxFiles) {
		return {
			problem: `the patch changes ${files.length.toString()} files, over the ${maxFiles.toString()} file limit`,
			valid: false,
		};
	}

	return { files, valid: true };
}

function isContentLine(line: string) {
	return (
		line.startsWith("+") ||
		line.startsWith("-") ||
		line.startsWith(" ") ||
		line.startsWith("@") ||
		line.startsWith("\\")
	);
}

// Git prints `diff --git a/path b/path` unquoted, so the two equal-length halves
// can be split by length: paths containing spaces are otherwise ambiguous.
function parseDiffHeaderPath(line: string) {
	const rest = line.slice("diff --git ".length);

	if (rest.startsWith('"') || (rest.length - 5) % 2 !== 0) {
		return undefined;
	}

	const length = (rest.length - 5) / 2;
	const before = rest.slice(0, length + 2);
	const after = rest.slice(length + 3);

	if (
		!before.startsWith("a/") ||
		!after.startsWith("b/") ||
		before.slice(2) !== after.slice(2)
	) {
		return undefined;
	}

	return before.slice(2);
}
