# @qualcomm-ui/changesets-cli

Changeset automation CLI for conventional commits.

This package streamlines the release process for monorepos by converting [conventional commits](https://www.conventionalcommits.org/) into [changesets](https://github.com/changesets/changesets), managing versioning, formatting changelogs, and generating combined release notes.

## Installation

```sh
pnpm add -D @qualcomm-ui/changesets-cli
```

## Commands

### `prep-release`

Runs the full release-prep pipeline sequentially:

1. Generate changesets from conventional commits
2. Bump versions and generate changelogs
3. Consolidate changelog formatting
4. Generate combined release notes and write to a temporary file

```sh
qui-changesets prep-release [options]
```

| Option                        | Description                                                                   | Default                  |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| `--in-steps`                  | Pause after each step and wait for confirmation                               | `false`                  |
| `--from-release-tags`         | Diff each package from its most recent release tag instead of the base branch | `false`                  |
| `--include-commit-links`      | Embed commit hashes in changeset summaries for changelog links                | `false`                  |
| `--package-manager <command>` | Package manager command to use for `changeset version`                        | `pnpm`                   |
| `--config <path>`             | Path to the changesets config file, relative to the project root              | `.changeset/config.json` |

### `changeset-generate`

Generates changesets from conventional commits without running the full pipeline.

```sh
qui-changesets changeset-generate [options]
```

| Option                   | Description                                                                   | Default                  |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------ |
| `--from-release-tags`    | Diff each package from its most recent release tag instead of the base branch | `false`                  |
| `--include-commit-links` | Embed commit hashes in changeset summaries for changelog links                | `false`                  |
| `--config <path>`        | Path to the changesets config file, relative to the project root              | `.changeset/config.json` |

### `consolidate-changelogs`

Normalizes and reformats all changed `CHANGELOG.md` files into a consistent structure.

```sh
qui-changesets consolidate-changelogs
```

### `generate-release-notes`

Generates combined release notes from changed package changelogs, separating substantive changes from dependency-only updates.

```sh
qui-changesets generate-release-notes
```

### `check-versions`

Checks which packages have newer local versions than what is published on npm. Sets a `should-publish` GitHub Actions output.

```sh
qui-changesets check-versions [options]
```

| Option            | Description                                                      | Default                  |
| ----------------- | ---------------------------------------------------------------- | ------------------------ |
| `--config <path>` | Path to the changesets config file, relative to the project root | `.changeset/config.json` |

### `create-github-releases`

Creates GitHub releases for published packages by parsing their changelogs.

```sh
qui-changesets create-github-releases [options]
```

| Option                | Description                                                                        | Default                  |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| `--token <token>`     | GitHub token for authentication (falls back to `TOKEN` or `GITHUB_TOKEN` env vars) |                          |
| `--repo <owner/repo>` | GitHub repository in `owner/repo` format                                           | Derived from git remote  |
| `--config <path>`     | Path to the changesets config file, relative to the project root                   | `.changeset/config.json` |

## Programmatic API

The package also exports core functions for use in scripts:

```ts
import {
  conventionalCommitChangeset,
  consolidateChangelogs,
  generateReleaseNotes,
} from "@qualcomm-ui/changesets-cli"
```

## License

Licensed under the [BSD-3-Clause-Clear License](https://spdx.org/licenses/BSD-3-Clause-Clear.html).
