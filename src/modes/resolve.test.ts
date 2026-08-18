import { describe, expect, it } from "vitest";

import { commentMarker, offerMarker } from "../comments/markers.js";
import { createFakeGitHub } from "../tests/createFakeGitHub.js";
import { resolve } from "./resolve.js";

const options = {
	acceptYes: true,
	allowedAssociations: ["OWNER", "MEMBER", "COLLABORATOR"],
	association: "CONTRIBUTOR",
	body: "/formatly",
	command: "/formatly",
	commenter: "contributor",
	commentId: 42,
	pullRequestNumber: 7,
	pushTokenAvailable: true,
};

const offerComment = {
	body: `${commentMarker}\n${offerMarker}\n\nOffer text.`,
	id: 2,
};

describe(resolve, () => {
	it("resolves to formatting when the pull request's author asks", async () => {
		const github = createFakeGitHub({ files: ["src/index.ts"] });

		const actual = await resolve({ ...options, github });

		expect(actual).toEqual({
			files: ["src/index.ts"],
			headRef: "add-thing",
			headRepository: "owner/repo",
			headSha: "0123456789abcdef0123456789abcdef01234567",
			shouldFormat: true,
		});
		expect(github.createReaction).toHaveBeenCalledWith({
			commentId: 42,
			content: "eyes",
		});
	});

	it("resolves to formatting when a collaborator asks", async () => {
		const github = createFakeGitHub();

		const actual = await resolve({
			...options,
			association: "COLLABORATOR",
			commenter: "maintainer",
			github,
		});

		expect(actual.shouldFormat).toBe(true);
	});

	it("skips when the comment doesn't ask for formatting", async () => {
		const github = createFakeGitHub();

		const actual = await resolve({
			...options,
			body: "Could you take another look?",
			github,
		});

		expect(actual.reason).toBe("the comment doesn't ask for formatting");
		expect(github.createReaction).not.toHaveBeenCalled();
	});

	it("skips when an unrelated user asks", async () => {
		const github = createFakeGitHub();

		const actual = await resolve({ ...options, commenter: "passerby", github });

		expect(actual.reason).toBe(
			"passerby is neither the pull request's author nor a collaborator",
		);
		expect(github.createReaction).not.toHaveBeenCalled();
	});

	it("skips when the pull request is closed", async () => {
		const github = createFakeGitHub({ pullRequest: { open: false } });

		const actual = await resolve({ ...options, github });

		expect(actual.reason).toBe("the pull request is closed");
	});

	it("skips when yes arrives with no offer waiting", async () => {
		const github = createFakeGitHub();

		const actual = await resolve({ ...options, body: "yes", github });

		expect(actual.reason).toBe(
			"no offer to format is waiting on this pull request",
		);
	});

	it("resolves to formatting when yes arrives with an offer waiting", async () => {
		const github = createFakeGitHub({ comments: [offerComment] });

		const actual = await resolve({ ...options, body: "yes", github });

		expect(actual.shouldFormat).toBe(true);
	});

	it("explains when a fork pull request has no push token configured", async () => {
		const github = createFakeGitHub({
			comments: [offerComment],
			pullRequest: { headRepository: "contributor/repo" },
		});

		const actual = await resolve({
			...options,
			github,
			pushTokenAvailable: false,
		});

		expect(actual.shouldFormat).toBe(false);
		expect(github.updateComment).toHaveBeenCalledWith({
			body: expect.stringContaining("needs a token this repository hasn't"),
			commentId: 2,
		});
	});

	it("explains when a fork pull request blocks maintainer edits", async () => {
		const github = createFakeGitHub({
			comments: [offerComment],
			pullRequest: {
				headRepository: "contributor/repo",
				maintainerCanModify: false,
			},
		});

		const actual = await resolve({ ...options, github });

		expect(actual.shouldFormat).toBe(false);
		expect(github.updateComment).toHaveBeenCalledWith({
			body: expect.stringContaining("Allow edits by maintainers"),
			commentId: 2,
		});
	});

	it("skips when the head repository is gone", async () => {
		const github = createFakeGitHub({
			pullRequest: { headRepository: undefined },
		});

		const actual = await resolve({ ...options, github });

		expect(actual.reason).toBe("the pull request's head repository is gone");
	});
});
