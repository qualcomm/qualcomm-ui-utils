// @ts-nocheck
import { useSiteContext, SiteContextProvider, useMdxDocsContext, MdxDocsProvider } from "@qualcomm-ui/react-mdx/context"
import { NotFound } from "@qualcomm-ui/react-mdx/not-found"
import { CodeHighlight } from "@qualcomm-ui/react-mdx/code-highlight"


// @ts-nocheck

export function App() {
  const site = useSiteContext()
  const docs = useMdxDocsContext()

  return (
    <SiteContextProvider value={site}>
      <MdxDocsProvider value={docs}>
        <CodeHighlight code="const x = 1" />
        <NotFound />
      </MdxDocsProvider>
    </SiteContextProvider>
  )
}
