import type { FormatterName } from "formatly";

import { commentMarker, offerMarker } from "./markers.js";

export interface RenderOfferOptions {
	acceptYes: boolean;
	command: string;
	commentFooter?: string;
	commentHeader?: string;
	excludedWorkflowFiles: number;
	files: string[];
	formatter: FormatterName;
	maintainerEditsBlocked: boolean;
}

const formatterLinks: Record<FormatterName, string> = {
	biome: "[Biome](https://biomejs.dev/formatter)",
	deno: "[deno fmt](https://docs.deno.com/runtime/reference/cli/fmt)",
	dprint: "[dprint](https://dprint.dev)",
	oxfmt: "[oxfmt](https://oxc.rs)",
	prettier: "[Prettier](https://prettier.io)",
};

const maxListedFiles = 20;

export function renderOffer({
	acceptYes,
	command,
	commentFooter,
	commentHeader,
	excludedWorkflowFiles,
	files,
	formatter,
	maintainerEditsBlocked,
}: RenderOfferOptions) {
	const listed = files.slice(0, maxListedFiles);
	const remaining = files.length - listed.length;

	return [
		commentMarker,
		offerMarker,
		commentHeader,
		"### 🧼 Would you like me to format this pull request?",
		`This repository formats code with ${formatterLinks[formatter]}.`,
		`${files.length === 1 ? "One file" : `${files.length.toString()} files`} in this pull request ${files.length === 1 ? "isn't" : "aren't"} formatted the way it wants:`,
		listed.map((file) => `- \`${file}\``).join("\n") +
			(remaining ? `\n- ...and ${remaining.toString()} more` : ""),
		"You don't need to install anything or run any commands yourself.",
		[
			`Comment **\`${command}\`** on this pull request and I'll format those files, then push a single commit to this branch.`,
			acceptYes ? `A comment of just _yes_ works too.` : undefined,
		]
			.filter(Boolean)
			.join("\n"),
		maintainerEditsBlocked
			? [
					`> [!WARNING]`,
					`> This pull request comes from a fork with _Allow edits by maintainers_ turned off, so I won't be able to push to its branch.`,
					`> Turning that on in the pull request's sidebar will let me help.`,
				].join("\n")
			: undefined,
		excludedWorkflowFiles
			? `> [!NOTE]\n> ${excludedWorkflowFiles.toString()} workflow ${excludedWorkflowFiles === 1 ? "file" : "files"} also ${excludedWorkflowFiles === 1 ? "needs" : "need"} formatting. I never write to \`.github/workflows\`, so those will need a manual pass.`
			: undefined,
		commentFooter,
		"> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._",
	]
		.filter(Boolean)
		.join("\n\n");
}
