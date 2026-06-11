// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

export {
  collectLibraryEntries,
  libraryEntriesPlugin,
  type CustomLibraryEntriesOptions,
  type DiscoveredLibraryEntriesOptions,
  type LibraryEntriesOptions,
  type LibraryEntriesPluginOptions,
  useClientPlugin,
} from "./plugins/index.js"
export {
  collectFolders,
  dependenciesToExternal,
  getArg,
  hasArg,
  packagesToExternal,
} from "./utils.js"
