// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

export interface Template {
  details: string
  framework: string
  hasTailwind: boolean
  name: string
  renderingMode?: "csr" | "ssr"
}

/**
 * Parses template folder names following the convention:
 * `<framework>-<details>-<(csr|ssr)?>-<tailwind?>`
 *
 * Examples:
 * ```
 * - "angular-ssr" -> { framework: "angular", details: "", renderingMode: "ssr", hasTailwind: false }
 * - "react-router-ssr-tailwind" -> { framework: "react", details: "router", renderingMode: "ssr", hasTailwind: true }
 * - "nextjs" -> { framework: "nextjs", details: "", renderingMode: undefined, hasTailwind: false }
 * ```
 */
export function parseTemplateName(name: string): Template {
  const segments = name.split("-")
  const framework = segments[0]
  let hasTailwind = false
  let renderingMode: "csr" | "ssr" | undefined

  const remainingSegments = segments.slice(1)

  if (remainingSegments.at(-1) === "tailwind") {
    hasTailwind = true
    remainingSegments.pop()
  }

  const renderModeIndex = remainingSegments.findIndex(
    (s) => s === "csr" || s === "ssr",
  )
  if (renderModeIndex !== -1) {
    renderingMode = remainingSegments[renderModeIndex] as "csr" | "ssr"
    remainingSegments.splice(renderModeIndex, 1)
  }

  const details = remainingSegments.join("-")

  return {
    details,
    framework,
    hasTailwind,
    name,
    renderingMode,
  }
}

export function parseTemplates(names: string[]): Template[] {
  return names.map(parseTemplateName)
}

export function getUniqueFrameworks(templates: Template[]): string[] {
  return [...new Set(templates.map((t) => t.framework))]
}

export function filterByFramework(
  templates: Template[],
  framework: string,
): Template[] {
  return templates.filter((t) => t.framework === framework)
}

export function hasRenderingModeOptions(templates: Template[]): boolean {
  return templates.some((t) => t.renderingMode !== undefined)
}

export function hasTailwindOptions(templates: Template[]): boolean {
  const withTailwind = templates.filter((t) => t.hasTailwind)
  const withoutTailwind = templates.filter((t) => !t.hasTailwind)
  return withTailwind.length > 0 && withoutTailwind.length > 0
}

export function findTemplate(
  templates: Template[],
  framework: string,
  renderingMode?: "csr" | "ssr",
  hasTailwind?: boolean,
): Template | undefined {
  return templates.find((t) => {
    if (t.framework !== framework) {
      return false
    }
    if (renderingMode !== undefined && t.renderingMode !== renderingMode) {
      return false
    }
    if (hasTailwind !== undefined && t.hasTailwind !== hasTailwind) {
      return false
    }
    return true
  })
}
