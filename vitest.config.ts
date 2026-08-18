import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		coverage: {
			exclude: ["src/action", "src/tests"],
			include: ["src"],
			reporter: ["html", "lcov"],
		},
		exclude: [".tmp-tests", "lib", "node_modules"],
		setupFiles: ["console-fail-test/setup"],
	},
});
