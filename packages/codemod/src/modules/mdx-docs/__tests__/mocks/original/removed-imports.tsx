// @ts-nocheck
import {Tip, TipIcon, TipStatus} from "@qui/mdx-docs"
import {TreeConfig, useTreeContext, TreeFile} from "@qui/mdx-docs"
import {DocsLayout} from "@qui/mdx-docs"

export function MyTip() {
  return <Tip status="info">Some tip</Tip>
}

export function MyDocs() {
  return <DocsLayout />
}
