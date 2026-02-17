// @ts-nocheck
import {useSiteContext, SiteContextProvider} from "@qui/mdx-docs"
import {useMdxDocsContext, MdxDocsProvider} from "@qui/mdx-docs"
import {CodeHighlight, NotFound} from "@qui/mdx-docs"

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
