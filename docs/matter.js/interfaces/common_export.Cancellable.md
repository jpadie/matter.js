[@project-chip/matter.js](../README.md) / [Modules](../modules.md) / [common/export](../modules/common_export.md) / Cancellable

# Interface: Cancellable

[common/export](../modules/common_export.md).Cancellable

Standard interface for objects supporting a task that may be aborted or stopped prior to destruction.

## Table of contents

### Methods

- [cancel](common_export.Cancellable.md#cancel)

## Methods

### cancel

▸ **cancel**(): `void`

Stop the object's primary activity.  This should result in termination as quickly as possible.

Cancellation have no effect if the object is cancelled or otherwise in a state where cancellation is irrelevant.

#### Returns

`void`

#### Defined in

[packages/matter.js/src/common/Lifecycle.ts:95](https://github.com/project-chip/matter.js/blob/5f71eedebdb9fa54338bde320c311bb359b7455d/packages/matter.js/src/common/Lifecycle.ts#L95)
