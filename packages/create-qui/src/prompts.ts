// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import * as p from "@clack/prompts"

import {
  filterByFramework,
  findTemplate,
  getUniqueFrameworks,
  hasRenderingModeOptions,
  hasTailwindOptions,
  parseTemplates,
  type Template,
} from "./parse-template"

export interface PromptResult {
  targetDir: string
  template: Template
}

function handleCancel(): never {
  p.cancel("Operation cancelled.")
  process.exit(0)
}

export async function runPrompts(
  templateNames: string[],
): Promise<PromptResult | null> {
  const templates = parseTemplates(templateNames)

  if (templates.length === 0) {
    p.log.error("No templates found in the repository.")
    return null
  }

  p.intro("Create a new Qualcomm UI project")

  const frameworks = getUniqueFrameworks(templates)

  const framework = await p.select({
    message: "Select a framework",
    options: frameworks.map((f) => ({
      label: formatFrameworkName(f),
      value: f,
    })),
  })

  if (p.isCancel(framework)) {
    handleCancel()
  }

  const frameworkTemplates = filterByFramework(templates, framework)
  let renderingMode: "csr" | "ssr" | undefined
  let useTailwind: boolean | undefined

  if (hasRenderingModeOptions(frameworkTemplates)) {
    const modes = [
      ...new Set(
        frameworkTemplates.map((t) => t.renderingMode).filter(Boolean),
      ),
    ] as ("csr" | "ssr")[]

    if (modes.length > 1) {
      const modeResult = await p.select({
        message: "Select rendering mode",
        options: modes.map((m) => ({
          hint: m === "ssr" ? "Server-side rendering" : "Client-side rendering",
          label: m.toUpperCase(),
          value: m,
        })),
      })

      if (p.isCancel(modeResult)) {
        handleCancel()
      }

      renderingMode = modeResult
    } else if (modes.length === 1) {
      renderingMode = modes[0]
    }
  }

  const templatesWithMode = frameworkTemplates.filter(
    (t) => renderingMode === undefined || t.renderingMode === renderingMode,
  )

  if (hasTailwindOptions(templatesWithMode)) {
    const tailwindResult = await p.confirm({
      initialValue: false,
      message: "Use Tailwind CSS?",
    })

    if (p.isCancel(tailwindResult)) {
      handleCancel()
    }

    useTailwind = tailwindResult
  }

  const selectedTemplate = findTemplate(
    templates,
    framework,
    renderingMode,
    useTailwind,
  )

  if (!selectedTemplate) {
    p.log.error("No matching template found for your selections.")
    return null
  }

  p.log.info(`Selected template: ${selectedTemplate.name}`)

  const targetDir = await p.text({
    defaultValue: `./${selectedTemplate.name}`,
    message: "Project directory",
    placeholder: `./${selectedTemplate.name}`,
    validate: (value) => {
      if (!value || value.trim() === "") {
        return "Please enter a directory name"
      }
    },
  })

  if (p.isCancel(targetDir)) {
    handleCancel()
  }

  return {
    targetDir: targetDir || `./${selectedTemplate.name}`,
    template: selectedTemplate,
  }
}

function formatFrameworkName(name: string): string {
  const names: Record<string, string> = {
    angular: "Angular",
    nextjs: "Next.js",
    react: "React",
    svelte: "Svelte",
    vue: "Vue",
  }
  return names[name] || name.charAt(0).toUpperCase() + name.slice(1)
}
