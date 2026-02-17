// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import * as p from "@clack/prompts"
import {existsSync} from "node:fs"
import {resolve} from "node:path"

import {cloneTemplate} from "./clone"
import {fetchTemplateNames} from "./fetch-templates"
import {runPrompts} from "./prompts"

export async function main(): Promise<void> {
  try {
    const s = p.spinner()
    s.start("Fetching available templates...")

    const templateNames = await fetchTemplateNames()

    s.stop("Templates loaded")

    const result = await runPrompts(templateNames)

    if (!result) {
      process.exit(1)
    }

    const targetPath = resolve(result.targetDir)

    if (existsSync(targetPath)) {
      p.log.error(`Directory already exists: ${targetPath}`)
      process.exit(1)
    }

    s.start(`Creating project in ${result.targetDir}...`)

    await cloneTemplate(result.template.name, targetPath)

    s.stop("Project created")

    p.outro(`Done! Your project is ready at ${result.targetDir}`)

    p.log.info("Next steps:")
    p.log.step(`  cd ${result.targetDir}`)
    p.log.step("  pnpm install")
    p.log.step("  pnpm dev")
  } catch (error) {
    p.log.error(
      error instanceof Error ? error.message : "An unknown error occurred",
    )
    process.exit(1)
  }
}
