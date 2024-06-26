[@project-chip/matter.js](../README.md) / [Modules](../modules.md) / [cluster/export](../modules/cluster_export.md) / [LevelControl](../modules/cluster_export.LevelControl.md) / MoveToLevelRequest

# Interface: MoveToLevelRequest

[cluster/export](../modules/cluster_export.md).[LevelControl](../modules/cluster_export.LevelControl.md).MoveToLevelRequest

Input to the LevelControl moveToLevel command

**`See`**

MatterSpecification.v11.Cluster § 1.6.6.1

## Hierarchy

- [`TypeFromSchema`](../modules/tlv_export.md#typefromschema)\<typeof [`TlvMoveToLevelRequest`](../modules/cluster_export.LevelControl.md#tlvmovetolevelrequest)\>

  ↳ **`MoveToLevelRequest`**

## Table of contents

### Properties

- [level](cluster_export.LevelControl.MoveToLevelRequest.md#level)
- [optionsMask](cluster_export.LevelControl.MoveToLevelRequest.md#optionsmask)
- [optionsOverride](cluster_export.LevelControl.MoveToLevelRequest.md#optionsoverride)
- [transitionTime](cluster_export.LevelControl.MoveToLevelRequest.md#transitiontime)

## Properties

### level

• **level**: `number`

#### Inherited from

TypeFromSchema.level

#### Defined in

[packages/matter.js/src/cluster/definitions/LevelControlCluster.ts:55](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/cluster/definitions/LevelControlCluster.ts#L55)

___

### optionsMask

• **optionsMask**: [`TypeFromPartialBitSchema`](../modules/schema_export.md#typefrompartialbitschema)\<\{ `coupleColorTempToLevel`: [`BitFlag`](../modules/schema_export.md#bitflag) ; `executeIfOff`: [`BitFlag`](../modules/schema_export.md#bitflag)  }\>

#### Inherited from

TypeFromSchema.optionsMask

#### Defined in

[packages/matter.js/src/cluster/definitions/LevelControlCluster.ts:57](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/cluster/definitions/LevelControlCluster.ts#L57)

___

### optionsOverride

• **optionsOverride**: [`TypeFromPartialBitSchema`](../modules/schema_export.md#typefrompartialbitschema)\<\{ `coupleColorTempToLevel`: [`BitFlag`](../modules/schema_export.md#bitflag) ; `executeIfOff`: [`BitFlag`](../modules/schema_export.md#bitflag)  }\>

#### Inherited from

TypeFromSchema.optionsOverride

#### Defined in

[packages/matter.js/src/cluster/definitions/LevelControlCluster.ts:58](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/cluster/definitions/LevelControlCluster.ts#L58)

___

### transitionTime

• **transitionTime**: ``null`` \| `number`

#### Inherited from

TypeFromSchema.transitionTime

#### Defined in

[packages/matter.js/src/cluster/definitions/LevelControlCluster.ts:56](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/cluster/definitions/LevelControlCluster.ts#L56)
