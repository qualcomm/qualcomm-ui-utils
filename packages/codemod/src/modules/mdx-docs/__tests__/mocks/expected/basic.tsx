// @ts-nocheck
import { DocsLayout, DocsLayoutProps, MdxProvider } from "@qualcomm-ui/react-mdx/docs-layout"


// @ts-nocheck

export function MyDocs(props: DocsLayoutProps) {
  return (
    <MdxProvider>
      <DocsLayout {...props} />
    </MdxProvider>
  )
}
