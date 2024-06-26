[@project-chip/matter.js](../README.md) / [Modules](../modules.md) / [protocol/interaction/export](../modules/protocol_interaction_export.md) / EventData

# Interface: EventData\<T\>

[protocol/interaction/export](../modules/protocol_interaction_export.md).EventData

Data of one Event

## Type parameters

| Name |
| :------ |
| `T` |

## Hierarchy

- **`EventData`**

  ↳ [`EventStorageData`](protocol_interaction_export.EventStorageData.md)

## Table of contents

### Properties

- [clusterId](protocol_interaction_export.EventData.md#clusterid)
- [data](protocol_interaction_export.EventData.md#data)
- [endpointId](protocol_interaction_export.EventData.md#endpointid)
- [epochTimestamp](protocol_interaction_export.EventData.md#epochtimestamp)
- [eventId](protocol_interaction_export.EventData.md#eventid)
- [priority](protocol_interaction_export.EventData.md#priority)

## Properties

### clusterId

• **clusterId**: [`ClusterId`](../modules/datatype_export.md#clusterid)

#### Defined in

[packages/matter.js/src/protocol/interaction/EventHandler.ts:31](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/protocol/interaction/EventHandler.ts#L31)

___

### data

• **data**: `T`

#### Defined in

[packages/matter.js/src/protocol/interaction/EventHandler.ts:35](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/protocol/interaction/EventHandler.ts#L35)

___

### endpointId

• **endpointId**: [`EndpointNumber`](../modules/datatype_export.md#endpointnumber)

#### Defined in

[packages/matter.js/src/protocol/interaction/EventHandler.ts:30](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/protocol/interaction/EventHandler.ts#L30)

___

### epochTimestamp

• **epochTimestamp**: `number`

#### Defined in

[packages/matter.js/src/protocol/interaction/EventHandler.ts:33](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/protocol/interaction/EventHandler.ts#L33)

___

### eventId

• **eventId**: [`EventId`](../modules/datatype_export.md#eventid)

#### Defined in

[packages/matter.js/src/protocol/interaction/EventHandler.ts:32](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/protocol/interaction/EventHandler.ts#L32)

___

### priority

• **priority**: [`EventPriority`](../enums/cluster_export.EventPriority.md)

#### Defined in

[packages/matter.js/src/protocol/interaction/EventHandler.ts:34](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/protocol/interaction/EventHandler.ts#L34)
