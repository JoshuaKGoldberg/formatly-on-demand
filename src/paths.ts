const safeCharacters = /^[\w .+@/-]+$/;

export const workflowsDirectory = ".github/workflows/";

export function isFormattablePath(filePath: string) {
	return (
		isSafeRepositoryPath(filePath) && !filePath.startsWith(workflowsDirectory)
	);
}

export function isSafeRepositoryPath(filePath: string) {
	if (
		!filePath ||
		filePath.length > 1024 ||
		!safeCharacters.test(filePath) ||
		filePath.startsWith("/") ||
		filePath.startsWith(" ") ||
		filePath.endsWith("/") ||
		filePath.endsWith(" ")
	) {
		return false;
	}

	const segments = filePath.split("/");

	return segments.every(
		(segment) => segment && segment !== ".." && segment !== ".git",
	);
}
