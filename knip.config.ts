import type { KnipConfig } from "knip";

export default {
	entry: ["src/**/*.test.*", "src/action/index.ts!"],
	ignoreExportsUsedInFile: { interface: true, type: true },
	ignoreIssues: { "src/git/repository.ts": ["exports"] },
	project: ["!src/tests/**!", "src/**/*.ts!"],
	treatConfigHintsAsErrors: true,
} satisfies KnipConfig;
