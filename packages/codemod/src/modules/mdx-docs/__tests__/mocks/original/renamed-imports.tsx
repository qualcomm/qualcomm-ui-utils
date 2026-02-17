// @ts-nocheck
import {HighlightMatches, HighlightProp, HighlightTerms} from "@qui/mdx-docs"
import {Tree} from "@qui/mdx-docs"

export function SearchResult({query, text}: {query: string; text: string}) {
  return <HighlightMatches query={query} text={text} />
}

export function FileExplorer() {
  return <Tree items={[]} />
}
