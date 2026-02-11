import {defineConfig} from "eslint/config"
import tseslint from "typescript-eslint"

import quiEslintMdx from "@qualcomm-ui/eslint-config-mdx"
import quiEslintTs from "@qualcomm-ui/eslint-config-typescript"

const languageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    projectService: true,
  },
}

export default defineConfig(
  {
    ignores: [
      "**/.angular/",
      "**/.nx/",
      "**/.nyc-output/",
      "**/.react-router/",
      "**/.turbo/",
      "**/.sst/",
      "**/build/",
      "**/coverage/",
      "**/dist/",
      "**/node_modules/",
      "**/out/",
      "**/out-tsc/",
      "**/vite.config.ts.timestamp*",
      "**/temp/",
      "**/public/exports/**",
    ],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        EventListenerOrEventListenerObject: true,
        FocusOptions: true,
        JSX: true,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: "module",
    },
  },
  {
    extends: [...quiEslintTs.configs.recommended],
    files: ["scripts/*.ts"],
  },
  {
    extends: [
      quiEslintTs.configs.base,
      quiEslintTs.configs.sortKeys,
      quiEslintTs.configs.styleGuide,
    ],
    files: [
      "{packages,scripts}/**/*.{jsx,js,mjs,cjs}",
      "*.{jsx,js,mjs.cjs}",
      ".github/actions/turborepo-remote-cache/action/*.{js,mjs,ts}",
      ".changeset/*.cjs",
    ],
  },

  // strict performance config, enforces strict type exports
  {
    extends: [
      ...quiEslintTs.configs.recommended,
      quiEslintTs.configs.performance,
      quiEslintTs.configs.strictExports,
    ],
    files: ["packages/**/*.ts"],
    languageOptions,
  },

  {
    extends: [quiEslintMdx.configs.recommended],
    files: ["{packages,scripts}/**/*.{md,mdx}", "*.md"],
  },
)
