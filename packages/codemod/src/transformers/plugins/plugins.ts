// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import type {TransformPlugin} from "../types"

import {importsPlugin} from "./imports"
import {jsxWrappersPlugin} from "./jsx-wrappers"
import {variablesPlugin} from "./variables"

/**
 * Plugin execution order is determined by array position.
 * 1. imports - must run first to move/rename imports
 * 2. variables - renames identifiers after import changes
 * 3. jsx-wrappers - wraps elements after renames
 */
export const plugins: TransformPlugin[] = [
  importsPlugin,
  variablesPlugin,
  jsxWrappersPlugin,
]
