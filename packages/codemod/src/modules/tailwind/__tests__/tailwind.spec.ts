import {cpSync, mkdirSync, readdirSync, readFileSync, rmSync} from "node:fs"
import {dirname, resolve} from "node:path"
import {fileURLToPath} from "node:url"
import {describe, expect, test} from "vitest"

import {transformClasses} from "../../../transformers/class-transformers"
import {allTailwindTransforms} from "../tailwind"

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

describe("tailwind-migrations", () => {
  const files = readdirSync(dirs.actual).filter(
    (file) =>
      file.endsWith(".tsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".html") ||
      file.endsWith(".css"),
  )

  for (const file of files) {
    test(`transforms ${file}`, () => {
      const filePath = resolve(dirs.actual, file)
      const result = transformClasses(filePath, allTailwindTransforms)

      expect(result.changed).toBe(true)
      expect(result.changes.length).toBeGreaterThan(0)
    })
  }

  test("transforms React className attributes", () => {
    const filePath = resolve(dirs.actual, "react-demo.tsx")
    transformClasses(filePath, allTailwindTransforms)

    const actual = readFileSync(filePath, "utf-8")
    const expected = readFileSync(
      resolve(dirs.expected, "react-demo.tsx"),
      "utf-8",
    )

    expect(actual).toBe(expected)
  })

  test("transforms Angular templates", () => {
    const filePath = resolve(dirs.actual, "angular-demo.ts")
    transformClasses(filePath, allTailwindTransforms)

    const actual = readFileSync(filePath, "utf-8")
    const expected = readFileSync(
      resolve(dirs.expected, "angular-demo.ts"),
      "utf-8",
    )

    expect(actual).toBe(expected)
  })

  test("transforms HTML class attributes", () => {
    const filePath = resolve(dirs.actual, "angular-template.html")
    transformClasses(filePath, allTailwindTransforms)

    const actual = readFileSync(filePath, "utf-8")
    const expected = readFileSync(
      resolve(dirs.expected, "angular-template.html"),
      "utf-8",
    )

    expect(actual).toBe(expected)
  })

  test("transforms CSS @apply and selectors", () => {
    const filePath = resolve(dirs.actual, "styles.css")
    transformClasses(filePath, allTailwindTransforms)

    const actual = readFileSync(filePath, "utf-8")
    const expected = readFileSync(resolve(dirs.expected, "styles.css"), "utf-8")

    expect(actual).toBe(expected)
  })
})

describe("individual transform tests", () => {
  test("q-font-body transforms", () => {
    const transforms = allTailwindTransforms
    const bodyTransform = transforms.find(
      (t) =>
        t.pattern instanceof RegExp && t.pattern.source.includes("q-font-body"),
    )
    expect(bodyTransform).toBeDefined()

    if (bodyTransform && typeof bodyTransform.replacement === "function") {
      expect(bodyTransform.replacement("q-font-body-md", "md")).toBe(
        "font-body-md",
      )
      expect(bodyTransform.replacement("q-font-body-xl", "xl")).toBe(
        "font-body-xl",
      )
    }
  })

  test("q-font-body-strong transforms to bold", () => {
    const transforms = allTailwindTransforms
    const strongTransform = transforms.find(
      (t) => t.pattern instanceof RegExp && t.pattern.source.includes("strong"),
    )
    expect(strongTransform).toBeDefined()

    if (strongTransform && typeof strongTransform.replacement === "function") {
      expect(strongTransform.replacement("q-font-body-md-strong", "md")).toBe(
        "font-body-md-bold",
      )
    }
  })

  test("background color transforms", () => {
    const transforms = allTailwindTransforms
    const bg1 = transforms.find((t) => t.pattern === "bg-1")
    const bg2 = transforms.find((t) => t.pattern === "bg-2")
    const bgContrast = transforms.find((t) => t.pattern === "bg-contrast-4")

    expect(bg1?.replacement).toBe("bg-neutral-00")
    expect(bg2?.replacement).toBe("bg-neutral-01")
    expect(bgContrast?.replacement).toBe("bg-neutral-07")
  })

  test("text color transforms", () => {
    const transforms = allTailwindTransforms
    const textPrimary = transforms.find((t) => t.pattern === "text-primary")
    const textError = transforms.find((t) => t.pattern === "text-error")
    const textLink = transforms.find((t) => t.pattern === "text-link")

    expect(textPrimary?.replacement).toBe("text-neutral-primary")
    expect(textError?.replacement).toBe("text-support-danger")
    expect(textLink?.replacement).toBe("text-link-default-idle")
  })

  test("border transforms", () => {
    const transforms = allTailwindTransforms
    const borderDefault = transforms.find((t) => t.pattern === "border-default")
    const borderFocus = transforms.find((t) => t.pattern === "border-focus")

    expect(borderDefault?.replacement).toBe("border-neutral-01")
    expect(borderFocus?.replacement).toBe("border-focus-border")
  })

  test("rounded-2xl transforms to rounded-xxl", () => {
    const transforms = allTailwindTransforms
    const rounded = transforms.find((t) => t.pattern === "rounded-2xl")

    expect(rounded?.replacement).toBe("rounded-xxl")
  })
})
