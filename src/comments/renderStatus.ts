import { commentMarker } from "./markers.js";

export interface RenderStatusOptions {
	commentFooter?: string;
	commentHeader?: string;
	status: Status;
}

export type Status =
	| { command: string; kind: "branch-moved" }
	| { files: string[]; kind: "applied"; sha: string }
	| { kind: "already-formatted" }
	| { kind: "maintainer-edits-blocked" }
	| { kind: "missing-push-token" }
	| { kind: "patch-rejected"; problem: string }
	| { kind: "push-failed" }
	| { kind: "resolved" };

export function renderStatus({
	commentFooter,
	commentHeader,
	status,
}: RenderStatusOptions) {
	return [
		commentMarker,
		commentHeader,
		renderBody(status),
		commentFooter,
		"> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._",
	]
		.filter(Boolean)
		.join("\n\n");
}

function renderBody(status: Status) {
	switch (status.kind) {
		case "already-formatted":
			return "### 🧼 Nothing to format\n\nThis pull request's files already match the repository's formatting. Thanks!";

		case "applied":
			return [
				"### 🧼 Formatted!",
				`I formatted ${status.files.length === 1 ? "one file" : `${status.files.length.toString()} files`} and pushed \`${status.sha.slice(0, 7)}\` to this branch.`,
				"If you have this branch checked out locally, pull before you commit again:",
				"```shell\ngit pull\n```",
			].join("\n\n");

		case "branch-moved":
			return `### 🧼 This branch moved\n\nNew commits landed while I was formatting, so I stopped rather than push over them. Comment \`${status.command}\` again and I'll start over from the latest commit.`;

		case "maintainer-edits-blocked":
			return "### 🧼 I can't push to this branch\n\nThis pull request comes from a fork with _Allow edits by maintainers_ turned off. Turning that on in the sidebar will let me push formatting here.";

		case "missing-push-token":
			return "### 🧼 I can't push to this branch\n\nFormatting pull requests from forks needs a token this repository hasn't configured. A maintainer will need to format this one by hand.";

		case "patch-rejected":
			return `### 🧼 I stopped before pushing\n\nThe formatting changes didn't pass this action's safety checks, so nothing was pushed: ${status.problem}.`;

		case "push-failed":
			return "### 🧼 I couldn't push to this branch\n\nThe push was rejected, so nothing changed here. A maintainer can check this workflow's logs for details.";

		case "resolved":
			return "### 🧼 Formatting looks good now\n\nNothing left for me to do here. Thanks!";
	}
}
