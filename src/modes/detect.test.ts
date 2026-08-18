import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getHeadSha } from "../git/repository.js";
import {
	commitAll,
	createTestRepository,
	writeFiles,
} from "../tests/createTestRepository.js";
import { detect } from "./detect.js";

const unformatted = "const value = {a:1}\n";

const originalCwd = process.cwd();

afterEach(() => {
	process.chdir(originalCwd);
});

describe(detect, () => {
	it("writes a patch when a requested file needs formatting", async () => {
		const cwd = await createTestRepository({
			".prettierrc.json": "{}\n",
			"src/index.ts": unformatted,
		});

		const { meta, patchPath } = await detect({
			cwd,
			files: ["src/index.ts"],
			headSha: "0123456789abcdef0123456789abcdef01234567",
			outputDirectory: path.join(cwd, "..", "output"),
			pullRequestNumber: 7,
		});

		expect(meta).toEqual({
			excludedWorkflowFiles: 0,
			files: ["src/index.ts"],
			formatter: "prettier",
			headSha: "0123456789abcdef0123456789abcdef01234567",
			pullRequestNumber: 7,
		});
		expect(await fs.readFile(patchPath, "utf8")).toContain(
			"+const value = { a: 1 };",
		);
	});

	it("reports no files when the requested files are already formatted", async () => {
		const cwd = await createTestRepository({
			".prettierrc.json": "{}\n",
			"src/index.ts": "const value = { a: 1 };\n",
		});

		const { meta, patchPath } = await detect({
			cwd,
			files: ["src/index.ts"],
			headSha: "0123456789abcdef0123456789abcdef01234567",
			outputDirectory: path.join(cwd, "..", "output"),
			pullRequestNumber: 7,
		});

		expect(meta.files).toEqual([]);
		expect(await fs.readFile(patchPath, "utf8")).toBe("");
	});

	it("reports files changed since the base commit when given a base sha", async () => {
		const cwd = await createTestRepository({
			".prettierrc.json": "{}\n",
			"src/committed.ts": "const committed = { a: 1 };\n",
		});
		const baseSha = await getHeadSha({ cwd });

		await writeFiles(cwd, { "src/added.ts": unformatted });
		await commitAll(cwd, "Add a file");

		const { meta } = await detect({
			baseSha,
			cwd,
			headSha: "0123456789abcdef0123456789abcdef01234567",
			outputDirectory: path.join(cwd, "..", "output"),
			pullRequestNumber: 7,
		});

		expect(meta.files).toEqual(["src/added.ts"]);
	});

	it("excludes workflow files when they need formatting", async () => {
		const cwd = await createTestRepository({
			".github/workflows/ci.yaml": "on:   push\n",
			".prettierrc.json": "{}\n",
			"src/index.ts": unformatted,
		});

		const { meta } = await detect({
			cwd,
			files: [".github/workflows/ci.yaml", "src/index.ts"],
			headSha: "0123456789abcdef0123456789abcdef01234567",
			outputDirectory: path.join(cwd, "..", "output"),
			pullRequestNumber: 7,
		});

		expect(meta).toMatchObject({
			excludedWorkflowFiles: 1,
			files: ["src/index.ts"],
		});
	});

	it("reports no formatter when the repository has none", async () => {
		const cwd = await createTestRepository(
			{ "src/index.ts": unformatted },
			os.tmpdir(),
		);

		const { meta } = await detect({
			cwd,
			files: ["src/index.ts"],
			headSha: "0123456789abcdef0123456789abcdef01234567",
			outputDirectory: path.join(cwd, "..", "output"),
			pullRequestNumber: 7,
		});

		expect(meta).toMatchObject({ files: [], formatter: null });
	});
});
