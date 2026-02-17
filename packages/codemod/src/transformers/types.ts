// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import type {SourceFile} from "ts-morph"

export interface TransformContext {
  /** Map from original import name → name as used in code (alias or original) */
  importAliasMap: Map<string, string>
  options: ImportTransformEntry
  sourceFile: SourceFile
}

export interface TransformPlugin {
  name: string
  transform: (ctx: TransformContext) => boolean
}

interface VariableTransformer {
  name: string
  renameTo: string
}

interface JsxWrapper {
  name: string
  wrapWith: string[]
}

export interface ClassTransformEntry {
  /** Pattern to match (string for exact match, regex for pattern matching) */
  pattern: string | RegExp
  /** Replacement string or function that receives match and capture groups */
  replacement: string | ((match: string, ...groups: string[]) => string)
}

export interface ClassTransformResult {
  changed: boolean
  changes: Array<{
    file: string
    line: number
    newClass: string
    oldClass: string
  }>
}

export interface ImportTransformEntry {
  /**
   * Imports to move from the source package to the target package.
   * If not provided or empty, all imports will be moved.
   */
  imports?: Array<string | {name: string; renameTo: string}>
  /**
   * Remove these imports completely, they no longer exist.
   */
  importsToRemove?: string[]
  /**
   * Wrap JSX elements with parent elements. First element in array is outermost wrapper.
   * @example
   * ```ts
   * {name: "QTable", wrapWith: ["Table.Root", "Table.ScrollContainer"]}
   * // <QTable>...</QTable> becomes <Table.Root><Table.ScrollContainer><QTable>...</QTable></Table.ScrollContainer></Table.Root>
   * ```
   */
  jsxWrappers?: JsxWrapper[]
  /**
   * Source package from which imports will be moved
   */
  sourcePackage: string
  /**
   * Target package to which imports will be moved
   */
  targetPackage: string
  /**
   * Variables that are transformed separately from imports.
   *
   * @example
   * ```ts
   * {name: "QTr", renameTo: "Table.Row"}
   * ```
   */
  variableTransformers?: VariableTransformer[]
}

export interface TransformOptions {
  /**
   * Preview changes without writing files.
   */
  dryRun?: boolean
}
