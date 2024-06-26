[@project-chip/matter-node-ble.js](../README.md) / [Exports](../modules.md) / [\<internal\>](../modules/internal_.md) / EventServer

# Class: EventServer\<T, S\>

[\<internal\>](../modules/internal_.md).EventServer

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `S` | extends [`Storage`](../interfaces/internal_.Storage.md) |

## Table of contents

### Constructors

- [constructor](internal_.EventServer.md#constructor)

### Properties

- [#private](internal_.EventServer.md##private)
- [clusterId](internal_.EventServer.md#clusterid)
- [endpoint](internal_.EventServer.md#endpoint)
- [eventHandler](internal_.EventServer.md#eventhandler)
- [eventList](internal_.EventServer.md#eventlist)
- [id](internal_.EventServer.md#id)
- [listeners](internal_.EventServer.md#listeners)
- [name](internal_.EventServer.md#name)
- [priority](internal_.EventServer.md#priority)
- [schema](internal_.EventServer.md#schema)

### Accessors

- [readAcl](internal_.EventServer.md#readacl)

### Methods

- [addListener](internal_.EventServer.md#addlistener)
- [assignToEndpoint](internal_.EventServer.md#assigntoendpoint)
- [bindToEventHandler](internal_.EventServer.md#bindtoeventhandler)
- [get](internal_.EventServer.md#get)
- [removeListener](internal_.EventServer.md#removelistener)
- [triggerEvent](internal_.EventServer.md#triggerevent)

## Constructors

### constructor

• **new EventServer**\<`T`, `S`\>(`id`, `clusterId`, `name`, `schema`, `priority`, `readAcl`): [`EventServer`](internal_.EventServer.md)\<`T`, `S`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `S` | extends [`Storage`](../interfaces/internal_.Storage.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | [`EventId`](../modules/internal_.md#eventid) |
| `clusterId` | [`ClusterId`](../modules/internal_.md#clusterid) |
| `name` | `string` |
| `schema` | [`TlvSchema`](internal_.TlvSchema.md)\<`T`\> |
| `priority` | [`EventPriority`](../enums/internal_.EventPriority.md) |
| `readAcl` | `undefined` \| [`AccessLevel`](../enums/internal_.AccessLevel.md) |

#### Returns

[`EventServer`](internal_.EventServer.md)\<`T`, `S`\>

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:28

## Properties

### #private

• `Private` **#private**: `any`

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:18

___

### clusterId

• `Readonly` **clusterId**: [`ClusterId`](../modules/internal_.md#clusterid)

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:20

___

### endpoint

• `Protected` `Optional` **endpoint**: [`Endpoint`](internal_.Endpoint.md)

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:26

___

### eventHandler

• `Protected` `Optional` **eventHandler**: [`EventHandler`](internal_.EventHandler.md)\<`any`\>

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:27

___

### eventList

• `Private` **eventList**: `any`

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:24

___

### id

• `Readonly` **id**: [`EventId`](../modules/internal_.md#eventid)

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:19

___

### listeners

• `Private` `Readonly` **listeners**: `any`

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:25

___

### name

• `Readonly` **name**: `string`

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:21

___

### priority

• `Readonly` **priority**: [`EventPriority`](../enums/internal_.EventPriority.md)

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:23

___

### schema

• `Readonly` **schema**: [`TlvSchema`](internal_.TlvSchema.md)\<`T`\>

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:22

## Accessors

### readAcl

• `get` **readAcl**(): [`AccessLevel`](../enums/internal_.AccessLevel.md)

#### Returns

[`AccessLevel`](../enums/internal_.AccessLevel.md)

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:29

## Methods

### addListener

▸ **addListener**(`listener`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`event`: [`EventStorageData`](../interfaces/internal_.EventStorageData.md)\<`T`\>) => `void` |

#### Returns

`void`

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:33

___

### assignToEndpoint

▸ **assignToEndpoint**(`endpoint`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `endpoint` | [`Endpoint`](internal_.Endpoint.md) |

#### Returns

`void`

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:30

___

### bindToEventHandler

▸ **bindToEventHandler**(`eventHandler`): [`StorageOperationResult`](../modules/internal_.md#storageoperationresult)\<`S`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventHandler` | [`EventHandler`](internal_.EventHandler.md)\<`S`\> |

#### Returns

[`StorageOperationResult`](../modules/internal_.md#storageoperationresult)\<`S`\>

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:31

___

### get

▸ **get**(`session`, `isFabricFiltered`, `_message?`, `filters?`): [`EventStorageData`](../interfaces/internal_.EventStorageData.md)\<`any`\>[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `session` | [`Session`](internal_.Session.md)\<[`MatterDevice`](internal_.MatterDevice.md)\> |
| `isFabricFiltered` | `boolean` |
| `_message?` | [`Message`](../interfaces/internal_.Message.md) |
| `filters?` | [`TypeFromFields`](../modules/internal_.md#typefromfields)\<\{ `eventMin`: [`FieldType`](../interfaces/internal_.FieldType.md)\<`number` \| `bigint`\> ; `nodeId`: [`OptionalFieldType`](../interfaces/internal_.OptionalFieldType.md)\<[`NodeId`](../modules/internal_.md#nodeid)\>  }\>[] |

#### Returns

[`EventStorageData`](../interfaces/internal_.EventStorageData.md)\<`any`\>[]

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:35

___

### removeListener

▸ **removeListener**(`listener`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`event`: [`EventStorageData`](../interfaces/internal_.EventStorageData.md)\<`T`\>) => `void` |

#### Returns

`void`

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:34

___

### triggerEvent

▸ **triggerEvent**(`data`): [`StorageOperationResult`](../modules/internal_.md#storageoperationresult)\<`S`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `T` |

#### Returns

[`StorageOperationResult`](../modules/internal_.md#storageoperationresult)\<`S`\>

#### Defined in

matter.js/dist/esm/cluster/server/EventServer.d.ts:32
