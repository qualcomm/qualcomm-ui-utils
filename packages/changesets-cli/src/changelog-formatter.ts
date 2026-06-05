// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

interface ChangesetInfo {
  commit?: string
  summary: string
}

interface DependencyUpdated {
  name: string
  newVersion: string
}

interface ChangelogOptions {
  repo: string
}

const typeMap: Record<string, string> = {
  build: "Build System",
  chore: "Miscellaneous Chores",
  ci: "Continuous Integration",
  docs: "Documentation",
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance Improvements",
  refactor: "Code Refactoring",
  style: "Styles",
  styles: "Styles",
  test: "Tests",
}

const changelogFunctions = {
  getDependencyReleaseLine: (
    _changesets: unknown,
    dependenciesUpdated: DependencyUpdated[],
    options: ChangelogOptions,
  ) => {
    if (!options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["./changelog.js", { "repo": "org/repo" }]',
      )
    }
    if (dependenciesUpdated.length === 0) {
      return ""
    }

    const deps = dependenciesUpdated
      // TODO: link to changelog?
      .map((d) => `${d.name}@${d.newVersion}`)
      .join(", ")
    return `### Miscellaneous Chores\n* **deps:** update dependencies [${deps}]`
  },

  getReleaseLine: (
    changeset: ChangesetInfo,
    _type: string,
    options: ChangelogOptions,
  ) => {
    if (!options?.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["./changelog.js", { "repo": "org/repo" }]',
      )
    }

    let commitFromSummary: string | undefined

    const cleanedSummary = changeset.summary
      .split("\n")
      .filter((line) => !line.trim().toLowerCase().startsWith("signed-off-by:"))
      .join("\n")
      .replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
        commitFromSummary = commit
        return ""
      })
      .trim()

    const prMatch = cleanedSummary.match(/\(#(\d+)\)/)
    const prNumber = prMatch?.[1]

    const typeMatch = cleanedSummary.match(
      /^(feat|fix|refactor|chore|perf|test|docs|styles?|ci|build)\s*(\(.+?\))?!?:\s*/i,
    )
    const conventionalType = typeMatch?.[1]?.toLowerCase()
    const scope = typeMatch?.[2]?.replace("(", "").replace(")", "")
    const isBreaking =
      cleanedSummary.includes("!:") ||
      cleanedSummary.toLowerCase().includes("breaking")
    const summary = cleanedSummary
      .replace(
        /^(feat|fix|refactor|chore|perf|test|docs|styles?|ci|build)\s*(\(.+?\))?!?:\s*/i,
        "",
      )
      .replace(/\s*\(#\d+\)\s*$/, "")
      .trim()

    const section = isBreaking
      ? "BREAKING CHANGES"
      : typeMap[conventionalType ?? ""] || "Miscellaneous"

    let line = `### ${section}\n* ${scope ? `[${scope}]: ` : ""}${summary}`

    if (prNumber) {
      line += ` ([#${prNumber}](${options.repo}/issues/${prNumber}))`
    }

    const commit = commitFromSummary || changeset.commit
    if (commit) {
      const shortCommit = commit.slice(0, 7)
      line += ` ([${shortCommit}](${options.repo}/commit/${commit}))`
    }

    return line
  },
}

export default changelogFunctions
