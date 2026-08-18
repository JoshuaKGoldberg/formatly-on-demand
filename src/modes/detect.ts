import * as core from "@actions/core";
import { formatly } from "formatly";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { DetectionMeta } from "../types.js";

import {
	createPatch,
	getChangedFiles,
	getDirtyFiles,
	restoreFiles,
} from "../git/repository.js";
import { metaFileName, patchFileName } from "../meta.js";
import { isFormattablePath, workflowsDirectory } from "../paths.js";

export interface DetectOptions {
	baseSha?: string;
	cwd: string;
	files?: string[];
	headSha: string;
	outputDirectory: string;
	pullRequestNumber: number;
}

export interface DetectResult {
	meta: DetectionMeta;
	metaPath: string;
	patchPath: string;
}

export async function detect({
	baseSha,
	cwd,
	files,
	headSha,
	outputDirectory,
	pullRequestNumber,
}: DetectOptions): Promise<DetectResult> {
	const requested =
		files ?? (baseSha ? await getChangedFiles({ baseSha, cwd }) : []);

	const excludedWorkflowFiles = requested.filter((file) =>
		file.startsWith(workflowsDirectory),
	).length;

	const formattable = requested.filter(
		(file) => isFormattablePath(file) && existsSync(path.join(cwd, file)),
	);

	core.info(
		`Checking formatting of ${formattable.length.toString()} of ${requested.length.toString()} changed files.`,
	);

	if (!formattable.length) {
		return await write({
			excludedWorkflowFiles,
			files: [],
			formatter: null,
			headSha,
			outputDirectory,
			patch: "",
			pullRequestNumber,
		});
	}

	// Installing dependencies can rewrite tracked files such as lockfiles.
	// Those changes aren't formatting, so they shouldn't end up in the patch.
	const preexisting = await getDirtyFiles({ cwd, files: formattable });

	if (preexisting.length) {
		core.info(
			`Restoring ${preexisting.length.toString()} files changed before formatting.`,
		);
		await restoreFiles({ cwd, files: preexisting });
	}

	// formatly runs Prettier in-process, which resolves patterns against
	// process.cwd() rather than the cwd it's given.
	if (cwd !== process.cwd()) {
		process.chdir(cwd);
	}

	const report = await formatly(formattable, { cwd });

	if (!report.ran) {
		core.info(`Not offering to format: ${report.message}`);

		return await write({
			excludedWorkflowFiles,
			files: [],
			formatter: null,
			headSha,
			outputDirectory,
			patch: "",
			pullRequestNumber,
		});
	}

	if (report.result.runner === "child_process" && report.result.code) {
		core.info(
			`${report.formatter.name} exited with code ${report.result.code.toString()}.`,
		);
	}

	const unformatted = await getDirtyFiles({ cwd, files: formattable });

	return await write({
		excludedWorkflowFiles,
		files: unformatted,
		formatter: report.formatter.name,
		headSha,
		outputDirectory,
		patch: unformatted.length
			? await createPatch({ cwd, files: unformatted })
			: "",
		pullRequestNumber,
	});
}

async function write({
	outputDirectory,
	patch,
	...meta
}: DetectionMeta & {
	outputDirectory: string;
	patch: string;
}): Promise<DetectResult> {
	const metaPath = path.join(outputDirectory, metaFileName);
	const patchPath = path.join(outputDirectory, patchFileName);

	await fs.mkdir(outputDirectory, { recursive: true });
	await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
	await fs.writeFile(patchPath, patch);

	core.info(`Wrote ${metaPath} and ${patchPath}.`);

	return { meta, metaPath, patchPath };
}
