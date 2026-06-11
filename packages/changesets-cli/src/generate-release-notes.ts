// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {readFile, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"

import {getChangedChangelogs} from "./consolidate-changelogs.js"

const RELEASE_NOTES_FILENAME = "release-notes.md"

interface ChangelogEntry {
  date: string
  packageName: string
  sections: string
  version: string
}

function extractLatestEntry(
  content: string,
  fallbackName: string,
): ChangelogEntry | null {
  const lines = content.split("\n")

  const titleMatch = lines[0]?.match(/^# (.+) Changelog$/)
  const packageName = titleMatch?.[1] ?? fallbackName

  const firstVersionIndex = lines.findIndex((l) => l.startsWith("## "))
  if (firstVersionIndex === -1) {
    return null
  }

  const versionMatch = lines[firstVersionIndex].match(/^## ([\d.]+)/)
  if (!versionMatch) {
    return null
  }

  const version = versionMatch[1]

  const endIndex = lines.findIndex(
    (l, i) => i > firstVersionIndex && l.startsWith("## "),
  )

  const bodyLines = lines.slice(
    firstVersionIndex + 1,
    endIndex === -1 ? undefined : endIndex,
  )

  const dateLine = bodyLines.find((l) => /^[A-Z][a-z]{2} \d/.test(l.trim()))
  const date = dateLine?.trim() ?? ""

  const sections = bodyLines
    .filter((l) => l.trim() !== date)
    .join("\n")
    .trim()

  return {date, packageName, sections, version}
}

function isDepsOnlyEntry(sections: string): boolean {
  const lines = sections.split("\n").filter((l) => l.trim())

  const hasOnlyChoresHeader = lines
    .filter((l) => l.startsWith("### "))
    .every((l) => l === "### Miscellaneous Chores")

  const bulletLines = lines.filter((l) => l.startsWith("- "))
  const allDepsBullets = bulletLines.every((l) =>
    l.includes("**deps:** update dependencies"),
  )

  return hasOnlyChoresHeader && allDepsBullets && bulletLines.length > 0
}

function getReleaseNotesPath(): string {
  return join(tmpdir(), RELEASE_NOTES_FILENAME)
}

export async function generateReleaseNotes(): Promise<string> {
  const changedChangelogs = getChangedChangelogs()

  if (changedChangelogs.length === 0) {
    console.log("No changed changelogs, skipping release notes generation")
    return ""
  }

  const entries: ChangelogEntry[] = []

  for (const changelogPath of changedChangelogs) {
    const content = await readFile(changelogPath, "utf-8")
    const entry = extractLatestEntry(content, changelogPath)
    if (entry) {
      entries.push(entry)
    }
  }

  if (entries.length === 0) {
    console.log("No parseable changelog entries found")
    return ""
  }

  const substantive = entries.filter((e) => !isDepsOnlyEntry(e.sections))
  const depsOnly = entries.filter((e) => isDepsOnlyEntry(e.sections))

  const lines: string[] = ["# Release Notes", ""]

  for (const entry of substantive) {
    lines.push(
      `## ${entry.packageName} — ${entry.version} (${entry.date})`,
      "",
      entry.sections,
      "",
    )
  }

  if (depsOnly.length > 0) {
    lines.push(
      "---",
      "",
      "<details>",
      "<summary>Dependency-only updates</summary>",
      "",
    )
    for (const entry of depsOnly) {
      lines.push(`- ${entry.packageName} — ${entry.version}`)
    }
    lines.push("", "</details>", "")
  }

  const markdown = lines.join("\n")
  const outPath = getReleaseNotesPath()
  await writeFile(outPath, markdown)

  console.log(`Release notes written to ${outPath}`)
  console.log(
    `  ${substantive.length} package(s) with changes, ${depsOnly.length} dependency-only update(s)`,
  )

  return outPath
}
