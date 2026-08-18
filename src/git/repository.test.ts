import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
	commitAll,
	createTestRepository,
	writeFiles,
} from "../tests/createTestRepository.js";
import {
	applyPatch,
	commitFiles,
	createPatch,
	getChangedFiles,
	getDirtyFiles,
	getHeadSha,
	pushBranch,
	restoreFiles,
} from "./repository.js";
import { runGit } from "./runGit.js";

const initialFiles = {
	"src/index.ts": "const value = { a: 1 };\n",
	"src/other.ts": "const other = 2;\n",
};

async function createRepositoryWithPatch() {
	const cwd = await createTestRepository(initialFiles);

	await writeFiles(cwd, { "src/index.ts": "const value = { a: 2 };\n" });

	const patch = await createPatch({ cwd, files: ["src/index.ts"] });
	const patchPath = `${cwd}-changes.patch`;

	await fs.writeFile(patchPath, patch);
	await restoreFiles({ cwd, files: ["src/index.ts"] });

	return { cwd, patch, patchPath };
}

describe(createPatch, () => {
	it("returns a patch of only the requested files when several are dirty", async () => {
		const cwd = await createTestRepository(initialFiles);
		await writeFiles(cwd, {
			"src/index.ts": "const value = { a: 2 };\n",
			"src/other.ts": "const other = 3;\n",
		});

		const actual = await createPatch({ cwd, files: ["src/index.ts"] });

		expect(actual).toContain("diff --git a/src/index.ts b/src/index.ts");
		expect(actual).not.toContain("src/other.ts");
	});
});

describe(getChangedFiles, () => {
	it("returns files changed since the base commit", async () => {
		const cwd = await createTestRepository(initialFiles);
		const baseSha = await getHeadSha({ cwd });
		await writeFiles(cwd, { "src/added.ts": "const added = 3;\n" });
		await commitAll(cwd, "Add a file");

		const actual = await getChangedFiles({ baseSha, cwd });

		expect(actual).toEqual(["src/added.ts"]);
	});
});

describe(getDirtyFiles, () => {
	it("returns only the requested files that differ from the commit", async () => {
		const cwd = await createTestRepository(initialFiles);
		await writeFiles(cwd, { "src/other.ts": "const other = 3;\n" });

		const actual = await getDirtyFiles({
			cwd,
			files: ["src/index.ts", "src/other.ts"],
		});

		expect(actual).toEqual(["src/other.ts"]);
	});
});

describe(restoreFiles, () => {
	it("restores a file to its committed contents", async () => {
		const cwd = await createTestRepository(initialFiles);
		await writeFiles(cwd, { "src/index.ts": "const value = { a: 2 };\n" });

		await restoreFiles({ cwd, files: ["src/index.ts"] });

		expect(await getDirtyFiles({ cwd, files: ["src/index.ts"] })).toEqual([]);
	});
});

describe(applyPatch, () => {
	it("returns undefined and applies the patch when the patch is valid", async () => {
		const { cwd, patchPath } = await createRepositoryWithPatch();

		const actual = await applyPatch({ cwd, patchPath });

		expect(actual).toBeUndefined();
		expect(await fs.readFile(path.join(cwd, "src/index.ts"), "utf8")).toBe(
			"const value = { a: 2 };\n",
		);
	});

	it("returns an error and changes nothing when the patch doesn't apply", async () => {
		const { cwd, patchPath } = await createRepositoryWithPatch();
		await writeFiles(cwd, { "src/index.ts": "const value = { a: 3 };\n" });
		await commitAll(cwd, "Change the same line");

		const actual = await applyPatch({ cwd, patchPath });

		expect(actual).toContain("patch does not apply");
		expect(await fs.readFile(path.join(cwd, "src/index.ts"), "utf8")).toBe(
			"const value = { a: 3 };\n",
		);
	});
});

describe(commitFiles, () => {
	it("commits the requested files as the actions bot when files are dirty", async () => {
		const cwd = await createTestRepository(initialFiles);
		await writeFiles(cwd, {
			"src/index.ts": "const value = { a: 2 };\n",
			"src/other.ts": "const other = 3;\n",
		});

		const sha = await commitFiles({
			cwd,
			files: ["src/index.ts"],
			message: "chore: apply formatly formatting",
		});

		expect(sha).toBe(await getHeadSha({ cwd }));
		expect(
			await runGit(["log", "-1", "--format=%an <%ae>%n%s", "--name-only"], {
				cwd,
			}),
		).toBe(
			[
				"github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>",
				"chore: apply formatly formatting",
				"",
				"src/index.ts",
				"",
			].join("\n"),
		);
	});
});

describe(pushBranch, () => {
	it("pushes the commit when the remote branch hasn't moved", async () => {
		const remoteUrl = await createRemote();
		const cwd = await createClone(remoteUrl);
		await writeFiles(cwd, { "src/index.ts": "const value = { a: 2 };\n" });
		await commitFiles({ cwd, files: ["src/index.ts"], message: "Format" });

		const actual = await pushBranch({
			cwd,
			headRef: "main",
			remoteUrl,
			token: "unused-for-local-remotes",
		});

		expect(actual.code).toBe(0);
	});

	it("fails without forcing when the remote branch has moved", async () => {
		const remoteUrl = await createRemote();
		const cwd = await createClone(remoteUrl);
		const other = await createClone(remoteUrl);

		await writeFiles(other, { "src/other.ts": "const other = 3;\n" });
		await commitAll(other, "Meanwhile, elsewhere");
		await runGit(["push", "origin", "HEAD:refs/heads/main"], { cwd: other });

		await writeFiles(cwd, { "src/index.ts": "const value = { a: 2 };\n" });
		await commitFiles({ cwd, files: ["src/index.ts"], message: "Format" });

		const actual = await pushBranch({
			cwd,
			headRef: "main",
			remoteUrl,
			token: "unused-for-local-remotes",
		});

		expect(actual.code).not.toBe(0);
		expect(actual.stderr).toContain("rejected");
	});
});

async function createClone(remoteUrl: string) {
	const cwd = await createTestRepository({});

	await runGit(["remote", "add", "origin", remoteUrl], { cwd });
	await runGit(["fetch", "origin"], { cwd });
	await runGit(["reset", "--hard", "origin/main"], { cwd });

	return cwd;
}

async function createRemote() {
	const source = await createTestRepository(initialFiles);
	const remoteUrl = `${source}-remote.git`;

	await runGit(["clone", "--bare", source, remoteUrl], { cwd: source });

	return remoteUrl;
}
