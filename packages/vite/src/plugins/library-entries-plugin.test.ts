// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import type {InputOption} from "rollup"
import type {Plugin} from "vite"
import {afterEach, beforeEach, describe, expect, it} from "vitest"

import {
  collectLibraryEntries,
  libraryEntriesPlugin,
} from "./library-entries-plugin"

async function getPluginInput(plugin: Plugin): Promise<InputOption> {
  const options = await (
    plugin.options as (opts: {
      input?: InputOption
    }) => Promise<{input?: InputOption}>
  )({})
  return options.input
}

function collectCustomEntries(): Promise<Record<string, string>> {
  return Promise.resolve({
    "components/button/index": "./src/components/button/public.ts",
  })
}

describe("collectLibraryEntries", () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "qui-vite-entries-"))
    await mkdir(join(tmpDir, "button"))
    await mkdir(join(tmpDir, "dialog"))
    await mkdir(join(tmpDir, "theme"))
    await writeFile(join(tmpDir, "button", "index.ts"), "")
    await writeFile(join(tmpDir, "dialog", "index.ts"), "")
    await writeFile(join(tmpDir, "theme", "tokens.ts"), "")
    await writeFile(join(tmpDir, "index.ts"), "")
  })

  afterEach(async () => {
    await rm(tmpDir, {recursive: true})
  })

  it("discovers top-level folders with index entries", async () => {
    await expect(collectLibraryEntries({root: tmpDir})).resolves.toEqual({
      "button/index": join(tmpDir, "button", "index.ts"),
      "dialog/index": join(tmpDir, "dialog", "index.ts"),
    })
  })

  it("supports a custom entry file and output name", async () => {
    await expect(
      collectLibraryEntries({
        entryFile: "tokens.ts",
        name: (folderName) => `internal/${folderName}`,
        root: tmpDir,
      }),
    ).resolves.toEqual({
      "internal/theme": join(tmpDir, "theme", "tokens.ts"),
    })
  })
})

describe("libraryEntriesPlugin", () => {
  it("uses default entry discovery when entries are omitted", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "qui-vite-plugin-"))
    const cwd = process.cwd()

    try {
      process.chdir(tmpDir)
      await mkdir(join(tmpDir, "src", "button"), {recursive: true})
      await writeFile(join(tmpDir, "src", "button", "index.ts"), "")

      const input = await getPluginInput(libraryEntriesPlugin())

      expect(input).toEqual({"button/index": "src/button/index.ts"})
    } finally {
      process.chdir(cwd)
      await rm(tmpDir, {recursive: true})
    }
  })

  it("passes custom collected entries through unchanged", async () => {
    const input = await getPluginInput(
      libraryEntriesPlugin({
        entries: {
          collect: collectCustomEntries,
        },
      }),
    )

    expect(input).toEqual({
      "components/button/index": "./src/components/button/public.ts",
    })
  })
})
