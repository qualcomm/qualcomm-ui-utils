import {execFileSync} from "node:child_process"
import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {afterEach, describe, expect, it, vi} from "vitest"

import {
  bumpVersionsAndMaybeUpdateJsDocSinceTags,
  getCheckPackageSnapshots,
  getUpdatePackageSnapshots,
} from "./version-bump"

const tempRoots: string[] = []

function git(cwd: string, args: string[]) {
  execFileSync("git", args, {cwd, stdio: "ignore"})
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

async function writePackage(root: string, name: string, version: string) {
  const packageRoot = join(root, "packages", name)
  await writeFixture(
    root,
    `packages/${name}/package.json`,
    `${JSON.stringify({
      name: `@qualcomm-ui/${name}`,
      version,
    })}\n`,
  )
  await writeFixture(
    root,
    `packages/${name}/src/index.ts`,
    "export const value = true\n",
  )
  return {
    name: `@qualcomm-ui/${name}`,
    root: packageRoot,
    version,
  }
}

async function createTempRepo() {
  const root = await mkdtemp(join(tmpdir(), "qui-jsdoc-diff-"))
  tempRoots.push(root)
  git(root, ["init", "-b", "main"])
  git(root, ["config", "user.email", "test@example.com"])
  git(root, ["config", "user.name", "Test User"])
  git(root, ["config", "commit.gpgsign", "false"])
  await writeFixture(
    root,
    ".changeset/config.json",
    `${JSON.stringify({baseBranch: "main"})}\n`,
  )
  return root
}

function commitAll(root: string, message: string) {
  git(root, ["add", "."])
  git(root, ["commit", "-m", message])
}

describe("bumpVersionsAndMaybeUpdateJsDocSinceTags", () => {
  it("bumps versions", () => {
    const exec = vi.fn()

    bumpVersionsAndMaybeUpdateJsDocSinceTags({
      exec,
    })

    expect(exec).toHaveBeenCalledWith("pnpm changeset version")
  })
})

describe("package snapshot selection", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots
        .splice(0)
        .map((root) => rm(root, {force: true, recursive: true})),
    )
  })

  const packages = [
    {
      name: "@qualcomm-ui/first",
      root: "/repo/packages/first",
      version: "1.2.0",
    },
    {
      name: "@qualcomm-ui/second",
      root: "/repo/packages/second",
      version: "2.3.0",
    },
  ]

  it("uses all packages for checks when no directory is provided", () => {
    expect(getCheckPackageSnapshots({packages})).toEqual([
      {
        name: "@qualcomm-ui/first",
        root: "/repo/packages/first/src",
        version: "1.2.0",
      },
      {
        name: "@qualcomm-ui/second",
        root: "/repo/packages/second/src",
        version: "2.3.0",
      },
    ])
  })

  it("uses packages with versions changed from the configured base branch when no update directory is provided", async () => {
    const root = await createTempRepo()
    await writePackage(root, "first", "1.1.0")
    await writePackage(root, "second", "2.3.0")
    commitAll(root, "baseline")
    const changedPackage = await writePackage(root, "first", "1.2.0")
    const unchangedPackage = {
      name: "@qualcomm-ui/second",
      root: join(root, "packages", "second"),
      version: "2.3.0",
    }

    expect(
      getUpdatePackageSnapshots({
        cwd: root,
        packages: [changedPackage, unchangedPackage],
      }),
    ).toEqual([
      {
        name: "@qualcomm-ui/first",
        root: join(root, "packages", "first", "src"),
        version: "1.2.0",
      },
    ])
  })

  it("uses an explicit remote-tracking diff ref when selecting packages to update", async () => {
    const root = await createTempRepo()
    await writePackage(root, "first", "1.2.0")
    await writePackage(root, "second", "2.2.0")
    commitAll(root, "baseline")
    git(root, ["update-ref", "refs/remotes/origin/main", "HEAD"])
    const unchangedPackage = {
      name: "@qualcomm-ui/first",
      root: join(root, "packages", "first"),
      version: "1.2.0",
    }
    const changedPackage = await writePackage(root, "second", "2.3.0")

    expect(
      getUpdatePackageSnapshots({
        cwd: root,
        diffRef: "origin/main",
        packages: [unchangedPackage, changedPackage],
      }),
    ).toEqual([
      {
        name: "@qualcomm-ui/second",
        root: join(root, "packages", "second", "src"),
        version: "2.3.0",
      },
    ])
  })

  it("requires the selected diff ref to resolve", async () => {
    const root = await createTempRepo()
    const selectedPackage = await writePackage(root, "first", "1.2.0")
    commitAll(root, "baseline")

    expect(() =>
      getUpdatePackageSnapshots({
        cwd: root,
        diffRef: "missing-ref",
        packages: [selectedPackage],
      }),
    ).toThrow('Git ref "missing-ref" could not be resolved.')
  })

  it("uses explicit check directories as custom scan roots", () => {
    expect(
      getCheckPackageSnapshots({
        cwd: "/repo",
        directories: [".", "docs"],
        packages,
      }),
    ).toEqual([
      {
        name: ".",
        root: "/repo",
        version: undefined,
      },
      {
        name: "docs",
        root: "/repo/docs",
        version: undefined,
      },
    ])
  })

  it("uses explicit package directories as custom scan roots", () => {
    expect(
      getCheckPackageSnapshots({
        cwd: "/repo",
        directory: "packages/first",
        packages,
      }),
    ).toEqual([
      {
        name: "@qualcomm-ui/first",
        root: "/repo/packages/first",
        version: "1.2.0",
      },
    ])
  })

  it("limits checks to the requested directory", () => {
    expect(
      getCheckPackageSnapshots({
        cwd: "/repo",
        directory: "packages/first/src",
        packages,
      }),
    ).toEqual([
      {
        name: "@qualcomm-ui/first",
        root: "/repo/packages/first/src",
        version: "1.2.0",
      },
    ])
  })

  it("uses the containing package version for a requested update directory", () => {
    expect(
      getUpdatePackageSnapshots({
        cwd: "/repo",
        directory: "packages/first/src",
        packages,
      }),
    ).toEqual([
      {
        name: "@qualcomm-ui/first",
        root: "/repo/packages/first/src",
        version: "1.2.0",
      },
    ])
  })

  it("uses an explicit update version when provided", () => {
    expect(
      getUpdatePackageSnapshots({
        cwd: "/repo",
        directories: ["packages/first/src/subdir", "docs"],
        packages,
        version: "9.0.0",
      }),
    ).toEqual([
      {
        name: "@qualcomm-ui/first",
        root: "/repo/packages/first/src/subdir",
        version: "9.0.0",
      },
      {
        name: "docs",
        root: "/repo/docs",
        version: "9.0.0",
      },
    ])
  })

  it("uses an explicit update version for changed packages", async () => {
    const root = await createTempRepo()
    await writePackage(root, "first", "1.1.0")
    await writePackage(root, "second", "2.3.0")
    commitAll(root, "baseline")
    const changedPackage = await writePackage(root, "first", "1.2.0")
    const unchangedPackage = {
      name: "@qualcomm-ui/second",
      root: join(root, "packages", "second"),
      version: "2.3.0",
    }

    expect(
      getUpdatePackageSnapshots({
        cwd: root,
        packages: [changedPackage, unchangedPackage],
        version: "9.0.0",
      }),
    ).toEqual([
      {
        name: "@qualcomm-ui/first",
        root: join(root, "packages", "first", "src"),
        version: "9.0.0",
      },
    ])
  })

  it("requires a version when updating custom directories outside packages", () => {
    expect(() =>
      getUpdatePackageSnapshots({
        cwd: "/repo",
        directory: "docs",
        packages,
      }),
    ).toThrow(
      'Directory "docs" is not within a package with a version. Pass --version to update arbitrary directories.',
    )
  })
})
