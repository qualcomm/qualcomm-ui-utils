// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {Project, type SourceFile} from "ts-morph"

export function mergeImports(sourceFile: SourceFile): void {
  const fullText = sourceFile.getFullText()
  const allImports = sourceFile.getImportDeclarations()
  if (allImports.length === 0) {
    return
  }

  const firstImport = allImports[0]
  const lastImport = allImports[allImports.length - 1]

  const restOfFile = fullText.substring(lastImport.getEnd())

  const importsByModule = new Map<
    string,
    {
      defaultImport?: string
      namedImports: Array<{alias?: string; isTypeOnly: boolean; name: string}>
      namespaceImport?: string
    }
  >()
  const moduleOrder: string[] = []

  for (const importDecl of allImports) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue()
    if (!importsByModule.has(moduleSpecifier)) {
      importsByModule.set(moduleSpecifier, {namedImports: []})
      moduleOrder.push(moduleSpecifier)
    }

    const moduleData = importsByModule.get(moduleSpecifier)!

    const defaultImport = importDecl.getDefaultImport()
    if (defaultImport && !moduleData.defaultImport) {
      moduleData.defaultImport = defaultImport.getText()
    }

    const namespaceImport = importDecl.getNamespaceImport()
    if (namespaceImport && !moduleData.namespaceImport) {
      moduleData.namespaceImport = namespaceImport.getText()
    }

    for (const namedImport of importDecl.getNamedImports()) {
      const name = namedImport.getName()
      const alias = namedImport.getAliasNode()?.getText()
      const isTypeOnly = namedImport.isTypeOnly()
      const isDuplicate = moduleData.namedImports.some(
        (imp) => imp.name === name && imp.alias === alias,
      )
      if (!isDuplicate) {
        moduleData.namedImports.push({alias, isTypeOnly, name})
      }
    }
  }

  const tempProject = new Project()
  const tempFile = tempProject.createSourceFile("temp.ts", "")

  for (let i = 0; i < moduleOrder.length; i++) {
    const moduleSpecifier = moduleOrder[i]
    const moduleData = importsByModule.get(moduleSpecifier)!
    if (
      moduleData.namedImports.length === 0 &&
      !moduleData.defaultImport &&
      !moduleData.namespaceImport
    ) {
      continue
    }

    const importStructure: any = {
      moduleSpecifier,
    }
    if (moduleData.defaultImport) {
      importStructure.defaultImport = moduleData.defaultImport
    }
    if (moduleData.namespaceImport) {
      importStructure.namespaceImport = moduleData.namespaceImport
    }
    if (moduleData.namedImports.length > 0) {
      importStructure.namedImports = moduleData.namedImports
    }
    const newDecl = tempFile.insertImportDeclaration(i, importStructure)
    newDecl.formatText({semicolons: "remove" as any})
  }

  const importsText = tempFile.getFullText()
  const newContent = importsText + restOfFile
  sourceFile.replaceText([firstImport.getStart(), fullText.length], newContent)
}
