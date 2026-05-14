import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {afterEach, describe, expect, it, vi} from "vitest"

import {
  checkJsDocSinceTags,
  formatJsDocSinceCheckResult,
  formatJsDocSincePackageUpdateProgress,
  formatJsDocSinceUpdateResult,
  formatJsDocSinceUpdateStartMessage,
  type PackageSnapshot,
  updateJsDocSinceTagsForBumpedPackages,
  updateJsDocSinceTagsForPackages,
} from "./update-jsdoc-since-tags"

const tempRoots: string[] = []

async function createTempPackageRoot() {
  const root = await mkdtemp(join(tmpdir(), "qui-jsdoc-since-"))
  tempRoots.push(root)
  return root
}

async function writeFixture(
  root: string,
  relativePath: string,
  content: string,
) {
  const fullPath = join(root, relativePath)
  await mkdir(dirname(fullPath), {recursive: true})
  await writeFile(fullPath, content)
  return fullPath
}

function snapshot(
  root: string,
  version: string,
  name = "@qualcomm-ui/example",
): PackageSnapshot {
  return {name, root, version}
}

describe("updateJsDocSinceTagsForBumpedPackages", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots
        .splice(0)
        .map((root) => rm(root, {force: true, recursive: true})),
    )
    vi.restoreAllMocks()
  })

  it("replaces attached @since next-release tags in bumped packages", async () => {
    const root = await createTempPackageRoot()
    const file = await writeFixture(
      root,
      "index.ts",
      [
        "/**",
        " * Creates a value.",
        " * @since next-release",
        " */",
        "export function createValue() {}",
        "",
        "/**",
        " * Box.",
        " * @since next-release",
        " */",
        "export const Box = () => null",
        "",
        "/**",
        " * Existing value.",
        " * @since 1.0.0",
        " */",
        "export class ExistingValue {}",
        "",
        "/**",
        " * Options.",
        " * @since next-release",
        " */",
        "export interface CreateOptions {",
        "  /**",
        "   * Label.",
        "   * @since next-release",
        "   */",
        "  label: string",
        "",
        "  /**",
        "   * Runs.",
        "   * @since next-release",
        "   */",
        "  run(): void",
        "}",
        "",
        "/**",
        " * Value.",
        " * @since next-release",
        " */",
        "export type Value = string",
        "",
      ].join("\n"),
    )

    const result = await updateJsDocSinceTagsForBumpedPackages({
      afterPackages: [snapshot(root, "1.2.0")],
      beforePackages: [snapshot(root, "1.1.0")],
      cwd: root,
    })

    await expect(readFile(file, "utf-8")).resolves.toContain("@since 1.2.0")
    await expect(readFile(file, "utf-8")).resolves.toContain("@since 1.0.0")
    expect(result.updatedPackages).toEqual([
      {
        fileCount: 1,
        name: "@qualcomm-ui/example",
        tagCount: 6,
        version: "1.2.0",
      },
    ])
    expect(result.unresolvedFiles).toEqual([])
  })

  it("does not rewrite packages whose versions did not change", async () => {
    const root = await createTempPackageRoot()
    const file = await writeFixture(
      root,
      "index.ts",
      "/**\n * Stable.\n * @since next-release\n */\nexport function stable() {}\n",
    )

    const result = await updateJsDocSinceTagsForBumpedPackages({
      afterPackages: [snapshot(root, "1.1.0")],
      beforePackages: [snapshot(root, "1.1.0")],
      cwd: root,
    })

    await expect(readFile(file, "utf-8")).resolves.toContain(
      "@since next-release",
    )
    expect(result.updatedPackages).toEqual([])
    expect(result.unresolvedFiles).toEqual([])
  })

  it("warns without failing when unresolved placeholders remain", async () => {
    const root = await createTempPackageRoot()
    const file = await writeFixture(
      root,
      "index.ts",
      [
        "const example = 1",
        "",
        "/**",
        " * @since next-release",
        " */",
        "",
      ].join("\n"),
    )

    const result = await updateJsDocSinceTagsForBumpedPackages({
      afterPackages: [snapshot(root, "1.2.0")],
      beforePackages: [snapshot(root, "1.1.0")],
      cwd: root,
    })

    await expect(readFile(file, "utf-8")).resolves.toContain(
      "@since next-release",
    )
    expect(result.updatedPackages).toEqual([])
    expect(result.unresolvedFiles).toEqual(["index.ts"])
  })

  it("does not touch excluded output directories", async () => {
    const root = await createTempPackageRoot()
    const file = await writeFixture(
      root,
      "dist/index.ts",
      "/**\n * Generated.\n * @since next-release\n */\nexport function generated() {}\n",
    )

    const result = await updateJsDocSinceTagsForBumpedPackages({
      afterPackages: [snapshot(root, "1.2.0")],
      beforePackages: [snapshot(root, "1.1.0")],
      cwd: root,
    })

    await expect(readFile(file, "utf-8")).resolves.toContain(
      "@since next-release",
    )
    expect(result.updatedPackages).toEqual([])
    expect(result.unresolvedFiles).toEqual([])
  })

  it("does not scan test files inside package source directories", async () => {
    const root = await createTempPackageRoot()
    await writeFixture(
      root,
      "src/index.spec.ts",
      "/**\n * Spec helper.\n * @since next-release\n */\nexport function helper() {}\n",
    )
    await writeFixture(
      root,
      "src/__tests__/index.ts",
      "/**\n * Test helper.\n * @since next-release\n */\nexport function testHelper() {}\n",
    )

    const result = await checkJsDocSinceTags({
      cwd: root,
      packages: [snapshot(join(root, "src"), "1.1.0")],
    })

    expect(result.unresolvedTags).toEqual([])
  })

  it("replaces attached @since next-release tags using current package versions", async () => {
    const firstRoot = await createTempPackageRoot()
    const secondRoot = await createTempPackageRoot()
    const firstFile = await writeFixture(
      firstRoot,
      "src/index.ts",
      "/**\n * First.\n * @since next-release\n */\nexport function first() {}\n",
    )
    const secondFile = await writeFixture(
      secondRoot,
      "src/index.ts",
      "/**\n * Second.\n * @since next-release\n */\nexport function second() {}\n",
    )

    const result = await updateJsDocSinceTagsForPackages({
      cwd: firstRoot,
      packages: [
        snapshot(firstRoot, "1.2.0", "@qualcomm-ui/first"),
        snapshot(secondRoot, "2.3.0", "@qualcomm-ui/second"),
      ],
    })

    await expect(readFile(firstFile, "utf-8")).resolves.toContain(
      "@since 1.2.0",
    )
    await expect(readFile(secondFile, "utf-8")).resolves.toContain(
      "@since 2.3.0",
    )
    expect(result.updatedPackages).toEqual([
      {
        fileCount: 1,
        name: "@qualcomm-ui/first",
        tagCount: 1,
        version: "1.2.0",
      },
      {
        fileCount: 1,
        name: "@qualcomm-ui/second",
        tagCount: 1,
        version: "2.3.0",
      },
    ])
    expect(result.unresolvedFiles).toEqual([])
  })

  it("reports each package before processing it", async () => {
    const firstRoot = await createTempPackageRoot()
    const secondRoot = await createTempPackageRoot()
    await writeFixture(
      firstRoot,
      "src/index.ts",
      "/**\n * First.\n * @since next-release\n */\nexport function first() {}\n",
    )
    await writeFixture(
      secondRoot,
      "src/index.ts",
      "/**\n * Second.\n * @since next-release\n */\nexport function second() {}\n",
    )
    const onProgress = vi.fn()

    await updateJsDocSinceTagsForPackages({
      cwd: firstRoot,
      onProgress,
      packages: [
        snapshot(firstRoot, "1.2.0", "@qualcomm-ui/first"),
        snapshot(secondRoot, "2.3.0", "@qualcomm-ui/second"),
      ],
    })

    expect(onProgress).toHaveBeenNthCalledWith(
      1,
      "Processing package @qualcomm-ui/first 1.2.0...",
    )
    expect(onProgress).toHaveBeenNthCalledWith(
      2,
      "Processing package @qualcomm-ui/second 2.3.0...",
    )
  })

  it("formats update summaries and unresolved placeholder warnings", () => {
    expect(
      formatJsDocSinceUpdateResult({
        unresolvedFiles: ["packages/example/src/file-doc.ts"],
        updatedPackages: [
          {
            fileCount: 2,
            name: "@qualcomm-ui/example",
            tagCount: 4,
            version: "1.2.3",
          },
        ],
      }),
    ).toEqual([
      "Updated JSDoc @since tags:",
      "  @qualcomm-ui/example 1.2.3: 4 tags in 2 files",
      "",
      "Warning: unresolved @since next-release tags remain after JSDoc version update:",
      "  packages/example/src/file-doc.ts",
      "",
      "These tags were not rewritten automatically. This is non-blocking, but the updater may need to support another JSDoc shape.",
    ])
  })

  it("formats update progress messages", () => {
    expect(formatJsDocSinceUpdateStartMessage()).toBe(
      "Updating JSDoc @since tags...",
    )
    expect(
      formatJsDocSincePackageUpdateProgress({
        name: "@qualcomm-ui/example",
        version: "1.2.3",
      }),
    ).toBe("Processing package @qualcomm-ui/example 1.2.3...")
  })

  it("checks current package sources for @since next-release tags", async () => {
    const firstRoot = await createTempPackageRoot()
    const secondRoot = await createTempPackageRoot()
    await writeFixture(
      firstRoot,
      "src/index.ts",
      [
        "/**",
        " * Current work.",
        " * @since next-release",
        " */",
        "export function current() {}",
        "",
        "export interface CurrentOptions {",
        "  /**",
        "   * Label.",
        "   * @since next-release",
        "   */",
        "  label: string",
        "}",
        "",
      ].join("\n"),
    )
    await writeFixture(
      secondRoot,
      "src/index.ts",
      "/**\n * Released work.\n * @since 1.0.0\n */\nexport function released() {}\n",
    )
    await writeFixture(
      firstRoot,
      "dist/index.ts",
      "/**\n * Generated.\n * @since next-release\n */\nexport function generated() {}\n",
    )

    const result = await checkJsDocSinceTags({
      cwd: firstRoot,
      packages: [
        snapshot(firstRoot, "1.1.0", "@qualcomm-ui/first"),
        snapshot(secondRoot, "1.1.0", "@qualcomm-ui/second"),
      ],
    })

    expect(result.unresolvedTags).toEqual([
      {entityName: "current", filePath: "src/index.ts"},
      {entityName: "CurrentOptions.label", filePath: "src/index.ts"},
    ])
  })

  it("does not report plain strings that mention @since next-release", async () => {
    const root = await createTempPackageRoot()
    await writeFixture(
      root,
      "src/index.ts",
      'export const message = "Found @since next-release tags:"\n',
    )

    const result = await checkJsDocSinceTags({
      cwd: root,
      packages: [snapshot(root, "1.1.0")],
    })

    expect(result.unresolvedTags).toEqual([])
  })

  it("formats check output for found and missing tags", () => {
    expect(
      formatJsDocSinceCheckResult({
        unresolvedTags: [
          {
            entityName: "Example",
            filePath: "packages/example/src/index.ts",
          },
        ],
      }),
    ).toEqual([
      "Found @since next-release tags:",
      "  packages/example/src/index.ts: Example",
    ])

    expect(formatJsDocSinceCheckResult({unresolvedTags: []})).toEqual([
      "No @since next-release tags found.",
    ])
  })
})
