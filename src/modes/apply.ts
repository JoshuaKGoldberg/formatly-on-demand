import * as core from "@actions/core";
import fs from "node:fs/promises";

import type { Status } from "../comments/renderStatus.js";
import type { FormatlyGitHub } from "../github.js";

import { renderStatus } from "../comments/renderStatus.js";
import { upsertComment } from "../comments/upsertComment.js";
import { applyPatch, commitFiles, pushBranch } from "../git/repository.js";
import { validatePatch } from "../patches/validatePatch.js";

export interface ApplyOptions {
	command: string;
	commentFooter?: string;
	commentHeader?: string;
	commentId?: number;
	commitMessage: string;
	cwd: string;
	github: FormatlyGitHub;
	headRef: string;
	headRepository: string;
	headSha: string;
	maxBytes: number;
	maxFiles: number;
	patchPath: string;
	pullRequestNumber: number;
	pushToken: string;
}

export async function apply({
	command,
	commentFooter,
	commentHeader,
	commentId,
	commitMessage,
	cwd,
	github,
	headRef,
	headRepository,
	headSha,
	maxBytes,
	maxFiles,
	patchPath,
	pullRequestNumber,
	pushToken,
}: ApplyOptions) {
	const patch = await readPatch(patchPath);

	if (!patch?.trim()) {
		await postStatus({ kind: "already-formatted" });
		return;
	}

	const validation = validatePatch(patch, { maxBytes, maxFiles });

	if (!validation.valid) {
		core.warning(`Refusing to apply the patch: ${validation.problem}.`);
		await postStatus({ kind: "patch-rejected", problem: validation.problem });
		return;
	}

	const pullRequest = await github.getPullRequest({ pullRequestNumber });

	if (!pullRequest.open) {
		core.info("The pull request closed while formatting ran.");
		return;
	}

	if (pullRequest.headSha !== headSha) {
		await postStatus({ command, kind: "branch-moved" });
		return;
	}

	if (
		pullRequest.headRepository !== github.repository &&
		!pullRequest.maintainerCanModify
	) {
		await postStatus({ kind: "maintainer-edits-blocked" });
		return;
	}

	const problem = await applyPatch({ cwd, patchPath });

	if (problem) {
		core.warning(problem);
		await postStatus({
			kind: "patch-rejected",
			problem: "it no longer applies to this branch",
		});
		return;
	}

	const sha = await commitFiles({
		cwd,
		files: validation.files,
		message: commitMessage,
	});

	core.setSecret(pushToken);

	const pushed = await pushBranch({
		cwd,
		headRef,
		remoteUrl: `https://github.com/${headRepository}.git`,
		token: pushToken,
	});

	if (pushed.code) {
		core.warning(pushed.stderr);
		await postStatus({ kind: "push-failed" });
		return;
	}

	await postStatus({ files: validation.files, kind: "applied", sha });

	if (commentId) {
		await github.createReaction({ commentId, content: "+1" });
	}

	return sha;

	async function postStatus(status: Status) {
		await upsertComment({
			body: renderStatus({ commentFooter, commentHeader, status }),
			github,
			pullRequestNumber,
		});
	}
}

async function readPatch(patchPath: string) {
	try {
		return await fs.readFile(patchPath, "utf8");
	} catch {
		core.info(`No patch found at ${patchPath}.`);
		return undefined;
	}
}
