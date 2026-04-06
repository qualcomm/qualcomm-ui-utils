// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {getPackages} from "@manypkg/get-packages"
import {readFile} from "node:fs/promises"
import {join, resolve} from "node:path"

const DEFAULT_CONFIG_LOCATION = join(".changeset", "config.json")

/**
 * Retrieves all packages in the monorepo that should be published.
 * Filters out packages marked as private and ignored packages.
 *
 * @param configPath - Path to the changesets config file, relative to cwd
 * @param cwd - Working directory (defaults to process.cwd())
 * @returns Array of package objects that are eligible for publishing
 */
export async function getPublishablePackages(
  configPath?: string,
  cwd: string = process.cwd(),
) {
  const {packages} = await getPackages(cwd)
  const changesetConfig = JSON.parse(
    await readFile(
      resolve(cwd, configPath ?? DEFAULT_CONFIG_LOCATION),
      "utf-8",
    ),
  )
  const ignoredPackages = new Set<string>(changesetConfig.ignored ?? [])
  return packages.filter((pkg) => {
    if (ignoredPackages.has(pkg.packageJson.name)) {
      return false
    }
    if (!pkg.packageJson.version) {
      return false
    }
    return !pkg.packageJson.private
  })
}
