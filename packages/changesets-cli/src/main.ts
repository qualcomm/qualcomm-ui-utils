// Modified from https://github.com/iamchathu/changeset-conventional-commits
// Changes from Qualcomm Technologies, Inc. are provided under the following license:
// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import readChangeset from "@changesets/read"
import writeChangeset from "@changesets/write"
import {getPackagesSync} from "@manypkg/get-packages"
import {execSync} from "node:child_process"
import {readFileSync} from "node:fs"
import {join} from "node:path"

import {
  conventionalMessagesWithCommitsToChangesets,
  difference,
  getCommitsSinceBranch,
  getCommitsSinceCommit,
  translateCommitsToConventionalCommitMessages,
} from "./utils"

const CHANGESET_CONFIG_LOCATION = join(".changeset", "config.json")

function getCommitsWithMessages(commitHashes: string[]) {
  return commitHashes.map((commitHash) => {
    const commitMessage = execSync(
      `git log -n 1 --pretty=format:%B ${commitHash}`,
    ).toString()
    return {
      commitHash,
      commitMessage,
    }
  })
}

export interface ChangesetGenerateOptions {
  commitSha?: string | undefined
  configPath?: string | undefined
  includeCommitLinks?: boolean | undefined
}

export async function conventionalCommitChangeset(
  options: ChangesetGenerateOptions,
  cwd: string = process.cwd(),
) {
  const configLocation = options.configPath ?? CHANGESET_CONFIG_LOCATION
  const changesetConfig = JSON.parse(
    readFileSync(join(cwd, configLocation)).toString(),
  )
  const ignored = changesetConfig.ignore ?? []
  const packages = getPackagesSync(cwd).packages.filter(
    (pkg) =>
      Boolean(pkg.packageJson.version) &&
      !ignored.includes(pkg.packageJson.name),
  )

  const {baseBranch = "main"} = changesetConfig
  const {commitSha, includeCommitLinks} = options

  const commitsSinceRef = commitSha
    ? getCommitsSinceCommit(commitSha)
    : getCommitsSinceBranch(baseBranch)
  const commitsWithMessages = getCommitsWithMessages(commitsSinceRef)
  const changelogMessages =
    translateCommitsToConventionalCommitMessages(commitsWithMessages)

  const changesets = conventionalMessagesWithCommitsToChangesets(
    changelogMessages,
    {
      ignoredFiles: ignored,
      includeCommitLinks,
      packages,
    },
  )

  const currentChangesets = await readChangeset(cwd)

  const newChangesets =
    currentChangesets.length === 0
      ? changesets
      : difference(changesets, currentChangesets)

  await Promise.all(
    newChangesets.map((changeset) => writeChangeset(changeset, cwd)),
  )
}
