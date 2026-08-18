export interface CommentInfo {
	body: string | undefined;
	id: number;
}

export interface FormatlyGitHub {
	createComment(options: {
		body: string;
		pullRequestNumber: number;
	}): Promise<CommentInfo>;
	createReaction(options: {
		commentId: number;
		content: "+1" | "eyes";
	}): Promise<void>;
	getPullRequest(options: {
		pullRequestNumber: number;
	}): Promise<PullRequestInfo>;
	listChangedFiles(options: { pullRequestNumber: number }): Promise<string[]>;
	listComments(options: { pullRequestNumber: number }): Promise<CommentInfo[]>;
	readonly repository: string;
	updateComment(options: { body: string; commentId: number }): Promise<void>;
}

export interface PullRequestInfo {
	author: string;
	headRef: string;
	headRepository: string | undefined;
	headSha: string;
	maintainerCanModify: boolean;
	open: boolean;
}
