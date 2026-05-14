// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {program} from "@commander-js/extra-typings"
import {stdin, stdout} from "node:process"
import {createInterface} from "node:readline/promises"

import {checkVersions} from "./check-versions"
import {consolidateChangelogs} from "./consolidate-changelogs"
import {createGitHubReleases} from "./create-github-releases"
import {generateReleaseNotes} from "./generate-release-notes"
import {conventionalCommitChangeset} from "./main"
import {
  checkJsDocSinceTags,
  formatJsDocSinceCheckResult,
  formatJsDocSinceUpdateResult,
  formatJsDocSinceUpdateStartMessage,
  updateJsDocSinceTagsForPackages,
} from "./update-jsdoc-since-tags"
import {
  bumpVersionsAndMaybeUpdateJsDocSinceTags,
  getCheckPackageSnapshots,
  getUpdatePackageSnapshots,
} from "./version-bump"

interface Step {
  description: string
  name: string
  run: () => void | Promise<void>
}

function buildSteps(options: {
  commitSha?: string
  config?: string
  includeCommitLinks?: boolean
  packageManager?: string
}): Step[] {
  const pm = options.packageManager ?? "pnpm"

  return [
    {
      description: "Generate changesets from conventional commits",
      name: "changeset-generate",
      run: () =>
        conventionalCommitChangeset({
          commitSha: options.commitSha,
          configPath: options.config,
          includeCommitLinks: options.includeCommitLinks,
        }),
    },
    {
      description: "Bump versions and generate changelogs",
      name: "bump",
      run: () =>
        bumpVersionsAndMaybeUpdateJsDocSinceTags({
          packageManager: pm,
        }),
    },
    {
      description: "Consolidate changelog formatting",
      name: "consolidate-changelogs",
      run: () => consolidateChangelogs(),
    },
    {
      description: "Generate combined release notes",
      name: "generate-release-notes",
      run: async () => {
        await generateReleaseNotes()
      },
    },
  ]
}

async function waitForConfirmation(stepName: string): Promise<boolean> {
  const rl = createInterface({input: stdin, output: stdout})
  try {
    const answer = await rl.question(
      `\nStep "${stepName}" completed. Continue to next step? [Y/n] `,
    )
    return answer.trim().toLowerCase() !== "n"
  } finally {
    rl.close()
  }
}

async function run(options: {
  commitSha?: string
  config?: string
  includeCommitLinks?: boolean
  inSteps?: boolean
  packageManager?: string
}) {
  const steps = buildSteps(options)

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const stepLabel = `[${i + 1}/${steps.length}]`
    console.log(`\n${stepLabel} ${step.description}...`)

    try {
      await step.run()
    } catch (e) {
      console.error(`\nStep "${step.name}" failed. Aborting prep-release.`)
      console.error(e)
      process.exit(1)
    }

    if (options.inSteps && i < steps.length - 1) {
      const shouldContinue = await waitForConfirmation(step.name)
      if (!shouldContinue) {
        console.log("Aborted by user.")
        process.exit(0)
      }
    }
  }

  console.log("\nAll prep-release steps completed.")
}

program.allowUnknownOption(false)

program
  .command("prep-release")
  .description("Run all prep-release steps sequentially")
  .option(
    "--in-steps",
    "Pause after each step and wait for confirmation before continuing",
    false,
  )
  .option(
    "--commit-sha <sha>",
    "Diff each package against the target commit instead of the repository's base branch",
  )
  .option(
    "--include-commit-links",
    "Embed commit hashes in changeset summaries for changelog links",
    false,
  )
  .option(
    "--package-manager <command>",
    "Package manager command to use for changeset version",
    "pnpm",
  )
  .option(
    "--config <path>",
    "Path to the changesets config file, relative to the project root",
  )
  .action((options) => run(options))

program
  .command("changeset-generate")
  .description("Generate changesets from conventional commits")
  .option(
    "--commit-sha <sha>",
    "Diff each package against the target commit instead of the repository's base branch",
  )
  .option(
    "--include-commit-links",
    "Embed commit hashes in changeset summaries for changelog links",
    false,
  )
  .option(
    "--config <path>",
    "Path to the changesets config file, relative to the project root",
  )
  .action(({config, ...options}) =>
    conventionalCommitChangeset({...options, configPath: config}),
  )

program
  .command("consolidate-changelogs")
  .description("Consolidate changelog formatting")
  .action(() => consolidateChangelogs())

program
  .command("generate-release-notes")
  .description("Generate combined release notes")
  .action(async () => {
    await generateReleaseNotes()
  })

program
  .command("check-versions")
  .description(
    "Check which packages have newer versions than what is published on npm",
  )
  .option(
    "--config <path>",
    "Path to the changesets config file, relative to the project root",
  )
  .action((options) => checkVersions({configPath: options.config}))

program
  .command("check-jsdoc-since-tags")
  .argument(
    "[directories...]",
    "Directories to scan instead of package sources. If this is omitted, the `src` folder will be used by default",
  )
  .description(
    "Check for JSDoc @since next-release tags without modifying files",
  )
  .action(async (directories) => {
    const result = await checkJsDocSinceTags({
      packages: getCheckPackageSnapshots({directories}),
    })
    for (const line of formatJsDocSinceCheckResult(result)) {
      console.log(line)
    }
  })

program
  .command("update-jsdoc-since-tags")
  .argument(
    "[directories...]",
    "Directories to update instead of package sources",
  )
  .option(
    "--version <version>",
    "Version to use instead of each containing package's current version",
  )
  .option(
    "--diff-ref <git-ref>",
    "Git ref to compare package versions against (defaults to the changesets base branch)",
  )
  .description(
    "Replace JSDoc @since next-release tags with package or explicit versions",
  )
  .action(async (directories, options) => {
    console.log(formatJsDocSinceUpdateStartMessage())
    const result = await updateJsDocSinceTagsForPackages({
      onProgress: console.log,
      packages: getUpdatePackageSnapshots({
        diffRef: options.diffRef,
        directories,
        version: options.version,
      }),
    })
    const lines = formatJsDocSinceUpdateResult(result)
    if (lines.length === 0) {
      console.log("No JSDoc @since next-release tags updated.")
      return
    }

    for (const line of lines) {
      console.log(line)
    }
  })

program
  .command("create-github-releases")
  .description("Create GitHub releases for published packages from changelogs")
  .option(
    "--token <token>",
    "GitHub token for authentication (falls back to TOKEN or GITHUB_TOKEN env vars)",
  )
  .option(
    "--repo <owner/repo>",
    "GitHub repository in owner/repo format (defaults to git remote origin)",
  )
  .option(
    "--config <path>",
    "Path to the changesets config file, relative to the project root",
  )
  .action((options) => {
    const token = options.token ?? process.env.TOKEN ?? process.env.GITHUB_TOKEN
    if (!token) {
      console.error(
        "GitHub token is required. Use --token, or set TOKEN or GITHUB_TOKEN env var.",
      )
      process.exit(1)
    }
    return createGitHubReleases({
      configPath: options.config,
      repo: options.repo,
      token,
    })
  })

program.parse(process.argv)
