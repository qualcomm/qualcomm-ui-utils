// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {SyntaxKind} from "ts-morph"

import type {TransformContext, TransformPlugin} from "../types"

function transform(ctx: TransformContext): boolean {
  const {importAliasMap, options, sourceFile} = ctx
  const {variableTransformers} = options

  if (!variableTransformers || variableTransformers.length === 0) {
    return false
  }

  let changed = false

  for (const transformer of variableTransformers) {
    const usedAs = importAliasMap.get(transformer.name)
    if (!usedAs) {
      continue
    }

    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
    for (const identifier of identifiers) {
      if (identifier.getText() !== usedAs) {
        continue
      }
      if (identifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)) {
        continue
      }

      identifier.replaceWithText(transformer.renameTo)
      changed = true
    }
  }

  return changed
}

export const variablesPlugin: TransformPlugin = {
  name: "variables",
  transform,
}
