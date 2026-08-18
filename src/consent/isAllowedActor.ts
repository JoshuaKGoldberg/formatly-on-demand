export interface IsAllowedActorOptions {
	allowedAssociations: string[];
	association: string;
	commenter: string;
	pullRequestAuthor: string;
}

export function isAllowedActor({
	allowedAssociations,
	association,
	commenter,
	pullRequestAuthor,
}: IsAllowedActorOptions) {
	if (!commenter || commenter.endsWith("[bot]")) {
		return false;
	}

	if (commenter.toLowerCase() === pullRequestAuthor.toLowerCase()) {
		return true;
	}

	return allowedAssociations.some(
		(allowed) => allowed.trim().toUpperCase() === association.toUpperCase(),
	);
}
