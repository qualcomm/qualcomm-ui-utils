// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import type {Plugin} from "vite"

export function useClientPlugin(): Plugin {
  return {
    name: "qui-use-client",
    renderChunk(code) {
      if (code.startsWith('"use client";')) {
        return null
      }
      return {code: `"use client";\n${code}`}
    },
  }
}
