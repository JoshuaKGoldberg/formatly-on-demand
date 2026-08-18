import * as core from "@actions/core";
import { context } from "@actions/github";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { Mode } from "../types.js";

import { metaFileName, parseMeta, patchFileName } from "../meta.js";
import { apply } from "../modes/apply.js";
import { detect } from "../modes/detect.js";
import { offer } from "../modes/offer.js";
import { resolve } from "../modes/resolve.js";
import { createGitHub } from "./createGitHub.js";

interface CommentPayload {
	author_association?: string;
	body?: string;
	id?: number;
	user?: { login?: string };
}

interface IssuePayload {
	number?: number;
	pull_request?: unknown;
}

interface PullRequestPayload {
	base?: { sha?: string };
	head?: { sha?: string };
	number?: number;
}

interface WorkflowRunPayload {
	head_sha?: string;
}

await runMode(core.getInput("mode", { required: true }) as Mode).catch(
	(error: unknown) => {
		core.setFailed(error instanceof Error ? error : String(error));
	},
);

function getFilesInput() {
	const raw = getOptionalInput("files");

	if (!raw) {
		return undefined;
	}

	const parsed: unknown = JSON.parse(raw);

	if (
		!Array.isArray(parsed) ||
		parsed.some((file) => typeof file !== "string")
	) {
		throw new Error("Input files must be a JSON array of strings.");
	}

	return parsed as string[];
}

function getGitHub() {
	return createGitHub({
		owner: context.repo.owner,
		repo: context.repo.repo,
		token: core.getInput("github-token", { required: true }),
	});
}

function getListInput(name: string) {
	return core
		.getInput(name)
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function getNumberInput(name: string) {
	const raw = core.getInput(name, { required: true });
	const value = Number(raw);

	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(
			`Input ${name} must be a positive integer, not ${JSON.stringify(raw)}.`,
		);
	}

	return value;
}

function getOptionalInput(name: string) {
	return core.getInput(name) || undefined;
}

function getOutputDirectory() {
	return (
		getOptionalInput("output-directory") ??
		path.join(process.env.RUNNER_TEMP ?? os.tmpdir(), "formatly-on-demand")
	);
}

function getWorkingDirectory() {
	return path.resolve(core.getInput("working-directory") || ".");
}

function missing(name: string): never {
	throw new Error(`This event didn't provide a ${name}.`);
}

async function runApply() {
	const comment = context.payload.comment as CommentPayload | undefined;

	const pushedSha = await apply({
		command: core.getInput("command"),
		commentFooter: getOptionalInput("comment-footer"),
		commentHeader: getOptionalInput("comment-header"),
		commentId: comment?.id,
		commitMessage: core.getInput("commit-message"),
		cwd: getWorkingDirectory(),
		github: getGitHub(),
		headRef: core.getInput("head-ref", { required: true }),
		headRepository: core.getInput("head-repository", { required: true }),
		headSha: core.getInput("head-sha", { required: true }),
		maxBytes: getNumberInput("max-patch-bytes"),
		maxFiles: getNumberInput("max-files"),
		patchPath:
			getOptionalInput("patch-path") ??
			path.join(getOutputDirectory(), patchFileName),
		pullRequestNumber: getNumberInput("pull-request-number"),
		pushToken:
			getOptionalInput("push-token") ??
			core.getInput("github-token", { required: true }),
	});

	if (pushedSha) {
		core.setOutput("pushed-sha", pushedSha);
	}
}

async function runDetect() {
	const pullRequest = context.payload.pull_request as
		PullRequestPayload | undefined;
	const outputDirectory = getOutputDirectory();

	const { meta, metaPath, patchPath } = await detect({
		baseSha: getOptionalInput("base-sha") ?? pullRequest?.base?.sha,
		cwd: getWorkingDirectory(),
		files: getFilesInput(),
		headSha:
			getOptionalInput("head-sha") ??
			pullRequest?.head?.sha ??
			missing("head-sha"),
		outputDirectory,
		pullRequestNumber:
			pullRequest?.number ?? getNumberInput("pull-request-number"),
	});

	core.setOutput("files", JSON.stringify(meta.files));
	core.setOutput("formatter", meta.formatter ?? "");
	core.setOutput("meta-path", metaPath);
	core.setOutput("needs-formatting", String(meta.files.length > 0));
	core.setOutput("output-directory", outputDirectory);
	core.setOutput("patch-path", patchPath);
}

async function runMode(mode: Mode) {
	switch (mode) {
		case "apply": {
			await runApply();
			return;
		}

		case "detect": {
			await runDetect();
			return;
		}

		case "offer": {
			await runOffer();
			return;
		}

		case "resolve": {
			await runResolve();
			return;
		}

		default:
			throw new Error(`Unknown mode: ${JSON.stringify(mode)}.`);
	}
}

async function runOffer() {
	const metaPath =
		getOptionalInput("meta-path") ??
		path.join(getOutputDirectory(), metaFileName);
	const workflowRun = context.payload.workflow_run as
		undefined | WorkflowRunPayload;

	const meta = parseMeta(await fs.readFile(metaPath, "utf8"), {
		maxFiles: getNumberInput("max-files"),
	});

	if (!meta) {
		core.warning(`${metaPath} didn't contain usable detection results.`);
		return;
	}

	await offer({
		acceptYes: core.getBooleanInput("accept-yes"),
		command: core.getInput("command"),
		commentFooter: getOptionalInput("comment-footer"),
		commentHeader: getOptionalInput("comment-header"),
		expectedHeadSha: workflowRun?.head_sha,
		github: getGitHub(),
		meta,
	});
}

async function runResolve() {
	const comment = context.payload.comment as CommentPayload | undefined;
	const issue = context.payload.issue as IssuePayload | undefined;

	if (!comment || !issue?.pull_request) {
		core.info("This comment isn't on a pull request.");
		core.setOutput("should-format", "false");
		return;
	}

	const resolution = await resolve({
		acceptYes: core.getBooleanInput("accept-yes"),
		allowedAssociations: getListInput("allowed-associations"),
		association: comment.author_association ?? "NONE",
		body: comment.body ?? "",
		command: core.getInput("command"),
		commenter: comment.user?.login ?? "",
		commentFooter: getOptionalInput("comment-footer"),
		commentHeader: getOptionalInput("comment-header"),
		commentId: comment.id ?? missing("comment id"),
		github: getGitHub(),
		pullRequestNumber: issue.number ?? missing("pull request number"),
		pushTokenAvailable:
			core.getBooleanInput("push-token-available") ||
			!!getOptionalInput("push-token"),
	});

	core.setOutput("files", JSON.stringify(resolution.files));
	core.setOutput("head-ref", resolution.headRef);
	core.setOutput("head-repository", resolution.headRepository);
	core.setOutput("head-sha", resolution.headSha);
	core.setOutput("pull-request-number", String(issue.number));
	core.setOutput("should-format", String(resolution.shouldFormat));
	core.setOutput("skip-reason", resolution.reason ?? "");
}
