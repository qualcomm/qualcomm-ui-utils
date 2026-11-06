// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {describe, expect, it} from "vitest"

import changelogFunctions from "./changelog-formatter.js"

const repo = "https://github.com/qualcomm/qualcomm-ui-utils"

function getReleaseLine(summary: string, commit?: string) {
  return changelogFunctions.getReleaseLine({commit, summary}, "minor", {repo})
}

describe("getReleaseLine", () => {
  it("formats a single-line summary", () => {
    expect(
      getReleaseLine("feat(button): add size prop\n\ncommit: abc1234"),
    ).toBe(
      `### Features\n* [button]: add size prop ([abc1234](${repo}/commit/abc1234))`,
    )
  })

  it("renders the body as indented markdown under the bullet", () => {
    const summary = [
      "feat(button): add size prop",
      "",
      "Supports **sm**, `md`, and lg.",
      "",
      "- sm: 24px",
      "- md: 32px",
      "",
      "```tsx",
      '<Button size="sm" />',
      "",
      '<Button size="md" />',
      "```",
      "",
      "commit: abc1234",
    ].join("\n")

    expect(getReleaseLine(summary)).toBe(
      [
        `### Features`,
        `* [button]: add size prop ([abc1234](${repo}/commit/abc1234))`,
        "",
        "  Supports **sm**, `md`, and lg.",
        "",
        "  - sm: 24px",
        "  - md: 32px",
        "",
        "  ```tsx",
        '  <Button size="sm" />',
        "",
        '  <Button size="md" />',
        "  ```",
      ].join("\n"),
    )
  })

  it("only reads the breaking marker from the title", () => {
    const summary = "fix: handle empty input\n\nNot a breaking change."

    expect(getReleaseLine(summary)).toBe(
      [
        "### Bug Fixes",
        "* handle empty input",
        "",
        "  Not a breaking change.",
      ].join("\n"),
    )
  })

  it("treats a BREAKING CHANGE footer in the body as breaking", () => {
    expect(
      getReleaseLine("feat: drop node 18\n\nBREAKING CHANGE: requires node 20"),
    ).toBe(
      "### BREAKING CHANGES\n* drop node 18\n\n  BREAKING CHANGE: requires node 20",
    )
  })

  it("strips commit and sign-off lines from the body", () => {
    expect(
      getReleaseLine(
        "fix: typo\n\nDetails.\n\ncommit: def5678\nSigned-off-by: Someone <a@b.c>",
      ),
    ).toBe(
      `### Bug Fixes\n* typo ([def5678](${repo}/commit/def5678))\n\n  Details.`,
    )
  })
})
