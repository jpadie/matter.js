[@project-chip/matter.js](../README.md) / [Modules](../modules.md) / [behavior/definitions/software-diagnostics/export](../modules/behavior_definitions_software_diagnostics_export.md) / [SoftwareDiagnosticsBehavior](../modules/behavior_definitions_software_diagnostics_export.SoftwareDiagnosticsBehavior.md) / State

# Interface: State

[behavior/definitions/software-diagnostics/export](../modules/behavior_definitions_software_diagnostics_export.md).[SoftwareDiagnosticsBehavior](../modules/behavior_definitions_software_diagnostics_export.SoftwareDiagnosticsBehavior.md).State

## Hierarchy

- [`StateType`](../modules/behavior_definitions_software_diagnostics_export._internal_.md#statetype)

  ↳ **`State`**

## Table of contents

### Properties

- [currentHeapFree](behavior_definitions_software_diagnostics_export.SoftwareDiagnosticsBehavior.State.md#currentheapfree)
- [currentHeapUsed](behavior_definitions_software_diagnostics_export.SoftwareDiagnosticsBehavior.State.md#currentheapused)
- [threadMetrics](behavior_definitions_software_diagnostics_export.SoftwareDiagnosticsBehavior.State.md#threadmetrics)

## Properties

### currentHeapFree

• `Optional` **currentHeapFree**: `number` \| `bigint`

The CurrentHeapFree attribute shall indicate the current amount of heap memory, in bytes, that are free
for allocation. The effective amount may be smaller due to heap fragmentation or other reasons.

**`See`**

MatterSpecification.v11.Core § 11.12.6.2

#### Inherited from

StateType.currentHeapFree

#### Defined in

[packages/matter.js/src/cluster/definitions/SoftwareDiagnosticsCluster.ts:206](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/cluster/definitions/SoftwareDiagnosticsCluster.ts#L206)

___

### currentHeapUsed

• `Optional` **currentHeapUsed**: `number` \| `bigint`

The CurrentHeapUsed attribute shall indicate the current amount of heap memory, in bytes, that is being
used.

**`See`**

MatterSpecification.v11.Core § 11.12.6.3

#### Inherited from

StateType.currentHeapUsed

#### Defined in

[packages/matter.js/src/cluster/definitions/SoftwareDiagnosticsCluster.ts:214](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/cluster/definitions/SoftwareDiagnosticsCluster.ts#L214)

___

### threadMetrics

• `Optional` **threadMetrics**: [`TypeFromFields`](../modules/tlv_export.md#typefromfields)\<\{ `id`: [`FieldType`](tlv_export.FieldType.md)\<`number` \| `bigint`\> ; `name`: [`OptionalFieldType`](tlv_export.OptionalFieldType.md)\<`string`\> ; `stackFreeCurrent`: [`OptionalFieldType`](tlv_export.OptionalFieldType.md)\<`number`\> ; `stackFreeMinimum`: [`OptionalFieldType`](tlv_export.OptionalFieldType.md)\<`number`\> ; `stackSize`: [`OptionalFieldType`](tlv_export.OptionalFieldType.md)\<`number`\>  }\>[]

The ThreadMetrics attribute shall be a list of ThreadMetricsStruct structs. Each active thread on the
Node shall be represented by a single entry within the ThreadMetrics attribute.

**`See`**

MatterSpecification.v11.Core § 11.12.6.1

#### Inherited from

StateType.threadMetrics

#### Defined in

[packages/matter.js/src/cluster/definitions/SoftwareDiagnosticsCluster.ts:198](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/cluster/definitions/SoftwareDiagnosticsCluster.ts#L198)
