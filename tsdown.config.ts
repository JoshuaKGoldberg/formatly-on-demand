import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/**/*.ts", "!src/**/*.test.*", "!src/action/**", "!src/tests/**"],
	fixedExtension: false,
	outDir: "lib",
	unbundle: true,
});
