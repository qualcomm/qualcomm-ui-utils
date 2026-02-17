// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import type {ClassTransformEntry} from "../../transformers/types"

const metadataSizeMap: Record<string, string> = {
  lg: "sm",
  md: "xs",
  sm: "xs",
  xl: "md",
}

export const tailwindClassTransforms: ClassTransformEntry[] = [
  {
    pattern: /^q-font-body-(xxs|xs|sm|md|lg|xl|xxl)$/,
    replacement: (_match, size) => `font-body-${size}`,
  },
  {
    pattern: /^q-font-body-(xxs|xs|sm|md|lg|xl|xxl)-strong$/,
    replacement: (_match, size) => `font-body-${size}-bold`,
  },
  {
    pattern: /^q-font-heading-(xxs|xs|sm|md|lg|xl|xxl|xxxl)$/,
    replacement: (_match, size) => `font-heading-${size}`,
  },
  {
    pattern: /^q-font-heading-(xxs|xs|sm|md|lg|xl|xxl|xxxl)-subtle$/,
    replacement: (_match, size) => `font-heading-${size}`,
  },
  {
    pattern: /^q-font-code-(xs|sm|md|lg|xl)$/,
    replacement: (_match, size) => `font-code-${size}`,
  },
  {
    pattern: /^q-font-code-(xs|sm|md|lg|xl)-strong$/,
    replacement: (_match, size) => `font-code-${size}-bold`,
  },
  {
    pattern: /^q-font-metadata-(sm|md|lg|xl)$/,
    replacement: (_match, size) => `font-body-${metadataSizeMap[size] || size}`,
  },
  {
    pattern: /^q-font-metadata-(sm|md|lg|xl)-strong$/,
    replacement: (_match, size) =>
      `font-body-${metadataSizeMap[size] || size}-bold`,
  },
  {
    pattern: /^q-font-metadata-(sm|md|lg|xl)-mono$/,
    replacement: (_match, size) => `font-code-${metadataSizeMap[size] || size}`,
  },

  {pattern: "bg-1", replacement: "bg-neutral-00"},
  {pattern: "bg-2", replacement: "bg-neutral-01"},
  {pattern: "bg-3", replacement: "bg-neutral-02"},
  {pattern: "bg-4", replacement: "bg-neutral-03"},
  {pattern: "bg-contrast-1", replacement: "bg-neutral-10"},
  {pattern: "bg-contrast-2", replacement: "bg-neutral-09"},
  {pattern: "bg-contrast-3", replacement: "bg-neutral-08"},
  {pattern: "bg-contrast-4", replacement: "bg-neutral-07"},

  {pattern: "text-primary", replacement: "text-neutral-primary"},
  {pattern: "text-secondary", replacement: "text-neutral-secondary"},
  {pattern: "text-error", replacement: "text-support-danger"},
  {pattern: "text-link", replacement: "text-link-default-idle"},
  {pattern: "text-contrast-primary", replacement: "text-neutral-inverse"},
  {pattern: "text-contrast-secondary", replacement: "text-neutral-secondary"},
  {pattern: "text-contrast-disabled", replacement: "text-disabled"},
  {pattern: "text-semantic-informative", replacement: "text-support-info"},
  {pattern: "text-semantic-negative", replacement: "text-support-danger"},
  {pattern: "text-semantic-positive", replacement: "text-support-success"},
  {pattern: "text-semantic-primary", replacement: "text-brand-primary"},
  {pattern: "text-semantic-secondary", replacement: "text-neutral-secondary"},
  {pattern: "text-semantic-warning", replacement: "text-support-warning"},
  {
    pattern: "text-foreground-primary",
    replacement: "text-icon-neutral-primary",
  },
  {
    pattern: "text-foreground-secondary",
    replacement: "text-icon-neutral-secondary",
  },
  {pattern: "text-foreground-disabled", replacement: "text-disabled-icon"},
  {
    pattern: "text-foreground-contrast-primary",
    replacement: "text-icon-neutral-inverse",
  },
  {
    pattern: "text-foreground-contrast-secondary",
    replacement: "text-icon-neutral-secondary",
  },
  {
    pattern: "text-foreground-contrast-disabled",
    replacement: "text-disabled-icon",
  },

  {pattern: "border-default", replacement: "border-neutral-01"},
  {pattern: "border-subtle", replacement: "border-neutral-00"},
  {pattern: "border-strong", replacement: "border-neutral-02"},
  {pattern: "border-focus", replacement: "border-focus-border"},
  {pattern: "border-contrast-default", replacement: "border-neutral-10"},
  {pattern: "border-contrast-subtle", replacement: "border-neutral-09"},
  {pattern: "border-contrast-strong", replacement: "border-neutral-10"},

  {pattern: "q-border-default", replacement: "border-neutral-01"},
  {pattern: "q-border-subtle", replacement: "border-neutral-00"},
  {pattern: "q-border-strong", replacement: "border-neutral-02"},

  {pattern: "q-background-1", replacement: "bg-neutral-01"},
  {pattern: "q-background-2", replacement: "bg-neutral-02"},
  {pattern: "q-background-3", replacement: "bg-neutral-03"},
  {pattern: "q-background-4", replacement: "bg-neutral-04"},

  {pattern: "q-text-link", replacement: "text-link-default-idle"},
  {pattern: "q-text-error", replacement: "text-support-danger"},

  {pattern: "q-elevation-1", replacement: "shadow-lowest"},
  {pattern: "q-elevation-2", replacement: "shadow-low"},
  {pattern: "q-elevation-3", replacement: "shadow-medium"},
  {pattern: "q-elevation-4", replacement: "shadow-high"},
  {pattern: "q-elevation-5", replacement: "shadow-highest"},

  {pattern: "rounded-2xl", replacement: "rounded-xxl"},

  {pattern: "font-stretch-normal", replacement: ""},
  {pattern: "font-stretch-wide", replacement: ""},
]

export const tailwindVariableTransforms: ClassTransformEntry[] = [
  {
    pattern: /var\(--q-background-1\)/g,
    replacement: "var(--color-background-neutral-01)",
  },
  {
    pattern: /var\(--q-background-2\)/g,
    replacement: "var(--color-background-neutral-02)",
  },
  {
    pattern: /var\(--q-background-3\)/g,
    replacement: "var(--color-background-neutral-03)",
  },
  {
    pattern: /var\(--q-background-4\)/g,
    replacement: "var(--color-background-neutral-04)",
  },
  {
    pattern: /var\(--q-text-1-primary\)/g,
    replacement: "var(--color-text-neutral-primary)",
  },
  {
    pattern: /var\(--q-text-1-secondary\)/g,
    replacement: "var(--color-text-neutral-secondary)",
  },
  {
    pattern: /var\(--q-text-1-disabled\)/g,
    replacement: "var(--color-utility-disabled-text)",
  },
  {
    pattern: /var\(--q-text-error\)/g,
    replacement: "var(--color-text-support-danger)",
  },
  {
    pattern: /var\(--q-text-link\)/g,
    replacement: "var(--color-interactive-text-link-default-idle)",
  },
  {
    pattern: /var\(--q-border-1-default\)/g,
    replacement: "var(--color-border-neutral-01)",
  },
  {
    pattern: /var\(--q-border-1-subtle\)/g,
    replacement: "var(--color-border-neutral-00)",
  },
  {
    pattern: /var\(--q-border-1-strong\)/g,
    replacement: "var(--color-border-neutral-02)",
  },
  {
    pattern: /var\(--q-border-focus\)/g,
    replacement: "var(--color-utility-focus-border)",
  },
  {pattern: /var\(--q-elevation-1\)/g, replacement: "var(--shadow-lowest)"},
  {pattern: /var\(--q-elevation-2\)/g, replacement: "var(--shadow-low)"},
  {pattern: /var\(--q-elevation-3\)/g, replacement: "var(--shadow-medium)"},
  {pattern: /var\(--q-elevation-4\)/g, replacement: "var(--shadow-high)"},
  {pattern: /var\(--q-elevation-5\)/g, replacement: "var(--shadow-highest)"},
  {
    pattern: /var\(--q-font-family\)/g,
    replacement: "var(--type-font-family-secondary)",
  },
  {
    pattern: /var\(--q-font-family-brand\)/g,
    replacement: "var(--type-font-family-primary)",
  },
  {
    pattern: /var\(--q-font-mono\)/g,
    replacement: "var(--type-font-family-tertiary)",
  },
]

export const allTailwindTransforms: ClassTransformEntry[] = [
  ...tailwindClassTransforms,
  ...tailwindVariableTransforms,
]
