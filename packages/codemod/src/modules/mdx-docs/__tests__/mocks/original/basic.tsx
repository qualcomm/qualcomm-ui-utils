// @ts-nocheck
import {DocsLayout, DocsLayoutProps, MdxProvider} from "@qui/mdx-docs"

export function MyDocs(props: DocsLayoutProps) {
  return (
    <MdxProvider>
      <DocsLayout {...props} />
    </MdxProvider>
  )
}
