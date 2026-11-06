// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {afterEach, beforeEach, describe, expect, it} from "vitest"

import {consolidateChangelog} from "./consolidate-changelogs.js"

describe("consolidateChangelog", () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "consolidate-changelog-"))
  })

  afterEach(async () => {
    await rm(dir, {force: true, recursive: true})
  })

  async function consolidate(content: string) {
    const changelogPath = join(dir, "CHANGELOG.md")
    await writeFile(changelogPath, content)
    await consolidateChangelog(changelogPath)
    return readFile(changelogPath, "utf-8")
  }

  it("merges sections and preserves nested descriptions", async () => {
    const result = await consolidate(
      [
        "# @qualcomm-ui/foo Changelog",
        "",
        "## 1.1.0 (2026/11/06)",
        "",
        "### Minor Changes",
        "",
        "### Features",
        "",
        "- add size prop",
        "",
        "  Supports **sm** and **md**.",
        "",
        "  ```tsx",
        "  <Button size='sm' />",
        "",
        "  <Button size='md' />",
        "  ```",
        "",
        "### Patch Changes",
        "",
        "### Bug Fixes",
        "",
        "- handle empty input",
        "",
        "### Features",
        "",
        "- add variant prop",
        "",
        "## 1.0.0",
        "",
      ].join("\n"),
    )

    expect(result).toBe(
      [
        "# @qualcomm-ui/foo Changelog",
        "",
        "## 1.1.0",
        "",
        "Nov 6th, 2026",
        "",
        "### Features",
        "",
        "- add size prop",
        "",
        "  Supports **sm** and **md**.",
        "",
        "  ```tsx",
        "  <Button size='sm' />",
        "",
        "  <Button size='md' />",
        "  ```",
        "",
        "- add variant prop",
        "",
        "### Bug Fixes",
        "",
        "- handle empty input",
        "",
        "## 1.0.0",
        "",
      ].join("\n"),
    )
  })
})
