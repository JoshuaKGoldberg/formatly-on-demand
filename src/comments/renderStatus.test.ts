import { describe, expect, it } from "vitest";

import type { Status } from "./renderStatus.js";

import { renderStatus } from "./renderStatus.js";

const statuses: Status[] = [
	{ kind: "already-formatted" },
	{
		files: ["src/index.ts"],
		kind: "applied",
		sha: "0123456789abcdef0123456789abcdef01234567",
	},
	{ command: "/formatly", kind: "branch-moved" },
	{ kind: "maintainer-edits-blocked" },
	{ kind: "missing-push-token" },
	{ kind: "patch-rejected", problem: "the patch is empty" },
	{ kind: "push-failed" },
	{ kind: "resolved" },
];

describe(renderStatus, () => {
	it.each(statuses)(
		"renders a comment when given the $kind status",
		(status) => {
			expect(renderStatus({ status })).toMatchSnapshot();
		},
	);

	it("renders custom header and footer text when they are provided", () => {
		const actual = renderStatus({
			commentFooter: "_Questions? Ask in Discord._",
			commentHeader: "Hi from the Example team!",
			status: { kind: "resolved" },
		});

		expect(actual).toMatchSnapshot();
	});
});
