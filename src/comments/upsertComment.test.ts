import { describe, expect, it } from "vitest";

import { createFakeGitHub } from "../tests/createFakeGitHub.js";
import { commentMarker } from "./markers.js";
import { upsertComment } from "./upsertComment.js";

describe(upsertComment, () => {
	it("creates a comment when the pull request has no formatly comment", async () => {
		const github = createFakeGitHub({
			comments: [{ body: "Looks good to me!", id: 1 }],
		});

		const actual = await upsertComment({
			body: `${commentMarker}\n\nHello!`,
			github,
			pullRequestNumber: 7,
		});

		expect(actual).toBe(123);
		expect(github.createComment).toHaveBeenCalledWith({
			body: `${commentMarker}\n\nHello!`,
			pullRequestNumber: 7,
		});
		expect(github.updateComment).not.toHaveBeenCalled();
	});

	it("updates the existing comment when the pull request has a formatly comment", async () => {
		const github = createFakeGitHub({
			comments: [
				{ body: "Looks good to me!", id: 1 },
				{ body: `${commentMarker}\n\nOlder text.`, id: 2 },
			],
		});

		const actual = await upsertComment({
			body: `${commentMarker}\n\nNewer text.`,
			github,
			pullRequestNumber: 7,
		});

		expect(actual).toBe(2);
		expect(github.updateComment).toHaveBeenCalledWith({
			body: `${commentMarker}\n\nNewer text.`,
			commentId: 2,
		});
		expect(github.createComment).not.toHaveBeenCalled();
	});
});
