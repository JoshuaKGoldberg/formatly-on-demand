import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runGit } from "../git/runGit.js";

// Repositories are created inside this project by default so that formatly can
// resolve the Prettier installed here, rather than downloading one.
const testsDirectory = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../.tmp-tests",
);

export async function commitAll(cwd: string, message: string) {
	await runGit(["add", "."], { cwd });
	await runGit(["commit", "--message", message], { cwd });

	return (await runGit(["rev-parse", "HEAD"], { cwd })).trim();
}

export async function createTestRepository(
	files: Record<string, string>,
	root = testsDirectory,
) {
	await fs.mkdir(root, { recursive: true });

	const cwd = await fs.mkdtemp(path.join(root, "repository-"));

	await runGit(["init", "--initial-branch=main"], { cwd });
	await runGit(["config", "user.email", "tests@example.com"], { cwd });
	await runGit(["config", "user.name", "Tests"], { cwd });

	await writeFiles(cwd, files);
	await runGit(["add", "."], { cwd });
	await runGit(["commit", "--allow-empty", "--message", "Initial commit"], {
		cwd,
	});

	return cwd;
}

export async function writeFiles(cwd: string, files: Record<string, string>) {
	for (const [filePath, contents] of Object.entries(files)) {
		await fs.mkdir(path.join(cwd, path.dirname(filePath)), { recursive: true });
		await fs.writeFile(path.join(cwd, filePath), contents);
	}
}
