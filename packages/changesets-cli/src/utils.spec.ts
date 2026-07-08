// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {describe, expect, it} from "vitest"

import {translateCommitsToConventionalCommitMessages} from "./utils.js"

describe("translateCommitsToConventionalCommitMessages", () => {
  it("keeps conventional commits", () => {
    expect(
      translateCommitsToConventionalCommitMessages([
        {
          commitHash: "abc1234",
          commitMessage: "fix(button): align icon spacing",
        },
      ]),
    ).toEqual([
      {
        changelogMessage: "fix(button): align icon spacing",
        commitHashes: ["abc1234"],
      },
    ])
  })

  it("ignores non-conventional commits", () => {
    expect(
      translateCommitsToConventionalCommitMessages([
        {
          commitHash: "abc1234",
          commitMessage: "align icon spacing",
        },
      ]),
    ).toEqual([])
  })

  it("ignores commits with no-ci in the subject", () => {
    expect(
      translateCommitsToConventionalCommitMessages([
        {
          commitHash: "abc1234",
          commitMessage: "fix(button): align icon spacing [no-ci]",
        },
      ]),
    ).toEqual([])
  })

  it("ignores commits with no-ci in the body", () => {
    expect(
      translateCommitsToConventionalCommitMessages([
        {
          commitHash: "abc1234",
          commitMessage: "fix(button): align icon spacing\n\nno-ci",
        },
      ]),
    ).toEqual([])
  })

  it("matches no-ci case-sensitively", () => {
    expect(
      translateCommitsToConventionalCommitMessages([
        {
          commitHash: "abc1234",
          commitMessage: "fix(button): align icon spacing [NO-CI]",
        },
      ]),
    ).toEqual([
      {
        changelogMessage: "fix(button): align icon spacing [NO-CI]",
        commitHashes: ["abc1234"],
      },
    ])
  })
})
