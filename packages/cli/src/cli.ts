// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {program} from "@commander-js/extra-typings"

import {addLintChangedCommand} from "./modules/lint-changed.js"
import {addPublishAngularCommands} from "./modules/publish-angular.js"
import {addPublishCommands} from "./modules/publish.js"

program.allowUnknownOption(false)

addPublishCommands()
addPublishAngularCommands()
addLintChangedCommand()

program.parse(process.argv)
