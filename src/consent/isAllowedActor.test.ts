import { describe, expect, it } from "vitest";

import { isAllowedActor } from "./isAllowedActor.js";

const allowedAssociations = ["OWNER", "MEMBER", "COLLABORATOR"];

describe(isAllowedActor, () => {
	it("returns true when the commenter is the pull request's author", () => {
		const actual = isAllowedActor({
			allowedAssociations,
			association: "NONE",
			commenter: "contributor",
			pullRequestAuthor: "Contributor",
		});

		expect(actual).toBe(true);
	});

	it("returns true when the commenter has an allowed association", () => {
		const actual = isAllowedActor({
			allowedAssociations,
			association: "collaborator",
			commenter: "maintainer",
			pullRequestAuthor: "contributor",
		});

		expect(actual).toBe(true);
	});

	it("returns false when the commenter is an unrelated user", () => {
		const actual = isAllowedActor({
			allowedAssociations,
			association: "CONTRIBUTOR",
			commenter: "passerby",
			pullRequestAuthor: "contributor",
		});

		expect(actual).toBe(false);
	});

	it("returns false when the commenter is a bot that authored the pull request", () => {
		const actual = isAllowedActor({
			allowedAssociations,
			association: "OWNER",
			commenter: "renovate[bot]",
			pullRequestAuthor: "renovate[bot]",
		});

		expect(actual).toBe(false);
	});
});
