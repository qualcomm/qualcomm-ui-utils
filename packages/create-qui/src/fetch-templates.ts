// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

const GITHUB_API_URL =
  "https://api.github.com/repos/qualcomm/qualcomm-ui-templates/contents/templates"

interface GitHubContent {
  name: string
  path: string
  type: "file" | "dir"
}

export async function fetchTemplateNames(): Promise<string[]> {
  const response = await fetch(GITHUB_API_URL, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "create-qui",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch templates: ${response.status} ${response.statusText}`,
    )
  }

  const contents: GitHubContent[] = await response.json()

  return contents.filter((item) => item.type === "dir").map((item) => item.name)
}
