import * as core from "@actions/core";

import type { Status } from "../comments/renderStatus.js";
import type { FormatlyGitHub } from "../github.js";

import { isOfferComment } from "../comments/markers.js";
import { renderStatus } from "../comments/renderStatus.js";
import {
	findFormatlyComment,
	upsertComment,
} from "../comments/upsertComment.js";
import { isAllowedActor } from "../consent/isAllowedActor.js";
import { parseCommand } from "../consent/parseCommand.js";

export interface Resolution {
	files: string[];
	headRef: string;
	headRepository: string;
	headSha: string;
	reason?: string;
	shouldFormat: boolean;
}

export interface ResolveOptions {
	acceptYes: boolean;
	allowedAssociations: string[];
	association: string;
	body: string;
	command: string;
	commenter: string;
	commentFooter?: string;
	commentHeader?: string;
	commentId: number;
	github: FormatlyGitHub;
	pullRequestNumber: number;
	pushTokenAvailable: boolean;
}

const maxRequestedFiles = 3000;

export async function resolve({
	acceptYes,
	allowedAssociations,
	association,
	body,
	command,
	commenter,
	commentFooter,
	commentHeader,
	commentId,
	github,
	pullRequestNumber,
	pushTokenAvailable,
}: ResolveOptions): Promise<Resolution> {
	const kind = parseCommand({ acceptYes, body, command });

	if (!kind) {
		return skip("the comment doesn't ask for formatting");
	}

	const pullRequest = await github.getPullRequest({ pullRequestNumber });

	if (
		!isAllowedActor({
			allowedAssociations,
			association,
			commenter,
			pullRequestAuthor: pullRequest.author,
		})
	) {
		return skip(
			`${commenter} is neither the pull request's author nor a collaborator`,
		);
	}

	if (!pullRequest.open) {
		return skip("the pull request is closed");
	}

	if (kind === "yes") {
		const existing = await findFormatlyComment({ github, pullRequestNumber });

		if (!isOfferComment(existing?.body)) {
			return skip("no offer to format is waiting on this pull request");
		}
	}

	if (!pullRequest.headRepository) {
		return skip("the pull request's head repository is gone");
	}

	if (pullRequest.headRepository !== github.repository) {
		if (!pushTokenAvailable) {
			await postStatus({ kind: "missing-push-token" });
			return skip("no push token is configured for pull requests from forks");
		}

		if (!pullRequest.maintainerCanModify) {
			await postStatus({ kind: "maintainer-edits-blocked" });
			return skip("the fork doesn't allow edits by maintainers");
		}
	}

	await github.createReaction({ commentId, content: "eyes" });

	const files = await github.listChangedFiles({ pullRequestNumber });

	return {
		files: files.slice(0, maxRequestedFiles),
		headRef: pullRequest.headRef,
		headRepository: pullRequest.headRepository,
		headSha: pullRequest.headSha,
		shouldFormat: true,
	};

	async function postStatus(status: Status) {
		await upsertComment({
			body: renderStatus({ commentFooter, commentHeader, status }),
			github,
			pullRequestNumber,
		});
	}
}

function skip(reason: string): Resolution {
	core.info(`Not formatting: ${reason}.`);

	return {
		files: [],
		headRef: "",
		headRepository: "",
		headSha: "",
		reason,
		shouldFormat: false,
	};
}
