import { describe, expect, it } from "vitest";

import { parseCommand } from "./parseCommand.js";

const command = "/formatly";

function parse(body: string, acceptYes = true) {
	return parseCommand({ acceptYes, body, command });
}

describe(parseCommand, () => {
	it.each(["/formatly", "  /formatly  ", "`/formatly`", "/Formatly!"])(
		"returns command when the body is %j",
		(body) => {
			expect(parse(body)).toBe("command");
		},
	);

	it("returns command when the command is on its own line of a longer body", () => {
		expect(parse("Thanks for the offer!\n\n/formatly\n")).toBe("command");
	});

	it.each(["yes", "Yes please", "👍", "do it"])(
		"returns yes when the body is %j and yes is accepted",
		(body) => {
			expect(parse(body)).toBe("yes");
		},
	);

	it("returns undefined when the body says yes and yes is not accepted", () => {
		expect(parse("yes", false)).toBeUndefined();
	});

	it("returns undefined when the command is quoted from another comment", () => {
		expect(
			parse("> Comment `/formatly` on this pull request\n\nNeat!"),
		).toBeUndefined();
	});

	it("returns undefined when the command is inside a code fence", () => {
		expect(parse("Try:\n\n```shell\n/formatly\n```\n")).toBeUndefined();
	});

	it("returns undefined when the command is part of a sentence", () => {
		expect(parse("I ran /formatly locally and it worked")).toBeUndefined();
	});

	it("returns undefined when the body is unrelated", () => {
		expect(parse("Could you take another look?")).toBeUndefined();
	});
});
