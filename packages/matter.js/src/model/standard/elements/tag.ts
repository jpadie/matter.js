/**
 * @license
 * Copyright 2022-2024 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/*** THIS FILE IS GENERATED, DO NOT EDIT ***/

import { Matter } from "../Matter.js";
import { DatatypeElement as Datatype } from "../../elements/index.js";

export const tag = Datatype({
    name: "tag", type: "enum8", description: "Tag", isSeed: true,
    details: "The Tag type shall identify a semantic tag located within a namespace.",
    xref: { document: "core", section: "7.18.2.44" }
});
Matter.children.push(tag);
