// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {Project, type SourceFile} from "ts-morph"

import {plugins} from "./plugins"
import type {
  ImportTransformEntry,
  TransformContext,
  TransformOptions,
} from "./types"
import {mergeImports} from "./utils"

function createContext(
  sourceFile: SourceFile,
  options: ImportTransformEntry,
): TransformContext {
  const importAliasMap = new Map<string, string>()
  const importDeclarations = sourceFile
    .getImportDeclarations()
    .filter((decl) => decl.getModuleSpecifierValue() === options.sourcePackage)

  for (const importDecl of importDeclarations) {
    for (const namedImport of importDecl.getNamedImports()) {
      const originalName = namedImport.getName()
      const aliasNode = namedImport.getAliasNode()
      importAliasMap.set(
        originalName,
        aliasNode ? aliasNode.getText() : originalName,
      )
    }
  }

  return {importAliasMap, options, sourceFile}
}

export function transformTs(
  filePath: string,
  optionsArray: ImportTransformEntry[],
  transformOptions: TransformOptions = {},
): boolean {
  const project = new Project({
    manipulationSettings: {
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
      useTrailingCommas: true,
    },
  })
  const sourceFile = project.addSourceFileAtPath(filePath)

  const allImports = sourceFile.getImportDeclarations()
  const leadingTrivia =
    allImports.length > 0
      ? sourceFile.getFullText().substring(0, allImports[0].getStart())
      : ""

  let needsSave = false

  for (const options of optionsArray) {
    const ctx = createContext(sourceFile, options)
    for (const plugin of plugins) {
      if (plugin.transform(ctx)) {
        needsSave = true
      }
    }
  }

  if (needsSave && !transformOptions.dryRun) {
    mergeImports(sourceFile)
    sourceFile.insertText(0, leadingTrivia)
    sourceFile.saveSync()
  }

  return needsSave
}
