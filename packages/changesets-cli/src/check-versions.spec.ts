// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import * as core from "@actions/core"
import {mkdir, mkdtemp, realpath, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import {
  checkVersions,
  type ExecFn,
  type ExecResult,
  getRegistryOverrides,
  parseNpmInfoResult,
} from "./check-versions.js"

vi.mock("@actions/core", () => ({setOutput: vi.fn()}))

const ok = (stdout: string): ExecResult => ({exitCode: 0, stderr: "", stdout})

const npmError = (code: string): ExecResult => ({
  exitCode: 1,
  stderr: `npm error code ${code}`,
  stdout: JSON.stringify({
    error: {code, detail: "some detail", summary: "some summary"},
  }),
})

describe("getRegistryOverrides", () => {
  it("returns no overrides without publishConfig", () => {
    expect(getRegistryOverrides({name: "@scope/pkg"})).toEqual([])
    expect(getRegistryOverrides({name: "pkg"})).toEqual([])
  })

  it("applies publishConfig.registry to unscoped packages", () => {
    expect(
      getRegistryOverrides({
        name: "pkg",
        publishConfig: {registry: "https://registry.example.com/"},
      }),
    ).toEqual(["--registry=https://registry.example.com/"])
  })

  it("applies publishConfig.registry to scoped packages", () => {
    expect(
      getRegistryOverrides({
        name: "@scope/pkg",
        publishConfig: {registry: "https://registry.example.com/"},
      }),
    ).toEqual(["--registry=https://registry.example.com/"])
  })

  it("applies scoped and default registries to scoped packages", () => {
    expect(
      getRegistryOverrides({
        name: "@scope/pkg",
        publishConfig: {
          "@scope:registry": "https://scoped.example.com/",
          registry: "https://registry.example.com/",
        },
      }),
    ).toEqual([
      "--@scope:registry=https://scoped.example.com/",
      "--registry=https://registry.example.com/",
    ])
  })

  it("ignores scoped registries for other scopes", () => {
    expect(
      getRegistryOverrides({
        name: "@scope/pkg",
        publishConfig: {"@other:registry": "https://other.example.com/"},
      }),
    ).toEqual([])
  })

  it("ignores publishConfig fields unrelated to registries", () => {
    expect(
      getRegistryOverrides({name: "pkg", publishConfig: {access: "public"}}),
    ).toEqual([])
  })
})

describe("parseNpmInfoResult", () => {
  it("returns the latest dist-tag", () => {
    expect(
      parseNpmInfoResult("pkg", ok('{"latest": "1.2.3", "next": "2.0.0-0"}')),
    ).toBe("1.2.3")
  })

  it("unwraps array output", () => {
    expect(parseNpmInfoResult("pkg", ok('[{"latest": "1.2.3"}]'))).toBe("1.2.3")
  })

  it("returns null for empty output", () => {
    expect(parseNpmInfoResult("pkg", ok(""))).toBeNull()
  })

  it("returns null when there is no latest dist-tag", () => {
    expect(parseNpmInfoResult("pkg", ok('{"next": "2.0.0-0"}'))).toBeNull()
  })

  it("returns null for E404", () => {
    expect(parseNpmInfoResult("pkg", npmError("E404"))).toBeNull()
  })

  it("throws for other npm errors", () => {
    expect(() => parseNpmInfoResult("pkg", npmError("E401"))).toThrow(
      "Failed to check pkg: E401: some summary: some detail",
    )
  })

  it("falls back to stderr when npm output is not JSON", () => {
    expect(() =>
      parseNpmInfoResult("pkg", {
        exitCode: 1,
        stderr: "network unreachable\n",
        stdout: "",
      }),
    ).toThrow("Failed to check pkg: network unreachable")
  })

  it("throws for unparseable successful output", () => {
    expect(() => parseNpmInfoResult("pkg", ok("not json"))).toThrow(
      "unexpected npm output",
    )
  })
})

describe("checkVersions", () => {
  let root: string

  async function writeFixture(relativePath: string, content: unknown) {
    const fullPath = join(root, relativePath)
    await mkdir(dirname(fullPath), {recursive: true})
    await writeFile(
      fullPath,
      typeof content === "string" ? content : `${JSON.stringify(content)}\n`,
    )
  }

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "qui-check-versions-")))
    await writeFixture("package.json", {name: "root", private: true})
    await writeFixture("pnpm-workspace.yaml", "packages:\n  - packages/*\n")
    await writeFixture(".changeset/config.json", {baseBranch: "main"})
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.mocked(core.setOutput).mockClear()
    await rm(root, {force: true, recursive: true})
  })

  function fakeNpm(published: Record<string, ExecResult>) {
    return vi.fn<ExecFn>((_command, args) =>
      Promise.resolve(published[args[1]]),
    )
  }

  it("queries npm from the workspace root with registry overrides", async () => {
    await writeFixture("packages/a/package.json", {
      name: "@scope/a",
      publishConfig: {registry: "https://registry.example.com/"},
      version: "1.0.0",
    })
    await writeFixture("packages/b/package.json", {
      name: "b",
      version: "1.0.0",
    })
    const exec = fakeNpm({
      "@scope/a": ok('{"latest": "1.0.0"}'),
      b: ok('{"latest": "1.0.0"}'),
    })

    await checkVersions({cwd: root, exec})

    expect(exec).toHaveBeenCalledTimes(2)
    expect(exec).toHaveBeenCalledWith(
      "npm",
      [
        "info",
        "@scope/a",
        "dist-tags",
        "--registry=https://registry.example.com/",
        "--json",
      ],
      {cwd: root},
    )
    expect(exec).toHaveBeenCalledWith(
      "npm",
      ["info", "b", "dist-tags", "--json"],
      {cwd: root},
    )
    expect(core.setOutput).toHaveBeenCalledWith("should-publish", false)
  })

  it("sets should-publish when a local version is newer", async () => {
    await writeFixture("packages/a/package.json", {
      name: "a",
      version: "1.1.0",
    })
    const exec = fakeNpm({a: ok('{"latest": "1.0.0"}')})

    await checkVersions({cwd: root, exec})

    expect(core.setOutput).toHaveBeenCalledWith("should-publish", true)
    expect(console.log).toHaveBeenCalledWith("  a: 1.0.0 -> 1.1.0")
  })

  it("skips private packages", async () => {
    await writeFixture("packages/a/package.json", {
      name: "a",
      private: true,
      version: "1.1.0",
    })
    const exec = fakeNpm({})

    await checkVersions({cwd: root, exec})

    expect(exec).not.toHaveBeenCalled()
    expect(core.setOutput).toHaveBeenCalledWith("should-publish", false)
  })

  it("propagates registry errors", async () => {
    await writeFixture("packages/a/package.json", {
      name: "a",
      version: "1.1.0",
    })
    const exec = fakeNpm({a: npmError("E401")})

    await expect(checkVersions({cwd: root, exec})).rejects.toThrow(
      "Failed to check a: E401",
    )
    expect(core.setOutput).not.toHaveBeenCalled()
  })
})
