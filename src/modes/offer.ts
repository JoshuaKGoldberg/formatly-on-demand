import * as core from "@actions/core";

import type { FormatlyGitHub } from "../github.js";
import type { DetectionMeta } from "../types.js";

import { isOfferComment } from "../comments/markers.js";
import { renderOffer } from "../comments/renderOffer.js";
import { renderStatus } from "../comments/renderStatus.js";
import {
	findFormatlyComment,
	upsertComment,
} from "../comments/upsertComment.js";

export interface OfferOptions {
	acceptYes: boolean;
	command: string;
	commentFooter?: string;
	commentHeader?: string;
	expectedHeadSha?: string;
	github: FormatlyGitHub;
	meta: DetectionMeta;
}

export async function offer({
	acceptYes,
	command,
	commentFooter,
	commentHeader,
	expectedHeadSha,
	github,
	meta,
}: OfferOptions) {
	if (expectedHeadSha && meta.headSha !== expectedHeadSha) {
		core.warning(
			`Detection reported commit ${meta.headSha}, but its workflow ran on ${expectedHeadSha}.`,
		);
		return;
	}

	const pullRequestNumber = meta.pullRequestNumber;
	const pullRequest = await github.getPullRequest({ pullRequestNumber });

	if (!pullRequest.open) {
		core.info(`Pull request ${pullRequestNumber.toString()} is closed.`);
		return;
	}

	if (pullRequest.headSha !== meta.headSha) {
		core.info(
			`Pull request ${pullRequestNumber.toString()} has moved on from ${meta.headSha}.`,
		);
		return;
	}

	if (!meta.files.length || !meta.formatter) {
		const existing = await findFormatlyComment({ github, pullRequestNumber });

		if (!existing || !isOfferComment(existing.body)) {
			core.info("Nothing to format, and no offer to resolve.");
			return;
		}

		await github.updateComment({
			body: renderStatus({
				commentFooter,
				commentHeader,
				status: { kind: "resolved" },
			}),
			commentId: existing.id,
		});
		return;
	}

	await upsertComment({
		body: renderOffer({
			acceptYes,
			command,
			commentFooter,
			commentHeader,
			excludedWorkflowFiles: meta.excludedWorkflowFiles,
			files: meta.files,
			formatter: meta.formatter,
			maintainerEditsBlocked:
				pullRequest.headRepository !== github.repository &&
				!pullRequest.maintainerCanModify,
		}),
		github,
		pullRequestNumber,
	});
}
