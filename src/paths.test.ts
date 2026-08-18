import { describe, expect, it } from "vitest";

import { isFormattablePath, isSafeRepositoryPath } from "./paths.js";

describe(isSafeRepositoryPath, () => {
	it.each([
		"README.md",
		"src/index.ts",
		"docs/Configuration Files.md",
		"packages/core/src/@types/index.d.ts",
		".github/workflows/ci.yaml",
	])("returns true when given the repository path %s", (filePath) => {
		expect(isSafeRepositoryPath(filePath)).toBe(true);
	});

	it.each([
		"",
		"/etc/passwd",
		"../outside.ts",
		"src/../../outside.ts",
		".git/config",
		"src/.git/hooks/pre-commit",
		"src//index.ts",
		"src/index.ts/",
		" src/index.ts",
		"src/index.ts ",
		"src/`whoami`.ts",
		"src/in\ndex.ts",
		"src/$(whoami).ts",
		"src".padEnd(1025, "x"),
	])("returns false when given the repository path %j", (filePath) => {
		expect(isSafeRepositoryPath(filePath)).toBe(false);
	});
});

describe(isFormattablePath, () => {
	it("returns true when given a path outside .github/workflows", () => {
		expect(isFormattablePath("src/index.ts")).toBe(true);
	});

	it("returns false when given a path inside .github/workflows", () => {
		expect(isFormattablePath(".github/workflows/ci.yaml")).toBe(false);
	});
});
