// @ts-nocheck
import { HighlightText, UseHighlightProps, useHighlight } from "@qualcomm-ui/react-core/highlight"
import { FileTree } from "@qualcomm-ui/react-mdx/file-tree"


// @ts-nocheck

export function SearchResult({query, text}: {query: string; text: string}) {
  return <HighlightMatches query={query} text={text} />
}

export function FileExplorer() {
  return <Tree items={[]} />
}
