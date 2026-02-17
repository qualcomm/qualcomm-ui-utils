import {cpSync, mkdirSync, readdirSync, readFileSync, rmSync} from "node:fs"
import {dirname, resolve} from "node:path"
import {fileURLToPath} from "node:url"
import {describe, expect, test} from "vitest"

import {transformTs} from "../../../transformers"
import {mdxDocs} from "../../mdx-docs"

const __dirname = dirname(fileURLToPath(import.meta.url))

const mockTestDir = resolve(__dirname, "./mocks")

const dirs = {
  actual: resolve(mockTestDir, "actual"),
  expected: resolve(mockTestDir, "expected"),
  original: resolve(mockTestDir, "original"),
}

function before() {
  rmSync(dirs.actual, {force: true, recursive: true})
  mkdirSync(dirs.actual)
  cpSync(dirs.original, dirs.actual, {force: true, recursive: true})
}
before()

describe("mdx-docs-migrations", () => {
  const files = readdirSync(dirs.actual).filter((file) => file.endsWith(".tsx"))

  for (const file of files) {
    test(file, () => {
      transformTs(resolve(dirs.actual, file), mdxDocs)

      const actual = readFileSync(resolve(dirs.actual, file), "utf-8")
      const expected = readFileSync(resolve(dirs.expected, file), "utf-8")
      expect(actual).toBe(expected)
    })
  }
})
