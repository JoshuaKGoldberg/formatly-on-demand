import { describe, expect, it } from "vitest";

import { validatePatch } from "./validatePatch.js";

const options = { maxBytes: 1000000, maxFiles: 200 };

function patchFor(header: string, ...extra: string[]) {
	return [
		header,
		...extra,
		"index 1234567..89abcde 100644",
		"--- a/src/index.ts",
		"+++ b/src/index.ts",
		"@@ -1 +1 @@",
		"-const value = {a:1}",
		"+const value = { a: 1 };",
		"",
	].join("\n");
}

describe(validatePatch, () => {
	it("returns the changed file when given a patch modifying one file", () => {
		const actual = validatePatch(
			patchFor("diff --git a/src/index.ts b/src/index.ts"),
			options,
		);

		expect(actual).toEqual({ files: ["src/index.ts"], valid: true });
	});

	it("returns both changed files when given a patch modifying two files", () => {
		const actual = validatePatch(
			[
				patchFor("diff --git a/src/index.ts b/src/index.ts"),
				patchFor("diff --git a/docs/README file.md b/docs/README file.md"),
			].join(""),
			options,
		);

		expect(actual).toEqual({
			files: ["src/index.ts", "docs/README file.md"],
			valid: true,
		});
	});

	it("returns valid when content lines look like file headers", () => {
		const actual = validatePatch(
			[
				"diff --git a/src/index.ts b/src/index.ts",
				"index 1234567..89abcde 100644",
				"--- a/src/index.ts",
				"+++ b/src/index.ts",
				"@@ -1,2 +1,2 @@",
				" deleted file mode 100644",
				"-new file mode 100644",
				"+new file mode 100755",
				"",
			].join("\n"),
			options,
		);

		expect(actual).toEqual({ files: ["src/index.ts"], valid: true });
	});

	it("returns a problem when the patch changes a workflow file", () => {
		const actual = validatePatch(
			patchFor(
				"diff --git a/.github/workflows/ci.yaml b/.github/workflows/ci.yaml",
			),
			options,
		);

		expect(actual).toEqual({
			problem:
				"it changes .github/workflows/ci.yaml, and this action never writes to .github/workflows/",
			valid: false,
		});
	});

	it.each([
		["new file mode 100644"],
		["deleted file mode 100644"],
		["old mode 100644"],
		["new mode 100755"],
		["rename from src/old.ts"],
		["rename to src/new.ts"],
		["GIT binary patch"],
	])("returns a problem when the patch includes %j", (line) => {
		const actual = validatePatch(
			patchFor("diff --git a/src/index.ts b/src/index.ts", line),
			options,
		);

		expect(actual).toMatchObject({ valid: false });
	});

	it("returns a problem when the patch changes a symlink", () => {
		const actual = validatePatch(
			[
				"diff --git a/link b/link",
				"index 1234567..89abcde 120000",
				"--- a/link",
				"+++ b/link",
				"@@ -1 +1 @@",
				"-src/index.ts",
				"+/etc/passwd",
				"",
			].join("\n"),
			options,
		);

		expect(actual).toEqual({
			problem:
				'it changes a symlink or submodule: "index 1234567..89abcde 120000"',
			valid: false,
		});
	});

	it("returns a problem when the patch escapes the repository", () => {
		const actual = validatePatch(
			patchFor("diff --git a/../../outside.ts b/../../outside.ts"),
			options,
		);

		expect(actual).toEqual({
			problem:
				'it changes a path this action doesn\'t consider safe: "../../outside.ts"',
			valid: false,
		});
	});

	it("returns a problem when the patch's file header is quoted", () => {
		const actual = validatePatch(
			patchFor('diff --git "a/src/\\303\\251.ts" "b/src/\\303\\251.ts"'),
			options,
		);

		expect(actual).toMatchObject({ valid: false });
	});

	it("returns a problem when the patch's two file paths differ", () => {
		const actual = validatePatch(
			patchFor("diff --git a/src/one.ts b/src/two.ts"),
			options,
		);

		expect(actual).toMatchObject({ valid: false });
	});

	it("returns a problem when the patch is empty", () => {
		const actual = validatePatch("\n \n", options);

		expect(actual).toEqual({ problem: "the patch is empty", valid: false });
	});

	it("returns a problem when the patch has no file changes", () => {
		const actual = validatePatch("nothing to see here", options);

		expect(actual).toEqual({
			problem: "the patch contains no file changes",
			valid: false,
		});
	});

	it("returns a problem when the patch is larger than the byte limit", () => {
		const actual = validatePatch(
			patchFor("diff --git a/src/index.ts b/src/index.ts"),
			{ ...options, maxBytes: 10 },
		);

		expect(actual).toMatchObject({ valid: false });
	});

	it("returns a problem when the patch changes more files than the file limit", () => {
		const actual = validatePatch(
			[
				patchFor("diff --git a/src/one.ts b/src/one.ts"),
				patchFor("diff --git a/src/two.ts b/src/two.ts"),
			].join(""),
			{ ...options, maxFiles: 1 },
		);

		expect(actual).toEqual({
			problem: "the patch changes 2 files, over the 1 file limit",
			valid: false,
		});
	});
});
