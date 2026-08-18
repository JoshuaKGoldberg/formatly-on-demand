import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const maxBuffer = 1024 * 1024 * 64;

export interface GitOptions {
	cwd: string;
}

export interface GitResult {
	code: number;
	stderr: string;
	stdout: string;
}

export async function runGit(args: string[], { cwd }: GitOptions) {
	const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer });

	return stdout;
}

export async function tryGit(
	args: string[],
	{ cwd }: GitOptions,
): Promise<GitResult> {
	try {
		const { stderr, stdout } = await execFileAsync("git", args, {
			cwd,
			maxBuffer,
		});

		return { code: 0, stderr, stdout };
	} catch (error) {
		const { code, stderr, stdout } = error as Partial<GitResult>;

		return {
			code: code ?? 1,
			stderr: stderr ?? String(error),
			stdout: stdout ?? "",
		};
	}
}
