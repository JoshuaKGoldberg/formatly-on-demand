import type { GitOptions } from "./runGit.js";

import { runGit, tryGit } from "./runGit.js";

export interface CommitOptions extends GitOptions {
	files: string[];
	message: string;
}

export interface PushOptions extends GitOptions {
	headRef: string;
	remoteUrl: string;
	token: string;
}

const committerEmail = "41898282+github-actions[bot]@users.noreply.github.com";

const committerName = "github-actions[bot]";

export async function applyPatch({
	cwd,
	patchPath,
}: GitOptions & { patchPath: string }) {
	const checked = await tryGit(["apply", "--check", "--", patchPath], { cwd });

	if (checked.code) {
		return checked.stderr;
	}

	const applied = await tryGit(["apply", "--", patchPath], { cwd });

	return applied.code ? applied.stderr : undefined;
}

export async function commitFiles({ cwd, files, message }: CommitOptions) {
	await runGit(["add", "--", ...files], { cwd });
	await runGit(
		[
			"-c",
			"core.hooksPath=/dev/null",
			"-c",
			`user.email=${committerEmail}`,
			"-c",
			`user.name=${committerName}`,
			"commit",
			"--no-verify",
			"--message",
			message,
		],
		{ cwd },
	);

	return await getHeadSha({ cwd });
}

export async function createPatch({
	cwd,
	files,
}: GitOptions & { files: string[] }) {
	return await runGit(["diff", "--no-color", "--", ...files], { cwd });
}

export async function getChangedFiles({
	baseSha,
	cwd,
}: GitOptions & { baseSha: string }) {
	return toLines(
		await runGit(["diff", "--name-only", "--diff-filter=d", baseSha, "HEAD"], {
			cwd,
		}),
	);
}

export async function getDirtyFiles({
	cwd,
	files,
}: GitOptions & { files: string[] }) {
	return toLines(
		await runGit(["diff", "--name-only", "--", ...files], { cwd }),
	);
}

export async function getHeadSha({ cwd }: GitOptions) {
	return (await runGit(["rev-parse", "HEAD"], { cwd })).trim();
}

export async function pushBranch({
	cwd,
	headRef,
	remoteUrl,
	token,
}: PushOptions) {
	// The token goes in a header rather than the remote URL so that git never
	// prints it, including in the errors from a rejected push.
	const authorization = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;

	return await tryGit(
		[
			"-c",
			`http.https://github.com/.extraheader=${authorization}`,
			"push",
			remoteUrl,
			`HEAD:refs/heads/${headRef}`,
		],
		{ cwd },
	);
}

export async function restoreFiles({
	cwd,
	files,
}: GitOptions & { files: string[] }) {
	await runGit(["checkout", "--", ...files], { cwd });
}

function toLines(stdout: string) {
	return stdout
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}
