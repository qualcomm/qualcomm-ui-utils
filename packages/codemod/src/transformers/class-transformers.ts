// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {readFileSync, writeFileSync} from "node:fs"
import path from "node:path"

import type {ClassTransformEntry, ClassTransformResult} from "./types"

interface TransformOptions {
  dryRun?: boolean
  verbose?: boolean
}

interface Change {
  file: string
  line: number
  newClass: string
  oldClass: string
}

export function transformClasses(
  filePath: string,
  transforms: ClassTransformEntry[],
  options: TransformOptions = {},
): ClassTransformResult {
  const ext = path.extname(filePath).toLowerCase()
  const content = readFileSync(filePath, "utf-8")
  const changes: Change[] = []

  let newContent = content

  if ([".tsx", ".jsx"].includes(ext)) {
    newContent = transformReactFile(content, transforms, filePath, changes)
  } else if (ext === ".html") {
    newContent = transformHtmlFile(content, transforms, filePath, changes)
  } else if ([".css", ".scss"].includes(ext)) {
    newContent = transformCssFile(content, transforms, filePath, changes)
  } else if (ext === ".ts") {
    newContent = transformAngularTsFile(content, transforms, filePath, changes)
  }

  const changed = newContent !== content

  if (changed && !options.dryRun) {
    writeFileSync(filePath, newContent, "utf-8")
  }

  return {changed, changes}
}

function applyTransforms(
  classString: string,
  transforms: ClassTransformEntry[],
  filePath: string,
  lineNumber: number,
  changes: Change[],
): string {
  const classes = classString.split(/\s+/).filter(Boolean)
  const transformedClasses = classes.map((cls) => {
    for (const transform of transforms) {
      const {pattern, replacement} = transform
      if (typeof pattern === "string") {
        if (cls === pattern) {
          const newClass =
            typeof replacement === "function" ? replacement(cls) : replacement
          if (newClass !== cls) {
            changes.push({
              file: filePath,
              line: lineNumber,
              newClass,
              oldClass: cls,
            })
          }
          return newClass
        }
      } else {
        const match = cls.match(pattern)
        if (match) {
          const newClass =
            typeof replacement === "function"
              ? replacement(match[0], ...match.slice(1))
              : cls.replace(pattern, replacement)
          if (newClass !== cls) {
            changes.push({
              file: filePath,
              line: lineNumber,
              newClass,
              oldClass: cls,
            })
          }
          return newClass
        }
      }
    }
    return cls
  })
  return transformedClasses.join(" ")
}

function getLineNumber(content: string, position: number): number {
  return content.substring(0, position).split("\n").length
}

function transformReactFile(
  content: string,
  transforms: ClassTransformEntry[],
  filePath: string,
  changes: Change[],
): string {
  let result = content

  result = result.replace(
    /(?:className|class)=["']([^"']+)["']/g,
    (match, classes, offset) => {
      const lineNum = getLineNumber(content, offset)
      const transformed = applyTransforms(
        classes,
        transforms,
        filePath,
        lineNum,
        changes,
      )
      return match.replace(classes, transformed)
    },
  )

  result = result.replace(
    /(?:className=\{[^}]*|cn\([^)]*|clsx\([^)]*|cva\([^)]*)/g,
    (functionCall, offset) => {
      const lineNum = getLineNumber(content, offset)
      return functionCall.replace(
        /["']([^"']+)["']/g,
        (stringMatch, classes) => {
          const transformed = applyTransforms(
            classes,
            transforms,
            filePath,
            lineNum,
            changes,
          )
          return stringMatch.replace(classes, transformed)
        },
      )
    },
  )

  result = result.replace(/`([^`]*)`/g, (match, templateContent, offset) => {
    if (
      !templateContent.includes("className") &&
      !match.includes("cn(") &&
      !match.includes("clsx(")
    ) {
      return match
    }
    const lineNum = getLineNumber(content, offset)
    const transformed = templateContent.replace(
      /([a-z][\w-]*(?:\s+[a-z][\w-]*)*)/gi,
      (classMatch: string) => {
        if (classMatch.includes("${") || classMatch.includes("}")) {
          return classMatch
        }
        return applyTransforms(
          classMatch,
          transforms,
          filePath,
          lineNum,
          changes,
        )
      },
    )
    return `\`${transformed}\``
  })

  return result
}

function transformHtmlFile(
  content: string,
  transforms: ClassTransformEntry[],
  filePath: string,
  changes: Change[],
): string {
  return content.replace(
    /class=["']([^"']+)["']/g,
    (match, classes, offset) => {
      const lineNum = getLineNumber(content, offset)
      const transformed = applyTransforms(
        classes,
        transforms,
        filePath,
        lineNum,
        changes,
      )
      return match.replace(classes, transformed)
    },
  )
}

function transformCssFile(
  content: string,
  transforms: ClassTransformEntry[],
  filePath: string,
  changes: Change[],
): string {
  let result = content

  result = result.replace(/@apply\s+([^;]+);/g, (match, classes, offset) => {
    const lineNum = getLineNumber(content, offset)
    const transformed = applyTransforms(
      classes,
      transforms,
      filePath,
      lineNum,
      changes,
    )
    return `@apply ${transformed};`
  })

  for (const transform of transforms) {
    const {pattern, replacement} = transform
    if (typeof pattern === "string") {
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`\\.${escapedPattern}(?=[\\s{,:])`, "g")
      result = result.replace(regex, (match, offset) => {
        const lineNum = getLineNumber(content, offset)
        const oldClass = match.slice(1)
        const newClass =
          typeof replacement === "function"
            ? replacement(oldClass)
            : replacement
        if (newClass !== oldClass) {
          changes.push({
            file: filePath,
            line: lineNum,
            newClass,
            oldClass,
          })
        }
        return `.${newClass}`
      })
    } else if (pattern.source.startsWith("var\\(")) {
      result = result.replace(pattern, (match, offset) => {
        const lineNum = getLineNumber(result, offset)
        const newValue =
          typeof replacement === "function" ? replacement(match) : replacement
        if (newValue !== match) {
          changes.push({
            file: filePath,
            line: lineNum,
            newClass: newValue,
            oldClass: match,
          })
        }
        return newValue
      })
    } else {
      const classPattern = new RegExp(
        `\\.(${pattern.source})(?=[\\s{,:])`,
        pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
      )
      result = result.replace(classPattern, (match, ...args) => {
        const offset = args[args.length - 2]
        const lineNum = getLineNumber(content, offset)
        const oldClass = match.slice(1)
        const innerMatch = oldClass.match(pattern)
        if (!innerMatch) {
          return match
        }
        const newClass =
          typeof replacement === "function"
            ? replacement(innerMatch[0], ...innerMatch.slice(1))
            : oldClass.replace(pattern, replacement)
        if (newClass !== oldClass) {
          changes.push({
            file: filePath,
            line: lineNum,
            newClass,
            oldClass,
          })
        }
        return `.${newClass}`
      })
    }
  }

  return result
}

function transformAngularTsFile(
  content: string,
  transforms: ClassTransformEntry[],
  filePath: string,
  changes: Change[],
): string {
  let result = content

  result = result.replace(
    /host:\s*\{[^}]*class:\s*["']([^"']+)["']/g,
    (match, classes, offset) => {
      const lineNum = getLineNumber(content, offset)
      const transformed = applyTransforms(
        classes,
        transforms,
        filePath,
        lineNum,
        changes,
      )
      return match.replace(classes, transformed)
    },
  )

  result = result.replace(
    /@HostBinding\(['"]class['"]\)[^=]*=\s*["']([^"']+)["']/g,
    (match, classes, offset) => {
      const lineNum = getLineNumber(content, offset)
      const transformed = applyTransforms(
        classes,
        transforms,
        filePath,
        lineNum,
        changes,
      )
      return match.replace(classes, transformed)
    },
  )

  result = result.replace(
    /template:\s*`([^`]*)`/g,
    (match, templateContent, offset) => {
      const transformed = templateContent.replace(
        /class=["']([^"']+)["']/g,
        (classMatch: string, classes: string) => {
          const lineNum = getLineNumber(content, offset)
          const transformedClasses = applyTransforms(
            classes,
            transforms,
            filePath,
            lineNum,
            changes,
          )
          return classMatch.replace(classes, transformedClasses)
        },
      )
      return `template: \`${transformed}\``
    },
  )

  return result
}

export async function processClassTransforms(
  patterns: string[],
  transforms: ClassTransformEntry[],
  options: TransformOptions & {logMode?: "info" | "verbose"} = {},
): Promise<{allChanges: Change[]; filesChanged: number; totalChanges: number}> {
  const {glob} = await import("glob")

  const allChanges: Change[] = []
  let filesChanged = 0

  for (const pattern of patterns) {
    const files = await glob(pattern, {
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      nodir: true,
    })

    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (![".tsx", ".jsx", ".ts", ".html", ".css", ".scss"].includes(ext)) {
        continue
      }

      try {
        const result = transformClasses(file, transforms, options)
        if (result.changed) {
          filesChanged++
          allChanges.push(...result.changes)

          if (options.logMode === "verbose" || options.dryRun) {
            console.log(`\nProcessing ${file}...`)
            for (const change of result.changes) {
              console.log(
                `  - Line ${change.line}: ${change.oldClass} → ${change.newClass}`,
              )
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error)
      }
    }
  }

  return {allChanges, filesChanged, totalChanges: allChanges.length}
}
