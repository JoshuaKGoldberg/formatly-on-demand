<h1 align="center">Formatly on Demand</h1>

<p align="center">
	Offers to format pull requests with whatever formatter your project is already using, then formats them on demand.
	🧼
</p>

<p align="center">
	<!-- prettier-ignore-start -->
	<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
	<a href="#contributors" target="_blank"><img alt="👪 All Contributors: 1" src="https://img.shields.io/badge/%F0%9F%91%AA_all_contributors-1-21bb42.svg" /></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->
	<!-- prettier-ignore-end -->
	<a href="https://github.com/JoshuaKGoldberg/formatly-on-demand/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="🤝 Code of Conduct: Kept" src="https://img.shields.io/badge/%F0%9F%A4%9D_code_of_conduct-kept-21bb42" /></a>
	<a href="https://codecov.io/gh/JoshuaKGoldberg/formatly-on-demand" target="_blank"><img alt="🧪 Coverage" src="https://img.shields.io/codecov/c/github/JoshuaKGoldberg/formatly-on-demand?label=%F0%9F%A7%AA%20coverage" /></a>
	<a href="https://github.com/JoshuaKGoldberg/formatly-on-demand/blob/main/LICENSE.md" target="_blank"><img alt="📝 License: MIT" src="https://img.shields.io/badge/%F0%9F%93%9D_license-MIT-21bb42.svg" /></a>
	<a href="http://npmjs.com/package/formatly-on-demand" target="_blank"><img alt="📦 npm version" src="https://img.shields.io/npm/v/formatly-on-demand?color=21bb42&label=%F0%9F%93%A6%20npm" /></a>
	<img alt="💪 TypeScript: Strict" src="https://img.shields.io/badge/%F0%9F%92%AA_typescript-strict-21bb42.svg" />
</p>

## Usage

`formatly-on-demand` posts a friendly comment when a pull request's files aren't formatted the way your repository formats code.
It doesn't touch the branch until the pull request's author or a maintainer comments `/formatly` to ask it to.
Then it formats those files with [`formatly`](https://github.com/JoshuaKGoldberg/formatly) and pushes a single commit.

Formatting is run with whichever formatter your repository already uses: [Biome](https://biomejs.dev/formatter), [deno fmt](https://docs.deno.com/runtime/reference/cli/fmt), [dprint](https://dprint.dev), [oxfmt](https://oxc.rs), or [Prettier](https://prettier.io).
No formatter-specific configuration is needed.

### Setup

Add three workflow files to your repository.
Each one calls a reusable workflow, so the jobs and permissions that keep this safe stay in one place.

`.github/workflows/formatly-on-demand-detect.yaml` checks each pull request:

```yaml
name: Formatly on Demand Detect

on:
  pull_request: ~

jobs:
  detect:
    uses: JoshuaKGoldberg/formatly-on-demand/.github/workflows/detect.yaml@v0
    with:
      install: pnpm install --frozen-lockfile
```

`.github/workflows/formatly-on-demand-offer.yaml` posts the comment:

```yaml
name: Formatly on Demand Offer

on:
  workflow_run:
    types:
      - completed
    workflows:
      - Formatly on Demand Detect

permissions:
  actions: read
  issues: write
  pull-requests: read

jobs:
  offer:
    uses: JoshuaKGoldberg/formatly-on-demand/.github/workflows/offer.yaml@v0
```

`.github/workflows/formatly-on-demand-format.yaml` does the formatting when someone asks:

```yaml
name: Formatly on Demand Format

on:
  issue_comment:
    types:
      - created

permissions:
  issues: write
  pull-requests: read

jobs:
  format:
    secrets:
      push-token: ${{ secrets.FORMATLY_ON_DEMAND_TOKEN }}
    uses: JoshuaKGoldberg/formatly-on-demand/.github/workflows/format.yaml@v0
    with:
      install: pnpm install --frozen-lockfile
```

The `install` input is whatever command installs your dependencies, such as `npm ci` or `pnpm install --frozen-lockfile`.
Leave it out for repositories that don't need an install step, such as ones formatted by `deno fmt`.

### Pushing to Pull Requests From Forks

A workflow's built-in `GITHUB_TOKEN` can't push to a branch that lives in somebody else's fork.
Formatting pull requests from forks, which is most of them for most open source repositories, needs a token of its own:

1. Create a [classic personal access token](https://github.com/settings/tokens/new) with the _public_repo_ scope, from an account with push access to your repository
2. Save it as a repository secret, such as `FORMATLY_ON_DEMAND_TOKEN`
3. Pass it as the `push-token` secret, as in the workflow above

Without that secret, pull requests from forks get a comment explaining that a maintainer will need to format them by hand.
Pull requests from branches in your own repository work with no extra setup.

Two GitHub limitations apply to pull requests from forks even with a token:

- The pull request must have _Allow edits by maintainers_ enabled, which is the default. `formatly-on-demand` says so in its comment when it isn't.
- Forks owned by organizations can't grant that access at all.

### Options

Reusable workflow inputs:

| Input                  | Default                            | Description                                                     |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------- |
| `accept-yes`           | `true`                             | Whether a comment of just _yes_ counts as asking for formatting |
| `allowed-associations` | `OWNER,MEMBER,COLLABORATOR`        | Who besides the pull request's author may ask for formatting    |
| `command`              | `/formatly`                        | Comment text that asks for formatting                           |
| `comment-footer`       |                                    | Custom footer text for comments                                 |
| `comment-header`       |                                    | Custom header text for comments                                 |
| `commit-message`       | `chore: apply formatly formatting` | Message for the formatting commit                               |
| `install`              |                                    | Command that installs dependencies                              |
| `node-version`         | `lts/*`                            | Node.js version to run the formatter with                       |
| `working-directory`    | `.`                                | Directory holding the project to format                         |

Repositories needing setup that the `install` input can't express, such as a custom toolchain, can use the action directly instead of these reusable workflows.
See [`action.yaml`](./action.yaml) for its inputs and [the reusable workflows](./.github/workflows) for how they're wired together.

## How It Stays Safe

Running your repository's formatter means installing your pull request's dependencies and loading its config and plugins.
That is arbitrary code execution from whoever opened the pull request, so `formatly-on-demand` never lets it share a job with a token:

- Jobs that check out and run pull request code declare `permissions: {}` and reference no secrets.
- The job that pushes runs no project code at all: no install, no scripts, no hooks.
  It applies a patch with `git` and nothing else.
- That patch is validated first: modifications to existing files only, never `.github/workflows`, never symlinks, submodules, renames, or paths outside the repository, and never more than `max-files` files or `max-patch-bytes` bytes.
- Detection results are re-verified against the GitHub API before any comment or push, because the job that produced them ran pull request code.
- Formatting is only ever pushed to the commit it was computed from.
  If the branch moves first, `formatly-on-demand` stops and says so rather than pushing over new work.
- Pushes are never forced.
- Only the pull request's author and the associations in `allowed-associations` can ask for formatting.
  Comments from anyone else are ignored.

## Development

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md), then [`.github/DEVELOPMENT.md`](./.github/DEVELOPMENT.md).
Thanks! 💖

## Contributors

<!-- spellchecker: disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="http://www.joshuakgoldberg.com"><img src="https://avatars.githubusercontent.com/u/3335181?v=4?s=100" width="100px;" alt="Josh Goldberg ✨"/><br /><sub><b>Josh Goldberg ✨</b></sub></a><br /><a href="https://github.com/JoshuaKGoldberg/formatly-on-demand/commits?author=JoshuaKGoldberg" title="Code">💻</a> <a href="#content-JoshuaKGoldberg" title="Content">🖋</a> <a href="https://github.com/JoshuaKGoldberg/formatly-on-demand/commits?author=JoshuaKGoldberg" title="Documentation">📖</a> <a href="#ideas-JoshuaKGoldberg" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-JoshuaKGoldberg" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-JoshuaKGoldberg" title="Maintenance">🚧</a> <a href="#projectManagement-JoshuaKGoldberg" title="Project Management">📆</a> <a href="#tool-JoshuaKGoldberg" title="Tools">🔧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- spellchecker: enable -->

> 💝 This package was templated with [`create-typescript-app`](https://github.com/JoshuaKGoldberg/create-typescript-app) using the [Bingo framework](https://create.bingo).
