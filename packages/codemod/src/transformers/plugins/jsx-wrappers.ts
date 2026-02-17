// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {
  type JsxElement,
  type JsxSelfClosingElement,
  Node,
  type SourceFile,
  SyntaxKind,
} from "ts-morph"

import type {TransformContext, TransformPlugin} from "../types"

interface JsxWrapper {
  name: string
  wrapWith: string[]
}

function applyJsxWrapper(sourceFile: SourceFile, wrapper: JsxWrapper): boolean {
  let madeChanges = false

  // Handle JsxElement (with opening/closing tags)
  while (true) {
    const jsxElements: JsxElement[] = sourceFile.getDescendantsOfKind(
      SyntaxKind.JsxElement,
    )
    const element = jsxElements.find((el) => {
      const openingElement = el.getOpeningElement()
      const tagName = openingElement.getTagNameNode()
      if (tagName.getText() !== wrapper.name) {
        return false
      }
      const parent = el.getParent()
      if (parent && Node.isJsxElement(parent)) {
        const parentTag = parent.getOpeningElement().getTagNameNode().getText()
        if (wrapper.wrapWith.includes(parentTag)) {
          return false
        }
      }
      return true
    })
    if (!element) {
      break
    }
    const rawText = element.getText()
    const lines = rawText.split("\n")
    const childIndents = lines
      .slice(1)
      .filter((line: string) => line.trimStart().length > 0)
      .map((line: string) => line.length - line.trimStart().length)
    const minChildIndent =
      childIndents.length > 0 ? Math.min(...childIndents) : 0
    let text = lines
      .map((line: string, i: number) =>
        i === 0 ? line : line.slice(minChildIndent),
      )
      .join("\n")
    for (let i = wrapper.wrapWith.length - 1; i >= 0; i--) {
      const wrapTag = wrapper.wrapWith[i]
      const textLines = text.split("\n")
      const indented = textLines.map((line: string) => `  ${line}`).join("\n")
      text = `<${wrapTag}>\n${indented}\n</${wrapTag}>`
    }
    element.replaceWithText(text)
    madeChanges = true
  }

  // Handle JsxSelfClosingElement
  while (true) {
    const selfClosingElements: JsxSelfClosingElement[] =
      sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    const element = selfClosingElements.find((el) => {
      const tagName = el.getTagNameNode()
      if (tagName.getText() !== wrapper.name) {
        return false
      }
      const parent = el.getParent()
      if (parent && Node.isJsxElement(parent)) {
        const parentTag = parent.getOpeningElement().getTagNameNode().getText()
        if (wrapper.wrapWith.includes(parentTag)) {
          return false
        }
      }
      return true
    })
    if (!element) {
      break
    }
    let text = element.getText()
    for (let i = wrapper.wrapWith.length - 1; i >= 0; i--) {
      const wrapTag = wrapper.wrapWith[i]
      text = `<${wrapTag}>\n${text}\n</${wrapTag}>`
    }
    element.replaceWithText(text)
    madeChanges = true
  }

  return madeChanges
}

function transform(ctx: TransformContext): boolean {
  const {options, sourceFile} = ctx
  const {jsxWrappers} = options

  if (!jsxWrappers || jsxWrappers.length === 0) {
    return false
  }

  let changed = false

  for (const wrapper of jsxWrappers) {
    if (applyJsxWrapper(sourceFile, wrapper)) {
      changed = true
    }
  }

  return changed
}

export const jsxWrappersPlugin: TransformPlugin = {
  name: "jsx-wrappers",
  transform,
}
