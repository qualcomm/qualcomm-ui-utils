// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {afterEach, beforeEach, describe, expect, it} from "vitest"

import {CssBuilder} from "../src"

let workDir: string
let srcDir: string
let outDir: string

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "css-utils-"))
  srcDir = join(workDir, "src")
  outDir = join(workDir, "dist")
  await mkdir(srcDir, {recursive: true})
})

afterEach(async () => {
  await rm(workDir, {force: true, recursive: true})
})

function writeFixture(name: string, css: string): Promise<void> {
  return writeFile(join(srcDir, name), css, "utf-8")
}

function createBuilder(): CssBuilder {
  return new CssBuilder({
    fileGroups: [{cssFiles: [join(srcDir, "*.css")], outFileName: "out.css"}],
    isWatch: true,
    logLevel: "silent",
    outDir,
  })
}

function readAggregate(): Promise<string> {
  return readFile(join(outDir, "out.css"), "utf-8")
}

describe("CssBuilder aggregate ordering", () => {
  it("concatenates files in sorted order regardless of glob order", async () => {
    await writeFixture("b.css", ".sel-b {color: blue}")
    await writeFixture("a.css", ".sel-a {color: red}")

    const builder = createBuilder()
    await builder.build()

    const css = await readAggregate()
    expect(css.indexOf(".sel-a")).toBeLessThan(css.indexOf(".sel-b"))
  })

  it("keeps order stable when a cached watch rebuild reprocesses one file", async () => {
    await writeFixture("a.css", ".sel-a {color: red}")
    await writeFixture("b.css", ".sel-b {color: blue}")

    // A single builder instance retains its cache across builds, mirroring a
    // long-running watch session.
    const builder = createBuilder()
    await builder.build()
    const coldCss = await readAggregate()

    // Edit only the alphabetically-first file. On the incremental rebuild it is
    // the sole file reprocessed by PostCSS while the rest are served from cache.
    await writeFixture("a.css", ".sel-a {color: green}")
    await builder.build()
    const incrementalCss = await readAggregate()

    expect(incrementalCss.indexOf(".sel-a")).toBeLessThan(
      incrementalCss.indexOf(".sel-b"),
    )
    // The edited chunk changed, but the surrounding order must not.
    expect(coldCss.indexOf(".sel-a")).toBeLessThan(coldCss.indexOf(".sel-b"))
  })
})
