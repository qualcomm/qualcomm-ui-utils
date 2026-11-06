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

interface ParsedSummary {
  body: string
  commit?: string
  title: string
}

/**
 * Splits a changeset summary into its title (the first line), an optional
 * `commit:` field, and the markdown body that follows the title.
 */
function parseSummary(summary: string): ParsedSummary {
  let commit: string | undefined

  const [title = "", ...bodyLines] = summary
    .split("\n")
    .filter((line) => !line.trim().toLowerCase().startsWith("signed-off-by:"))
    .join("\n")
    .replace(/^\s*commit:\s*([^\s]+)/im, (_, match) => {
      commit = match
      return ""
    })
    .trim()
    .split("\n")

  const body = bodyLines
    .join("\n")
    .replace(/^\s*\n/, "")
    .trimEnd()

  return {body, commit, title: title.trim()}
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

    const {
      body,
      commit: commitFromSummary,
      title,
    } = parseSummary(changeset.summary)

    const typeMatch = title.match(
      /^(feat|fix|refactor|chore|perf|test|docs|styles?|ci|build)\s*(\(.+?\))?!?:\s*/i,
    )
    const conventionalType = typeMatch?.[1]?.toLowerCase()
    const scope = typeMatch?.[2]?.replace("(", "").replace(")", "")
    const isBreaking =
      title.includes("!:") ||
      title.toLowerCase().includes("breaking") ||
      body.includes("BREAKING CHANGE:")
    const summary = title
      .replace(
        /^(feat|fix|refactor|chore|perf|test|docs|styles?|ci|build)\s*(\(.+?\))?!?:\s*/i,
        "",
      )
      .trim()

    const section = isBreaking
      ? "BREAKING CHANGES"
      : typeMap[conventionalType ?? ""] || "Miscellaneous"

    let line = `### ${section}\n* ${scope ? `[${scope}]: ` : ""}${summary}`

    const commit = commitFromSummary || changeset.commit
    if (commit) {
      const shortCommit = commit.slice(0, 7)
      line += ` ([${shortCommit}](${options.repo}/commit/${commit}))`
    }

    if (body) {
      // Indent so the body nests under the list item. The blank line keeps it
      // from merging into the bullet's paragraph.
      const indented = body
        .split("\n")
        .map((bodyLine) => (bodyLine.trim() ? `  ${bodyLine}` : ""))
        .join("\n")
      line += `\n\n${indented}`
    }

    return line
  },
}

export default changelogFunctions
