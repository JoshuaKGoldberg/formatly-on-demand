import { describe, expect, it } from "vitest";

import type { RenderOfferOptions } from "./renderOffer.js";

import { renderOffer } from "./renderOffer.js";

const options: RenderOfferOptions = {
	acceptYes: true,
	command: "/formatly",
	excludedWorkflowFiles: 0,
	files: ["src/index.ts", "src/other.ts"],
	formatter: "prettier",
	maintainerEditsBlocked: false,
};

describe(renderOffer, () => {
	it("renders a plural offer when multiple files need formatting", () => {
		expect(renderOffer({ ...options })).toMatchInlineSnapshot(`
			"<!-- formatly-on-demand -->

			<!-- formatly-on-demand: offer -->

			### 🧼 Would you like me to format this pull request?

			This repository formats code with [Prettier](https://prettier.io).

			2 files in this pull request aren't formatted the way it wants:

			- \`src/index.ts\`
			- \`src/other.ts\`

			You don't need to install anything or run any commands yourself.

			Comment **\`/formatly\`** on this pull request and I'll format those files, then push a single commit to this branch.
			A comment of just _yes_ works too.

			> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._"
		`);
	});

	it("renders a singular offer when one file needs formatting", () => {
		expect(renderOffer({ ...options, files: ["src/index.ts"] }))
			.toMatchInlineSnapshot(`
			"<!-- formatly-on-demand -->

			<!-- formatly-on-demand: offer -->

			### 🧼 Would you like me to format this pull request?

			This repository formats code with [Prettier](https://prettier.io).

			One file in this pull request isn't formatted the way it wants:

			- \`src/index.ts\`

			You don't need to install anything or run any commands yourself.

			Comment **\`/formatly\`** on this pull request and I'll format those files, then push a single commit to this branch.
			A comment of just _yes_ works too.

			> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._"
		`);
	});

	it("renders a warning when the fork blocks maintainer edits", () => {
		expect(renderOffer({ ...options, maintainerEditsBlocked: true }))
			.toMatchInlineSnapshot(`
			"<!-- formatly-on-demand -->

			<!-- formatly-on-demand: offer -->

			### 🧼 Would you like me to format this pull request?

			This repository formats code with [Prettier](https://prettier.io).

			2 files in this pull request aren't formatted the way it wants:

			- \`src/index.ts\`
			- \`src/other.ts\`

			You don't need to install anything or run any commands yourself.

			Comment **\`/formatly\`** on this pull request and I'll format those files, then push a single commit to this branch.
			A comment of just _yes_ works too.

			> [!WARNING]
			> This pull request comes from a fork with _Allow edits by maintainers_ turned off, so I won't be able to push to its branch.
			> Turning that on in the pull request's sidebar will let me help.

			> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._"
		`);
	});

	it("renders a note when workflow files also need formatting", () => {
		expect(renderOffer({ ...options, excludedWorkflowFiles: 2 }))
			.toMatchInlineSnapshot(`
			"<!-- formatly-on-demand -->

			<!-- formatly-on-demand: offer -->

			### 🧼 Would you like me to format this pull request?

			This repository formats code with [Prettier](https://prettier.io).

			2 files in this pull request aren't formatted the way it wants:

			- \`src/index.ts\`
			- \`src/other.ts\`

			You don't need to install anything or run any commands yourself.

			Comment **\`/formatly\`** on this pull request and I'll format those files, then push a single commit to this branch.
			A comment of just _yes_ works too.

			> [!NOTE]
			> 2 workflow files also need formatting. I never write to \`.github/workflows\`, so those will need a manual pass.

			> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._"
		`);
	});

	it("renders without the yes hint when yes is not accepted", () => {
		expect(renderOffer({ ...options, acceptYes: false }))
			.toMatchInlineSnapshot(`
			"<!-- formatly-on-demand -->

			<!-- formatly-on-demand: offer -->

			### 🧼 Would you like me to format this pull request?

			This repository formats code with [Prettier](https://prettier.io).

			2 files in this pull request aren't formatted the way it wants:

			- \`src/index.ts\`
			- \`src/other.ts\`

			You don't need to install anything or run any commands yourself.

			Comment **\`/formatly\`** on this pull request and I'll format those files, then push a single commit to this branch.

			> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._"
		`);
	});

	it("renders a truncated file list when many files need formatting", () => {
		expect(
			renderOffer({
				...options,
				files: Array.from(
					{ length: 25 },
					(_, index) => `src/file-${index.toString()}.ts`,
				),
			}),
		).toMatchInlineSnapshot(`
			"<!-- formatly-on-demand -->

			<!-- formatly-on-demand: offer -->

			### 🧼 Would you like me to format this pull request?

			This repository formats code with [Prettier](https://prettier.io).

			25 files in this pull request aren't formatted the way it wants:

			- \`src/file-0.ts\`
			- \`src/file-1.ts\`
			- \`src/file-2.ts\`
			- \`src/file-3.ts\`
			- \`src/file-4.ts\`
			- \`src/file-5.ts\`
			- \`src/file-6.ts\`
			- \`src/file-7.ts\`
			- \`src/file-8.ts\`
			- \`src/file-9.ts\`
			- \`src/file-10.ts\`
			- \`src/file-11.ts\`
			- \`src/file-12.ts\`
			- \`src/file-13.ts\`
			- \`src/file-14.ts\`
			- \`src/file-15.ts\`
			- \`src/file-16.ts\`
			- \`src/file-17.ts\`
			- \`src/file-18.ts\`
			- \`src/file-19.ts\`
			- ...and 5 more

			You don't need to install anything or run any commands yourself.

			Comment **\`/formatly\`** on this pull request and I'll format those files, then push a single commit to this branch.
			A comment of just _yes_ works too.

			> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._"
		`);
	});

	it("renders custom header and footer text when they are provided", () => {
		expect(
			renderOffer({
				...options,
				commentFooter: "_Questions? Ask in Discord._",
				commentHeader: "Hi from the Example team!",
			}),
		).toMatchInlineSnapshot(`
			"<!-- formatly-on-demand -->

			<!-- formatly-on-demand: offer -->

			Hi from the Example team!

			### 🧼 Would you like me to format this pull request?

			This repository formats code with [Prettier](https://prettier.io).

			2 files in this pull request aren't formatted the way it wants:

			- \`src/index.ts\`
			- \`src/other.ts\`

			You don't need to install anything or run any commands yourself.

			Comment **\`/formatly\`** on this pull request and I'll format those files, then push a single commit to this branch.
			A comment of just _yes_ works too.

			_Questions? Ask in Discord._

			> 🧼 _This comment was posted automatically by [formatly-on-demand](https://github.com/JoshuaKGoldberg/formatly-on-demand)._"
		`);
	});
});
