import { getOctokit } from "@actions/github";

import type { FormatlyGitHub } from "../github.js";

export interface CreateGitHubOptions {
	owner: string;
	repo: string;
	token: string;
}

export function createGitHub({
	owner,
	repo,
	token,
}: CreateGitHubOptions): FormatlyGitHub {
	const octokit = getOctokit(token);

	return {
		async createComment({ body, pullRequestNumber }) {
			const { data } = await octokit.rest.issues.createComment({
				body,
				issue_number: pullRequestNumber,
				owner,
				repo,
			});

			return { body: data.body, id: data.id };
		},
		async createReaction({ commentId, content }) {
			await octokit.rest.reactions.createForIssueComment({
				comment_id: commentId,
				content,
				owner,
				repo,
			});
		},
		async getPullRequest({ pullRequestNumber }) {
			const { data } = await octokit.rest.pulls.get({
				owner,
				pull_number: pullRequestNumber,
				repo,
			});

			return {
				author: data.user.login,
				headRef: data.head.ref,
				// Octokit types a head repository as always present, but a fork can be
				// deleted while its pull request is still open.
				headRepository: (
					data.head.repo as null | undefined | { full_name: string }
				)?.full_name,
				headSha: data.head.sha,
				maintainerCanModify: data.maintainer_can_modify,
				open: data.state === "open",
			};
		},
		async listChangedFiles({ pullRequestNumber }) {
			const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
				owner,
				per_page: 100,
				pull_number: pullRequestNumber,
				repo,
			});

			return files
				.filter((file) => file.status !== "removed")
				.map((file) => file.filename);
		},
		async listComments({ pullRequestNumber }) {
			const comments = await octokit.paginate(
				octokit.rest.issues.listComments,
				{
					issue_number: pullRequestNumber,
					owner,
					per_page: 100,
					repo,
				},
			);

			return comments.map(({ body, id }) => ({ body, id }));
		},
		repository: `${owner}/${repo}`,
		async updateComment({ body, commentId }) {
			await octokit.rest.issues.updateComment({
				body,
				comment_id: commentId,
				owner,
				repo,
			});
		},
	};
}
