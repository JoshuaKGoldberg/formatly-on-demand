// https://github.com/vercel/ncc/issues/791
// https://github.com/vercel/ncc/issues/1123

import fs from "node:fs/promises";
import path from "node:path";

const prepend = `globalThis.require = __WEBPACK_EXTERNAL_createRequire(import.meta.dirname);`;

await fs.writeFile(
	"dist/index.js",
	[prepend, (await fs.readFile("dist/index.js")).toString()].join("\n"),
);

for (const entry of await fs.readdir("dist", { withFileTypes: true })) {
	if (entry.isDirectory()) {
		await fs.rm(path.join("dist", entry.name), { recursive: true });
	} else if (entry.name.endsWith(".d.ts") || entry.name.endsWith(".d.ts.map")) {
		await fs.rm(path.join("dist", entry.name));
	}
}
