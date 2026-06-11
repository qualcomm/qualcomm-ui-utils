// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {Octokit} from "@octokit/rest"
import {execSync} from "node:child_process"
import {readFile} from "node:fs/promises"
import {join} from "node:path"

import {getPublishablePackages} from "./publishable-packages.js"

interface GitHubReleaseOptions {
  configPath?: string
  repo?: string
  token: string
}

/**
 * Parses a changelog file to extract the latest version entry.
 *
 * @param path - Path to the CHANGELOG.md file
 * @returns Object containing version, date, and body of the latest entry, or null if parsing fails
 */
async function parseChangelog(path: string) {
  const content = await readFile(path, "utf-8")
  const lines = content.split("\n")
  const firstVersionIndex = lines.findIndex((l) => l.startsWith("## "))
  if (firstVersionIndex === -1) {
    console.log(`  No version header found`)
    return null
  }
  const headerLine = lines[firstVersionIndex]
  const match = headerLine.match(/^## ([\d.]+)/)
  if (!match) {
    console.log(`  Invalid version format: ${headerLine}`)
    return null
  }
  const [, version, date] = match
  const endIndex = lines.findIndex(
    (l, i) => i > firstVersionIndex && l.startsWith("## "),
  )
  const body = lines
    .slice(firstVersionIndex + 1, endIndex === -1 ? undefined : endIndex)
    .join("\n")
    .trim()
  return {body, date, version}
}

function getRepoFromGitRemote(): {owner: string; repo: string} {
  const remoteUrl = execSync("git remote get-url origin").toString().trim()
  // Handles both HTTPS (https://github.com/owner/repo.git) and SSH (git@github.com:owner/repo.git)
  const match = remoteUrl.match(
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/,
  )
  if (!match) {
    throw new Error(
      `Could not parse GitHub owner/repo from remote URL: ${remoteUrl}, use --repo to specify explicitly.`,
    )
  }
  return {owner: match[1], repo: match[2]}
}

export async function createGitHubReleases(options: GitHubReleaseOptions) {
  const octokit = new Octokit({auth: options.token})
  const repoOpts = options.repo
    ? {owner: options.repo.split("/")[0], repo: options.repo.split("/")[1]}
    : getRepoFromGitRemote()

  const packages = await getPublishablePackages(options.configPath)

  for (const pkg of packages) {
    const changelogPath = join(pkg.dir, "CHANGELOG.md")
    const changelog = await parseChangelog(changelogPath).catch(() => null)
    if (!changelog) {
      console.warn(
        "no changelog found, skipping package:",
        pkg.packageJson.name,
      )
      continue
    }
    if (changelog.version !== pkg.packageJson.version) {
      console.log(
        `Skipping ${pkg.packageJson.name}: changelog ${changelog.version} !== package.json ${pkg.packageJson.version}`,
      )
      continue
    }
    const tag = `${pkg.packageJson.name}@${changelog.version}`
    const release = await octokit.repos
      .getReleaseByTag({
        ...repoOpts,
        tag,
      })
      .catch(() => null)
    if (release) {
      console.log(
        `Release \x1b[93m${release.data.name}\x1b[0m already exists, skipping`,
      )
      continue
    }
    console.log(`Creating release: \x1b[96m${tag}\x1b[0m`)
    await octokit.repos.createRelease({
      ...repoOpts,
      body: changelog.body,
      name: tag,
      tag_name: tag,
    })
  }
}
