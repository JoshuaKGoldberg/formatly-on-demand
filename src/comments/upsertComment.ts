import * as core from "@actions/core";

import type { FormatlyGitHub } from "../github.js";

import { isFormatlyComment } from "./markers.js";

export interface UpsertCommentOptions {
	body: string;
	github: FormatlyGitHub;
	pullRequestNumber: number;
}

export async function findFormatlyComment({
	github,
	pullRequestNumber,
}: Omit<UpsertCommentOptions, "body">) {
	const comments = await github.listComments({ pullRequestNumber });

	return comments.find((comment) => isFormatlyComment(comment.body));
}

export async function upsertComment({
	body,
	github,
	pullRequestNumber,
}: UpsertCommentOptions) {
	const existing = await findFormatlyComment({ github, pullRequestNumber });

	if (existing) {
		core.info(`Updating comment ${existing.id.toString()}.`);

		await github.updateComment({ body, commentId: existing.id });

		return existing.id;
	}

	core.info("Creating a new comment.");

	const created = await github.createComment({ body, pullRequestNumber });

	return created.id;
}
