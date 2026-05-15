// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {getPackagesSync} from "@manypkg/get-packages"
import {execFileSync, execSync} from "node:child_process"
import {existsSync, readFileSync} from "node:fs"
import {isAbsolute, join, relative, resolve, sep} from "node:path"

import type {PackageSnapshot} from "./update-jsdoc-since-tags"

const CHANGESET_CONFIG_LOCATION = join(".changeset", "config.json")

interface BumpVersionsOptions {
  exec?: (command: string) => void
  packageManager?: string
}

interface PackageSelectionOptions {
  cwd?: string
  directories?: string[]
  directory?: string
  packages?: PackageSnapshot[]
}

interface UpdatePackageSelectionOptions extends PackageSelectionOptions {
  configPath?: string
  diffRef?: string
  version?: string
}

function normalizePath(path: string) {
  return resolve(path)
}

function isWithinDirectory(parent: string, child: string) {
  const relativePath = relative(parent, child)
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  )
}

function getPackageLabel(directory: string) {
  return directory.replaceAll("\\", "/")
}

function getSelectedDirectory(cwd: string, directory: string) {
  return resolve(cwd, directory)
}

function getSelectedDirectories({
  cwd,
  directories,
  directory,
}: {
  cwd: string
  directories?: string[]
  directory?: string
}) {
  const selectedDirectories =
    directories && directories.length > 0
      ? directories
      : directory
        ? [directory]
        : []

  return selectedDirectories.map((selectedDirectory) => ({
    input: selectedDirectory,
    root: getSelectedDirectory(cwd, selectedDirectory),
  }))
}

function getPackageSourceSnapshot(
  pkg: PackageSnapshot,
  versionOverride?: string,
): PackageSnapshot {
  return {
    ...pkg,
    root: resolve(pkg.root, "src"),
    version: versionOverride ?? pkg.version,
  }
}

function getPackageSourceSnapshots(
  packages: PackageSnapshot[],
  versionOverride?: string,
) {
  return packages.map((pkg) => getPackageSourceSnapshot(pkg, versionOverride))
}

function normalizeGitPath(path: string) {
  return path.split(sep).join("/")
}

function getBaseBranch({
  configPath = CHANGESET_CONFIG_LOCATION,
  cwd,
}: {
  configPath?: string
  cwd: string
}) {
  const changesetConfig = JSON.parse(
    readFileSync(join(cwd, configPath), "utf-8"),
  )
  return changesetConfig.baseBranch ?? "main"
}

function getPackageVersionAtRef(
  pkg: PackageSnapshot,
  diffRef: string,
  cwd: string,
) {
  const packageJsonPath = normalizeGitPath(
    relative(cwd, join(pkg.root, "package.json")),
  )

  try {
    const packageJson = execFileSync(
      "git",
      ["show", `${diffRef}:${packageJsonPath}`],
      {
        cwd,
        encoding: "utf-8",
      },
    )
    return JSON.parse(packageJson).version as string | undefined
  } catch {
    return undefined
  }
}

function isGitRefResolvable(diffRef: string, cwd: string) {
  try {
    execFileSync("git", ["rev-parse", "--verify", `${diffRef}^{commit}`], {
      cwd,
      stdio: "ignore",
    })
    return true
  } catch {
    return false
  }
}

function getPackagesChangedSinceRef({
  cwd,
  diffRef,
  packages,
}: {
  cwd: string
  diffRef: string
  packages: PackageSnapshot[]
}) {
  if (!isGitRefResolvable(diffRef, cwd)) {
    throw new Error(`Git ref "${diffRef}" could not be resolved.`)
  }

  return packages.filter(
    (pkg) => getPackageVersionAtRef(pkg, diffRef, cwd) !== pkg.version,
  )
}

function findContainingPackage(directory: string, packages: PackageSnapshot[]) {
  return packages
    .filter((pkg) => isWithinDirectory(normalizePath(pkg.root), directory))
    .sort((a, b) => normalizePath(b.root).length - normalizePath(a.root).length)
    .at(0)
}

function selectCustomCheckSnapshots(
  directories: ReturnType<typeof getSelectedDirectories>,
  packages: PackageSnapshot[],
) {
  return directories.map(({input, root}) => {
    const containingPackage = findContainingPackage(root, packages)

    return {
      name: containingPackage?.name ?? getPackageLabel(input),
      root,
      version: containingPackage?.version,
    }
  })
}

function selectCustomUpdateSnapshots(
  directories: ReturnType<typeof getSelectedDirectories>,
  packages: PackageSnapshot[],
  versionOverride?: string,
) {
  return directories.map(({input, root}) => {
    const containingPackage = findContainingPackage(root, packages)
    const version = versionOverride ?? containingPackage?.version

    if (!version) {
      throw new Error(
        `Directory "${input}" is not within a package with a version. Pass --version to update arbitrary directories.`,
      )
    }

    return {
      name: containingPackage?.name ?? getPackageLabel(input),
      root,
      version,
    }
  })
}

function selectDefaultPackageSourceSnapshots({
  configPath,
  cwd = process.cwd(),
  diffRef,
  directories,
  directory,
  packages,
  version,
}: UpdatePackageSelectionOptions & {
  packages: PackageSnapshot[]
}): PackageSnapshot[] {
  const selectedDirectories = getSelectedDirectories({
    cwd,
    directories,
    directory,
  })
  if (selectedDirectories.length === 0) {
    const selectedDiffRef = diffRef ?? getBaseBranch({configPath, cwd})
    return getPackageSourceSnapshots(
      getPackagesChangedSinceRef({
        cwd,
        diffRef: selectedDiffRef,
        packages,
      }),
      version,
    )
  }

  return selectCustomUpdateSnapshots(selectedDirectories, packages, version)
}

function selectCheckPackageSnapshots({
  cwd = process.cwd(),
  directories,
  directory,
  packages,
}: PackageSelectionOptions & {packages: PackageSnapshot[]}): PackageSnapshot[] {
  const selectedDirectories = getSelectedDirectories({
    cwd,
    directories,
    directory,
  })
  if (selectedDirectories.length === 0) {
    return getPackageSourceSnapshots(packages)
  }

  return selectCustomCheckSnapshots(selectedDirectories, packages)
}

export function getPackageSnapshots(
  cwd: string = process.cwd(),
): PackageSnapshot[] {
  return getPackagesSync(cwd).packages.flatMap((pkg) => {
    const {name, version} = pkg.packageJson
    if (!name) {
      return []
    }
    const sourceRoot = join(pkg.dir, "src")
    if (!existsSync(sourceRoot)) {
      return []
    }

    return [{name, root: pkg.dir, version}]
  })
}

export function getCheckPackageSnapshots({
  cwd = process.cwd(),
  directories,
  directory,
  packages = getPackageSnapshots(cwd),
}: PackageSelectionOptions = {}): PackageSnapshot[] {
  return selectCheckPackageSnapshots({cwd, directories, directory, packages})
}

export function getUpdatePackageSnapshots({
  configPath,
  cwd = process.cwd(),
  diffRef,
  directories,
  directory,
  packages = getPackageSnapshots(cwd),
  version,
}: UpdatePackageSelectionOptions = {}): PackageSnapshot[] {
  return selectDefaultPackageSourceSnapshots({
    configPath,
    cwd,
    diffRef,
    directories,
    directory,
    packages,
    version,
  })
}

export function bumpVersionsAndMaybeUpdateJsDocSinceTags({
  exec = (command) => execSync(command, {stdio: "inherit"}),
  packageManager = "pnpm",
}: BumpVersionsOptions = {}) {
  const command = `${packageManager} changeset version`
  exec(command)
}
