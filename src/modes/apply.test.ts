import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeGitHub } from "../tests/createFakeGitHub.js";
import { apply } from "./apply.js";

const mockApplyPatch = vi.fn();
const mockCommitFiles = vi.fn();
const mockPushBranch = vi.fn();

vi.mock("../git/repository.js", () => ({
	get applyPatch() {
		return mockApplyPatch;
	},
	get commitFiles() {
		return mockCommitFiles;
	},
	get pushBranch() {
		return mockPushBranch;
	},
}));

const headSha = "0123456789abcdef0123456789abcdef01234567";

const pushedSha = "89abcdef0123456789abcdef0123456789abcdef";

const validPatch = [
	"diff --git a/src/index.ts b/src/index.ts",
	"index 1234567..89abcde 100644",
	"--- a/src/index.ts",
	"+++ b/src/index.ts",
	"@@ -1 +1 @@",
	"-const value = {a:1}",
	"+const value = { a: 1 };",
	"",
].join("\n");

let directory: string;

function optionsFor(patchPath: string) {
	return {
		command: "/formatly",
		commentId: 42,
		commitMessage: "chore: apply formatly formatting",
		cwd: directory,
		headRef: "add-thing",
		headRepository: "contributor/repo",
		headSha,
		maxBytes: 1000000,
		maxFiles: 200,
		patchPath,
		pullRequestNumber: 7,
		pushToken: "push-token",
	};
}

async function writePatch(contents: string) {
	const patchPath = path.join(directory, "formatly.patch");

	await fs.writeFile(patchPath, contents);

	return patchPath;
}

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), "formatly-on-demand-"));
	mockApplyPatch.mockResolvedValue(undefined);
	mockCommitFiles.mockResolvedValue(pushedSha);
	mockPushBranch.mockResolvedValue({ code: 0, stderr: "", stdout: "" });
});

describe(apply, () => {
	it("commits, pushes, and reports when the patch applies", async () => {
		const github = createFakeGitHub({
			pullRequest: { headRepository: "contributor/repo" },
		});
		const patchPath = await writePatch(validPatch);

		await apply({ ...optionsFor(patchPath), github });

		expect(mockCommitFiles).toHaveBeenCalledWith({
			cwd: directory,
			files: ["src/index.ts"],
			message: "chore: apply formatly formatting",
		});
		expect(mockPushBranch).toHaveBeenCalledWith({
			cwd: directory,
			headRef: "add-thing",
			remoteUrl: "https://github.com/contributor/repo.git",
			token: "push-token",
		});
		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("Formatted!"),
			pullRequestNumber: 7,
		});
		expect(github.createReaction).toHaveBeenCalledWith({
			commentId: 42,
			content: "+1",
		});
	});

	it("reports nothing to format when the patch file is missing", async () => {
		const github = createFakeGitHub();

		await apply({
			...optionsFor(path.join(directory, "absent.patch")),
			github,
		});

		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("Nothing to format"),
			pullRequestNumber: 7,
		});
		expect(mockApplyPatch).not.toHaveBeenCalled();
	});

	it("refuses the patch when it changes a workflow file", async () => {
		const github = createFakeGitHub();
		const patchPath = await writePatch(
			validPatch.replaceAll("src/index.ts", ".github/workflows/ci.yaml"),
		);

		await apply({ ...optionsFor(patchPath), github });

		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("never writes to .github/workflows/"),
			pullRequestNumber: 7,
		});
		expect(mockApplyPatch).not.toHaveBeenCalled();
	});

	it("reports the branch moved when the head commit changed", async () => {
		const github = createFakeGitHub({
			pullRequest: { headSha: "1111111111111111111111111111111111111111" },
		});
		const patchPath = await writePatch(validPatch);

		await apply({ ...optionsFor(patchPath), github });

		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("This branch moved"),
			pullRequestNumber: 7,
		});
		expect(mockApplyPatch).not.toHaveBeenCalled();
	});

	it("reports blocked edits when a fork stopped allowing them", async () => {
		const github = createFakeGitHub({
			pullRequest: {
				headRepository: "contributor/repo",
				maintainerCanModify: false,
			},
		});
		const patchPath = await writePatch(validPatch);

		await apply({ ...optionsFor(patchPath), github });

		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("Allow edits by maintainers"),
			pullRequestNumber: 7,
		});
		expect(mockApplyPatch).not.toHaveBeenCalled();
	});

	it("reports a rejected patch when it no longer applies", async () => {
		const github = createFakeGitHub();
		const patchPath = await writePatch(validPatch);
		mockApplyPatch.mockResolvedValue("error: patch does not apply");

		await apply({ ...optionsFor(patchPath), github });

		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("no longer applies to this branch"),
			pullRequestNumber: 7,
		});
		expect(mockCommitFiles).not.toHaveBeenCalled();
	});

	it("reports a failed push when the push is rejected", async () => {
		const github = createFakeGitHub();
		const patchPath = await writePatch(validPatch);
		mockPushBranch.mockResolvedValue({
			code: 1,
			stderr: "! [rejected]",
			stdout: "",
		});

		await apply({ ...optionsFor(patchPath), github });

		expect(github.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("couldn't push to this branch"),
			pullRequestNumber: 7,
		});
		expect(github.createReaction).not.toHaveBeenCalled();
	});

	it("posts nothing when the pull request closed while formatting ran", async () => {
		const github = createFakeGitHub({ pullRequest: { open: false } });
		const patchPath = await writePatch(validPatch);

		await apply({ ...optionsFor(patchPath), github });

		expect(github.createComment).not.toHaveBeenCalled();
		expect(mockApplyPatch).not.toHaveBeenCalled();
	});
});
