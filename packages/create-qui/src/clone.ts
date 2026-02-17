// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import tiged from "tiged"

const REPO_BASE = "qualcomm/qualcomm-ui-templates/templates"

export async function cloneTemplate(
  templateName: string,
  targetDir: string,
): Promise<void> {
  const source = `${REPO_BASE}/${templateName}`
  const emitter = tiged(source, {
    disableCache: true,
    force: false,
    verbose: false,
  })

  emitter.on("info", (info) => {
    if (process.env.BUILD_MODE === "development") {
      console.log(info.message)
    }
  })

  emitter.on("warn", (warning) => {
    console.warn(warning.message)
  })

  await emitter.clone(targetDir)
}
