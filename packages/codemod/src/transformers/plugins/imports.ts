// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import type {TransformContext, TransformPlugin} from "../types"

function transform(ctx: TransformContext): boolean {
  const {options, sourceFile} = ctx
  const {imports, importsToRemove, sourcePackage, targetPackage} = options

  const importDeclarations = sourceFile
    .getImportDeclarations()
    .filter(
      (importDecl) => importDecl.getModuleSpecifierValue() === sourcePackage,
    )

  const shouldMoveAll = !imports || imports.length === 0
  let needsSave = false

  for (const importDecl of importDeclarations) {
    const namedImports = importDecl.getNamedImports()
    const defaultImport = importDecl.getDefaultImport()
    const namespaceImport = importDecl.getNamespaceImport()

    if (namedImports.length === 0 && !defaultImport && !namespaceImport) {
      continue
    }

    const importsToMove: typeof namedImports = []
    const importsToKeep: typeof namedImports = []

    for (const namedImport of namedImports) {
      const name = namedImport.getName()
      if (importsToRemove?.includes(name)) {
        continue
      }
      const shouldMove =
        shouldMoveAll ||
        imports.some((imp) =>
          typeof imp === "string" ? imp === name : imp.name === name,
        )
      if (shouldMove) {
        importsToMove.push(namedImport)
      } else {
        importsToKeep.push(namedImport)
      }
    }

    const removedCount =
      namedImports.length - importsToMove.length - importsToKeep.length
    if (importsToMove.length === 0 && removedCount === 0) {
      continue
    }

    const importIndex = sourceFile.getImportDeclarations().indexOf(importDecl)
    const moveImportStructures = importsToMove.map((imp) => {
      const name = imp.getName()
      const existingAlias = imp.getAliasNode()?.getText()
      const importConfig = imports?.find(
        (impConfig) => typeof impConfig === "object" && impConfig.name === name,
      )
      return {
        isTypeOnly: imp.isTypeOnly(),
        name:
          typeof importConfig === "object" && importConfig.renameTo
            ? importConfig.renameTo
            : name,
        ...(existingAlias && {alias: existingAlias}),
      }
    })

    const seenImports = new Map<
      string,
      {alias?: string; isTypeOnly: boolean; name: string}
    >()
    for (const item of moveImportStructures) {
      const key = `${item.name}::${item.alias ?? ""}`
      const existing = seenImports.get(key)
      if (!existing) {
        seenImports.set(key, item)
      } else if (!item.isTypeOnly) {
        existing.isTypeOnly = false
      }
    }
    const uniqueMoveImportStructures = Array.from(seenImports.values())

    const newImports = []
    if (uniqueMoveImportStructures.length > 0) {
      newImports.push({
        moduleSpecifier: targetPackage,
        namedImports: uniqueMoveImportStructures,
      })
    }
    if (importsToKeep.length > 0 || defaultImport || namespaceImport) {
      const keepImportDecl: any = {
        moduleSpecifier: sourcePackage,
        namedImports: importsToKeep.map((imp) => ({
          alias: imp.getAliasNode()?.getText(),
          isTypeOnly: imp.isTypeOnly(),
          name: imp.getName(),
        })),
      }
      if (defaultImport) {
        keepImportDecl.defaultImport = defaultImport.getText()
      }
      if (namespaceImport) {
        keepImportDecl.namespaceImport = namespaceImport.getText()
      }
      newImports.push(keepImportDecl)
    }

    importDecl.remove()
    for (let i = 0; i < newImports.length; i++) {
      const decl = sourceFile.insertImportDeclaration(
        importIndex,
        newImports[i],
      )
      decl.formatText({semicolons: "remove" as any})
    }
    needsSave = true
  }

  return needsSave
}

export const importsPlugin: TransformPlugin = {
  name: "imports",
  transform,
}
