import { describe, expect, it } from "vitest";

import { parseMeta } from "./meta.js";

const headSha = "0123456789abcdef0123456789abcdef01234567";

const options = { maxFiles: 200 };

function stringify(overrides: Record<string, unknown>) {
	return JSON.stringify({
		excludedWorkflowFiles: 0,
		files: ["src/index.ts"],
		formatter: "prettier",
		headSha,
		pullRequestNumber: 7,
		...overrides,
	});
}

describe(parseMeta, () => {
	it("returns the results when given valid detection results", () => {
		const actual = parseMeta(stringify({}), options);

		expect(actual).toEqual({
			excludedWorkflowFiles: 0,
			files: ["src/index.ts"],
			formatter: "prettier",
			headSha,
			pullRequestNumber: 7,
		});
	});

	it("returns results without a formatter when the formatter is null", () => {
		const actual = parseMeta(
			stringify({ files: [], formatter: null }),
			options,
		);

		expect(actual).toMatchObject({ files: [], formatter: null });
	});

	it("returns results without unsafe files when files include unsafe paths", () => {
		const actual = parseMeta(
			stringify({
				files: ["src/index.ts", "../outside.ts", ".github/workflows/ci.yaml"],
			}),
			options,
		);

		expect(actual).toMatchObject({ files: ["src/index.ts"] });
	});

	it("returns at most maxFiles files when files are over the limit", () => {
		const actual = parseMeta(
			stringify({ files: ["src/one.ts", "src/two.ts"] }),
			{ maxFiles: 1 },
		);

		expect(actual).toMatchObject({ files: ["src/one.ts"] });
	});

	it("returns zero excluded workflow files when the count isn't a positive integer", () => {
		const actual = parseMeta(stringify({ excludedWorkflowFiles: -1 }), options);

		expect(actual).toMatchObject({ excludedWorkflowFiles: 0 });
	});

	it.each([["not json at all"], ["[]"], ['"a string"'], ["null"]])(
		"returns undefined when given %j",
		(raw) => {
			expect(parseMeta(raw, options)).toBeUndefined();
		},
	);

	it.each([
		[{ headSha: "abc123" }],
		[{ headSha: 7 }],
		[{ pullRequestNumber: 0 }],
		[{ pullRequestNumber: 1.5 }],
		[{ pullRequestNumber: "7" }],
		[{ formatter: "eslint" }],
		[{ files: "src/index.ts" }],
	])("returns undefined when given the overrides %j", (overrides) => {
		expect(parseMeta(stringify(overrides), options)).toBeUndefined();
	});
});
