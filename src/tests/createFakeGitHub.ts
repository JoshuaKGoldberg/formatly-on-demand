import { vi } from "vitest";

import type {
	CommentInfo,
	FormatlyGitHub,
	PullRequestInfo,
} from "../github.js";

export interface FakeGitHubOptions {
	comments?: CommentInfo[];
	files?: string[];
	pullRequest?: Partial<PullRequestInfo>;
}

export function createFakeGitHub({
	comments = [],
	files = [],
	pullRequest,
}: FakeGitHubOptions = {}) {
	return {
		createComment: vi.fn((options: { body: string }) =>
			Promise.resolve({ body: options.body, id: 123 }),
		),
		createReaction: vi.fn(() => Promise.resolve()),
		getPullRequest: vi.fn(() =>
			Promise.resolve({
				author: "contributor",
				headRef: "add-thing",
				headRepository: "owner/repo",
				headSha: "0123456789abcdef0123456789abcdef01234567",
				maintainerCanModify: true,
				open: true,
				...pullRequest,
			}),
		),
		listChangedFiles: vi.fn(() => Promise.resolve(files)),
		listComments: vi.fn(() => Promise.resolve(comments)),
		repository: "owner/repo",
		updateComment: vi.fn(() => Promise.resolve()),
	} satisfies FormatlyGitHub;
}
