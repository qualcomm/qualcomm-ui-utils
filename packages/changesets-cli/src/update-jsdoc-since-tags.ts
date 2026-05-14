// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {readdir, readFile} from "node:fs/promises"
import {extname, join, relative, sep} from "node:path"
import {
  type Node as MorphNode,
  Node,
  Project,
  type SourceFile,
  ts,
} from "ts-morph"

export interface PackageSnapshot {
  name: string
  root: string
  version?: string
}

export interface UpdateJsDocSinceTagsOptions {
  afterPackages: PackageSnapshot[]
  beforePackages: PackageSnapshot[]
  cwd?: string
  onProgress?: (line: string) => void
}

export interface UpdatedPackageSummary {
  fileCount: number
  name: string
  tagCount: number
  version: string
}

export interface UpdateJsDocSinceTagsResult {
  unresolvedFiles: string[]
  updatedPackages: UpdatedPackageSummary[]
}

export interface CheckJsDocSinceTagsOptions {
  cwd?: string
  packages: PackageSnapshot[]
}

export interface JsDocSinceTagLocation {
  entityName: string
  filePath: string
}

export interface CheckJsDocSinceTagsResult {
  unresolvedTags: JsDocSinceTagLocation[]
}

export interface UpdateJsDocSinceTagsForPackagesOptions {
  cwd?: string
  onProgress?: (line: string) => void
  packages: PackageSnapshot[]
}

interface BumpedPackage {
  name: string
  root: string
  version: string
}

const NEXT_RELEASE = "next-release"
const NEXT_RELEASE_TAG_PATTERN = /@since\s+next-release\b/

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
])

const EXCLUDED_DIRECTORIES = new Set([
  ".turbo",
  "__tests__",
  "build",
  "coverage",
  "dist",
  "lib",
  "node_modules",
])

const TEST_FILE_PATTERN = /\.(spec|test)\.[cm]?[jt]sx?$/

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural
}

export function formatJsDocSinceUpdateStartMessage() {
  return "Updating JSDoc @since tags..."
}

export function formatJsDocSincePackageUpdateProgress({
  name,
  version,
}: Pick<BumpedPackage, "name" | "version">) {
  return `Processing package ${name} ${version}...`
}

function normalizeRelativePath(cwd: string, filePath: string) {
  return relative(cwd, filePath).split(sep).join("/")
}

function hasNextReleaseSinceTag(content: string) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    content,
  )

  let token = scanner.scan()
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.MultiLineCommentTrivia) {
      const text = scanner.getTokenText()
      if (text.startsWith("/**") && NEXT_RELEASE_TAG_PATTERN.test(text)) {
        return true
      }
    }
    token = scanner.scan()
  }

  return false
}

function getNodeName(node: MorphNode) {
  if (
    Node.isClassDeclaration(node) ||
    Node.isEnumDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isInterfaceDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isMethodSignature(node) ||
    Node.isPropertyDeclaration(node) ||
    Node.isPropertySignature(node) ||
    Node.isTypeAliasDeclaration(node)
  ) {
    return node.getName()
  }

  if (Node.isVariableStatement(node)) {
    return node
      .getDeclarationList()
      .getDeclarations()
      .map((declaration) => declaration.getName())
      .join(", ")
  }

  return undefined
}

function getQualifiedEntityName(node: MorphNode) {
  const name = getNodeName(node)
  if (!name) {
    return "unknown"
  }

  const parent = node.getParent()
  const parentName = parent ? getNodeName(parent) : undefined
  if (parentName) {
    return `${parentName}.${name}`
  }

  return name
}

function getBumpedPackages({
  afterPackages,
  beforePackages,
}: UpdateJsDocSinceTagsOptions): BumpedPackage[] {
  const beforeByName = new Map(
    beforePackages.map((pkg) => [pkg.name, pkg.version]),
  )

  return afterPackages.flatMap((pkg) => {
    const beforeVersion = beforeByName.get(pkg.name)
    if (!beforeVersion || !pkg.version || beforeVersion === pkg.version) {
      return []
    }

    return [{name: pkg.name, root: pkg.root, version: pkg.version}]
  })
}

function getVersionedPackages(packages: PackageSnapshot[]): BumpedPackage[] {
  return packages.flatMap((pkg) => {
    if (!pkg.version) {
      return []
    }

    return [{name: pkg.name, root: pkg.root, version: pkg.version}]
  })
}

function isSourceFile(filePath: string) {
  return (
    SOURCE_EXTENSIONS.has(extname(filePath)) &&
    !TEST_FILE_PATTERN.test(filePath)
  )
}

async function getSourceFiles(dir: string): Promise<string[]> {
  const entries = (await readdir(dir, {withFileTypes: true})).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const files: string[] = []

  for (const entry of entries) {
    const entryPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        files.push(...(await getSourceFiles(entryPath)))
      }
      continue
    }

    if (entry.isFile() && isSourceFile(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

async function updateSourceFile(filePath: string, version: string) {
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      checkJs: false,
    },
    manipulationSettings: {
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
      useTrailingCommas: true,
    },
    skipAddingFilesFromTsConfig: true,
  })
  const sourceFile = project.addSourceFileAtPath(filePath)
  let tagCount = 0

  sourceFile.forEachDescendant((node) => {
    if (!Node.isJSDocable(node)) {
      return
    }

    for (const jsDoc of node.getJsDocs()) {
      for (const tag of jsDoc.getTags()) {
        if (
          tag.getTagName() === "since" &&
          tag.getCommentText()?.trim() === NEXT_RELEASE
        ) {
          tag.set({tagName: "since", text: version})
          tagCount += 1
        }
      }
    }
  })

  if (tagCount > 0) {
    await sourceFile.save()
  }

  return tagCount
}

async function findUnresolvedFiles(cwd: string, sourceFiles: string[]) {
  const unresolvedFiles: string[] = []

  for (const filePath of sourceFiles) {
    const content = await readFile(filePath, "utf-8")
    if (hasNextReleaseSinceTag(content)) {
      unresolvedFiles.push(normalizeRelativePath(cwd, filePath))
    }
  }

  return unresolvedFiles
}

function collectSourceFileSinceTagLocations(
  cwd: string,
  sourceFile: SourceFile,
): JsDocSinceTagLocation[] {
  const filePath = normalizeRelativePath(cwd, sourceFile.getFilePath())
  const locations: JsDocSinceTagLocation[] = []

  sourceFile.forEachDescendant((node) => {
    if (!Node.isJSDocable(node)) {
      return
    }

    for (const jsDoc of node.getJsDocs()) {
      for (const tag of jsDoc.getTags()) {
        if (
          tag.getTagName() === "since" &&
          tag.getCommentText()?.trim() === NEXT_RELEASE
        ) {
          locations.push({
            entityName: getQualifiedEntityName(node),
            filePath,
          })
        }
      }
    }
  })

  return locations
}

function createProject() {
  return new Project({
    compilerOptions: {
      allowJs: true,
      checkJs: false,
    },
    manipulationSettings: {
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
      useTrailingCommas: true,
    },
    skipAddingFilesFromTsConfig: true,
  })
}

function getFileSinceTagLocations(cwd: string, filePath: string) {
  const project = createProject()
  return collectSourceFileSinceTagLocations(
    cwd,
    project.addSourceFileAtPath(filePath),
  )
}

export async function checkJsDocSinceTags({
  cwd = process.cwd(),
  packages,
}: CheckJsDocSinceTagsOptions): Promise<CheckJsDocSinceTagsResult> {
  const unresolvedTags: JsDocSinceTagLocation[] = []

  for (const pkg of packages) {
    const sourceFiles = await getSourceFiles(pkg.root)
    for (const filePath of sourceFiles) {
      unresolvedTags.push(...getFileSinceTagLocations(cwd, filePath))
    }
  }

  return {unresolvedTags}
}

async function updatePackages(
  cwd: string,
  packages: BumpedPackage[],
  onProgress?: (line: string) => void,
): Promise<UpdateJsDocSinceTagsResult> {
  const updatedPackages: UpdatedPackageSummary[] = []
  const unresolvedFiles: string[] = []

  for (const pkg of packages) {
    onProgress?.(formatJsDocSincePackageUpdateProgress(pkg))

    const sourceFiles = await getSourceFiles(pkg.root)
    let fileCount = 0
    let tagCount = 0

    for (const filePath of sourceFiles) {
      const updatedTags = await updateSourceFile(filePath, pkg.version)
      if (updatedTags > 0) {
        fileCount += 1
        tagCount += updatedTags
      }
    }

    if (tagCount > 0) {
      updatedPackages.push({
        fileCount,
        name: pkg.name,
        tagCount,
        version: pkg.version,
      })
    }

    unresolvedFiles.push(...(await findUnresolvedFiles(cwd, sourceFiles)))
  }

  return {unresolvedFiles, updatedPackages}
}

export async function updateJsDocSinceTagsForPackages({
  cwd = process.cwd(),
  onProgress,
  packages,
}: UpdateJsDocSinceTagsForPackagesOptions): Promise<UpdateJsDocSinceTagsResult> {
  return updatePackages(cwd, getVersionedPackages(packages), onProgress)
}

export async function updateJsDocSinceTagsForBumpedPackages(
  options: UpdateJsDocSinceTagsOptions,
): Promise<UpdateJsDocSinceTagsResult> {
  return updatePackages(
    options.cwd ?? process.cwd(),
    getBumpedPackages(options),
    options.onProgress,
  )
}

export function formatJsDocSinceUpdateResult(
  result: UpdateJsDocSinceTagsResult,
): string[] {
  const lines: string[] = []

  if (result.updatedPackages.length > 0) {
    lines.push("Updated JSDoc @since tags:")
    for (const pkg of result.updatedPackages) {
      lines.push(
        `  ${pkg.name} ${pkg.version}: ${pkg.tagCount} ${pluralize(
          pkg.tagCount,
          "tag",
          "tags",
        )} in ${pkg.fileCount} ${pluralize(pkg.fileCount, "file", "files")}`,
      )
    }
  }

  if (result.unresolvedFiles.length > 0) {
    if (lines.length > 0) {
      lines.push("")
    }

    lines.push(
      "Warning: unresolved @since next-release tags remain after JSDoc version update:",
    )
    lines.push(...result.unresolvedFiles.map((filePath) => `  ${filePath}`))
    lines.push("")
    lines.push(
      "These tags were not rewritten automatically. This is non-blocking, but the updater may need to support another JSDoc shape.",
    )
  }

  return lines
}

export function formatJsDocSinceCheckResult(
  result: CheckJsDocSinceTagsResult,
): string[] {
  if (result.unresolvedTags.length === 0) {
    return ["No @since next-release tags found."]
  }

  return [
    "Found @since next-release tags:",
    ...result.unresolvedTags.map(
      ({entityName, filePath}) => `  ${filePath}: ${entityName}`,
    ),
  ]
}
