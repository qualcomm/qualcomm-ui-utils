// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {describe, expect, it} from "vitest"

import {useClientPlugin} from "./use-client-plugin.js"

function callRenderChunk(
  code: string,
): {code: string} | string | null | undefined {
  const plugin = useClientPlugin()
  const hook = plugin.renderChunk as unknown as (
    this: any,
    code: string,
    chunk: any,
    options: any,
  ) => {code: string} | string | null | undefined
  return hook.call({}, code, {}, {})
}

describe("useClientPlugin", () => {
  it("returns a plugin with the correct name", () => {
    const plugin = useClientPlugin()
    expect(plugin.name).toBe("qui-use-client")
  })

  it("prepends 'use client' directive to chunk code", () => {
    const result = callRenderChunk("export const x = 1;")
    expect(result).toEqual({code: `"use client";\nexport const x = 1;`})
  })

  it("handles empty code", () => {
    const result = callRenderChunk("")
    expect(result).toEqual({code: `"use client";\n`})
  })

  it("is idempotent — does not prepend twice", () => {
    const result = callRenderChunk(`"use client";\nexport const x = 1;`)
    expect(result).toBeNull()
  })
})
