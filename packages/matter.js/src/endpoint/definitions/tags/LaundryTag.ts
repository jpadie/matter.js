/**
 * @license
 * Copyright 2022-2024 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/*** THIS FILE IS GENERATED, DO NOT EDIT ***/

import { SemanticNamespace } from "../../type/SemanticNamespace.js";

/**
 * The tags contained in this namespace are restricted for use in the laundry domain and shall NOT be used in any other
 * domain or context.
 *
 * @see {@link MatterSpecification.v13.Namespace} § 11
 */
export const LaundryTag = SemanticNamespace({
    id: 0xe,

    tags: {
        Normal: { id: 0x0, label: "Normal" },
        LightDry: { id: 0x1, label: "Light Dry" },
        ExtraDry: { id: 0x2, label: "Extra Dry" },
        NoDry: { id: 0x3, label: "No Dry" }
    }
});