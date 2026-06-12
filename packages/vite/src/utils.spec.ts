// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {pathToFileURL} from "node:url"
import {afterEach, beforeEach, describe, expect, it} from "vitest"

import {collectFolders, dependenciesToExternal, getArg, hasArg} from "./utils"

describe("hasArg", () => {
  it("returns true when flag present", () => {
    expect(hasArg(["--watch", "--mode", "dev"], "--watch")).toBe(true)
  })

  it("returns false when flag absent", () => {
    expect(hasArg(["--mode", "dev"], "--watch")).toBe(false)
  })
})

describe("getArg", () => {
  it("returns value following the key", () => {
    expect(getArg(["--mode", "development"], "--mode")).toBe("development")
  })

  it("returns undefined when key absent", () => {
    expect(getArg(["--watch"], "--mode")).toBeUndefined()
  })

  it("returns undefined when key is last arg", () => {
    expect(getArg(["--mode"], "--mode")).toBeUndefined()
  })
})

describe("collectFolders", () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "qui-vite-test-"))
    await mkdir(join(tmpDir, "accordion"))
    await mkdir(join(tmpDir, "button"))
  })

  afterEach(async () => {
    await rm(tmpDir, {recursive: true})
  })

  it("returns folder names", async () => {
    const result = await collectFolders(tmpDir)
    expect(result.sort()).toEqual(["accordion", "button"])
  })

  it("excludes files, only returns directories", async () => {
    await writeFile(join(tmpDir, "README.md"), "")
    const result = await collectFolders(tmpDir)
    expect(result.sort()).toEqual(["accordion", "button"])
  })

  it("returns empty array for empty directory", async () => {
    const empty = await mkdtemp(join(tmpdir(), "qui-vite-empty-"))
    try {
      const result = await collectFolders(empty)
      expect(result).toEqual([])
    } finally {
      await rm(empty, {recursive: true})
    }
  })
})

describe("dependenciesToExternal", () => {
  it("converts dependency objects into externals", async () => {
    const result = await dependenciesToExternal({
      packageJson: {
        dependencies: {"@scope/pkg": "^1.0.0"},
        devDependencies: {vite: "^8.0.0"},
      },
    })

    expect(result.map((regex) => regex.source)).toEqual([
      "^@scope\\/pkg(\\/|$)",
      "^vite(\\/|$)",
    ])
  })

  it("reads package.json when provided as a file url string", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "qui-vite-package-"))
    const packageJsonPath = join(tmpDir, "package.json")

    try {
      await writeFile(
        packageJsonPath,
        JSON.stringify({dependencies: {chokidar: "^4.0.0"}}),
      )

      const result = await dependenciesToExternal({
        packageJson: pathToFileURL(packageJsonPath).href,
      })

      expect(result.map((regex) => regex.source)).toEqual(["^chokidar(\\/|$)"])
    } finally {
      await rm(tmpDir, {recursive: true})
    }
  })

  it("returns empty externals when dependency sections are omitted", async () => {
    const result = await dependenciesToExternal({packageJson: {}})

    expect(result).toEqual([])
  })
})
