// Modified from https://github.com/iamchathu/changeset-conventional-commits
// Changes from Qualcomm Technologies, Inc. are provided under the following license:
// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear
import type {Changeset, PackageJSON} from "@changesets/types"
import {execSync} from "node:child_process"

interface ManyPkgPackage {
  dir: string
  packageJson: PackageJSON
}

interface Commit {
  commitHash: string
  commitMessage: string
}

interface ConventionalMessagesToCommits {
  changelogMessage: string
  commitHashes: string[]
}

const defaultCommitTypes = [
  {section: "Features", type: "feat"},
  {section: "Features", type: "feature"},
  {section: "Bug Fixes", type: "fix"},
  {section: "Performance Improvements", type: "perf"},
  {section: "Reverts", type: "revert"},
  {section: "Documentation", type: "docs"},
  {section: "Styles", type: "style"},
  {section: "Styles", type: "styles"},
  {section: "Miscellaneous Chores", type: "chore"},
  {section: "Code Refactoring", type: "refactor"},
  {section: "Tests", type: "test"},
  {section: "Build System", type: "build"},
  {section: "Continuous Integration", type: "ci"},
]

function normalizeConventionalCommit(commit: string): string {
  const normalized = commit.replace(/^(\w+)\s+(\(.*?\))/, "$1$2")
  if (normalized.startsWith("- ")) {
    return normalized.substring(2)
  }
  return normalized
}

export function isConventionalCommit(commit: string) {
  const normalized = normalizeConventionalCommit(commit)
  return defaultCommitTypes.some((commitType) =>
    normalized.match(
      new RegExp(`^(?:-\\s)?${commitType.type}\\s*(?:\(.*\))?!?:`),
    ),
  )
}

export function isBreakingChange(commit: string) {
  const normalized = normalizeConventionalCommit(commit)
  return (
    normalized.includes("BREAKING CHANGE:") ||
    defaultCommitTypes.some((commitType) =>
      normalized.match(new RegExp(`^${commitType.type}\\s*(?:\(.*\))?!:`)),
    )
  )
}

export function translateCommitsToConventionalCommitMessages(
  commits: Commit[],
): ConventionalMessagesToCommits[] {
  return commits
    .filter((commit) => isConventionalCommit(commit.commitMessage))
    .map((commit) => ({
      changelogMessage: normalizeConventionalCommit(commit.commitMessage),
      commitHashes: [commit.commitHash],
    }))
}

export function getFilesChangedSince(opts: {from: string; to: string}) {
  return execSync(`git diff --name-only ${opts.from}~1...${opts.to}`)
    .toString()
    .trim()
    .split("\n")
}

export function getRepoRoot() {
  return execSync("git rev-parse --show-toplevel")
    .toString()
    .trim()
    .replace(/\n|\r/g, "")
}

function getCommitMessage(commitHash: string): string {
  return execSync(`git log -1 --pretty=%B ${commitHash}`).toString().trim()
}

function extractConventionalCommits(commitMessage: string): string[] {
  const lines = commitMessage.split("\n")
  const conventionalCommits: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && isConventionalCommit(trimmed)) {
      conventionalCommits.push(normalizeConventionalCommit(trimmed))
    }
  }
  return conventionalCommits
}

export function conventionalMessagesWithCommitsToChangesets(
  conventionalMessagesToCommits: ConventionalMessagesToCommits[],
  options: {
    ignoredFiles?: (string | RegExp)[]
    includeCommitLinks?: boolean
    packages: ManyPkgPackage[]
  },
) {
  const {ignoredFiles = [], includeCommitLinks, packages} = options
  return conventionalMessagesToCommits
    .flatMap((entry) => {
      const filesChanged = getFilesChangedSince({
        from: entry.commitHashes[0],
        to: entry.commitHashes[entry.commitHashes.length - 1],
      }).filter((file) => {
        return ignoredFiles.every(
          (ignoredPattern) => !file.match(ignoredPattern),
        )
      })
      const packagesChanged = packages.filter((pkg) => {
        const pkgPath = pkg.dir.replace(`${getRepoRoot()}/`, "")
        return filesChanged.some((file) => file.startsWith(`${pkgPath}/`))
      })
      if (packagesChanged.length === 0) {
        return []
      }
      const allConventionalCommits = entry.commitHashes
        .flatMap((hash) => {
          const fullMessage = getCommitMessage(hash)
          return extractConventionalCommits(fullMessage).map((msg) => ({
            hash,
            message: msg,
          }))
        })
        .filter(
          (item, index, self) =>
            index === self.findIndex((other) => other.message === item.message),
        )
      return allConventionalCommits.flatMap(
        ({hash, message: conventionalCommit}) => {
          const changeType = isBreakingChange(conventionalCommit)
            ? "major"
            : conventionalCommit.startsWith("feat")
              ? "minor"
              : "patch"
          return {
            packagesChanged,
            releases: packagesChanged.map((pkg) => ({
              name: pkg.packageJson.name,
              type: changeType,
            })),
            summary: includeCommitLinks
              ? `${conventionalCommit}\n\ncommit: ${hash.slice(0, 7)}`
              : conventionalCommit,
          } as Changeset
        },
      )
    })
    .filter(Boolean)
}

export function gitFetch(branch: string) {
  execSync(`git fetch origin ${branch}`)
}

export function getCurrentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
}

export function getCommitsSinceRef(branch: string) {
  gitFetch(branch)
  const currentBranch = getCurrentBranch()
  let sinceRef = `origin/${branch}`

  if (currentBranch === branch) {
    try {
      sinceRef = execSync("git describe --tags --abbrev=0").toString()
    } catch (e) {
      console.log(
        "No git tags found, using repo's first commit for automated change detection. Note: this may take a while.",
      )
      sinceRef = execSync("git rev-list --max-parents=0 HEAD").toString()
    }
  }

  sinceRef = sinceRef.trim()
  return execSync(`git rev-list ${sinceRef}..HEAD`)
    .toString()
    .split("\n")
    .filter(Boolean)
    .reverse()
}

export function tagExists(tag: string): boolean {
  try {
    execSync(`git rev-parse --verify refs/tags/${tag}`, {stdio: "pipe"})
    return true
  } catch {
    return false
  }
}

export function getCommitsSincePackageRelease(
  packageName: string,
  version: string,
  baseBranch: string,
): string[] {
  const releaseTag = `${packageName}@${version}`

  if (tagExists(releaseTag)) {
    return execSync(`git rev-list ${releaseTag}..HEAD`)
      .toString()
      .split("\n")
      .filter(Boolean)
      .reverse()
  }

  gitFetch(baseBranch)
  return execSync(`git rev-list origin/${baseBranch}..HEAD`)
    .toString()
    .split("\n")
    .filter(Boolean)
    .reverse()
}

function compareChangeSet(a: Changeset, b: Changeset): boolean {
  return (
    a.summary.replace(/\n$/, "") === b.summary &&
    JSON.stringify(a.releases) === JSON.stringify(b.releases)
  )
}

export function difference(a: Changeset[], b: Changeset[]): Changeset[] {
  return a.filter(
    (changeA) => !b.some((changeB) => compareChangeSet(changeA, changeB)),
  )
}
