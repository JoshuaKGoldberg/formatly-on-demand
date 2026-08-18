import { describe, expect, it } from "vitest";

import type { DetectionMeta } from "../types.js";

import { commentMarker, offerMarker } from "../comments/markers.js";
import { createFakeGitHub } from "../tests/createFakeGitHub.js";
import { offer } from "./offer.js";

const headSha = "0123456789abcdef0123456789abcdef01234567";

const meta: DetectionMeta = {
	excludedWorkflowFiles: 0,
	files: ["src/index.ts"],
	formatter: "prettier",
	headSha,
	pullRequestNumber: 7,
};

const options = {
	acceptYes: true,
	command: "/formatly",
	expectedHeadSha: headSha,
};

describe(offer, () => {
	it("posts an offer when files need formatting", async () => {
		const github = createFakeGitHub();

		await offer({ ...options, github, meta });

		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("Would you like me to format"),
			pullRequestNumber: 7,
		});
	});

	it("posts a warning when the fork blocks maintainer edits", async () => {
		const github = createFakeGitHub({
			pullRequest: {
				headRepository: "contributor/repo",
				maintainerCanModify: false,
			},
		});

		await offer({ ...options, github, meta });

		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("Allow edits by maintainers"),
			pullRequestNumber: 7,
		});
	});

	it("posts nothing when detection ran on a different commit than its workflow", async () => {
		const github = createFakeGitHub();

		await offer({
			...options,
			expectedHeadSha: "9999999999999999999999999999999999999999",
			github,
			meta,
		});

		expect(github.getPullRequest).not.toHaveBeenCalled();
		expect(github.createComment).not.toHaveBeenCalled();
	});

	it("posts nothing when the pull request is closed", async () => {
		const github = createFakeGitHub({ pullRequest: { open: false } });

		await offer({ ...options, github, meta });

		expect(github.createComment).not.toHaveBeenCalled();
	});

	it("posts nothing when the pull request has new commits", async () => {
		const github = createFakeGitHub({
			pullRequest: { headSha: "1111111111111111111111111111111111111111" },
		});

		await offer({ ...options, github, meta });

		expect(github.createComment).not.toHaveBeenCalled();
	});

	it("resolves an existing offer when nothing needs formatting", async () => {
		const github = createFakeGitHub({
			comments: [
				{ body: `${commentMarker}\n${offerMarker}\n\nOffer text.`, id: 2 },
			],
		});

		await offer({
			...options,
			github,
			meta: { ...meta, files: [], formatter: null },
		});

		expect(github.updateComment).toHaveBeenCalledWith({
			body: expect.stringContaining("Formatting looks good now"),
			commentId: 2,
		});
	});

	it("posts nothing when nothing needs formatting and no offer exists", async () => {
		const github = createFakeGitHub();

		await offer({
			...options,
			github,
			meta: { ...meta, files: [], formatter: null },
		});

		expect(github.createComment).not.toHaveBeenCalled();
		expect(github.updateComment).not.toHaveBeenCalled();
	});
});
