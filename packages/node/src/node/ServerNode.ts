/**
 * @license
 * Copyright 2022-2024 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommissioningBehavior } from "#behavior/system/commissioning/CommissioningBehavior.js";
import { NetworkServer } from "#behavior/system/network/NetworkServer.js";
import { ServerNetworkRuntime } from "#behavior/system/network/ServerNetworkRuntime.js";
import { ProductDescriptionServer } from "#behavior/system/product-description/ProductDescriptionServer.js";
import { SessionsBehavior } from "#behavior/system/sessions/SessionsBehavior.js";
import { Endpoint } from "#endpoint/Endpoint.js";
import { EndpointServer } from "#endpoint/EndpointServer.js";
import { EndpointInitializer } from "#endpoint/properties/EndpointInitializer.js";
import type { Environment } from "#general";
import { Construction, DiagnosticSource, Identity, MatterError, asyncNew, errorOf } from "#general";
import { RootEndpoint as BaseRootEndpoint } from "../endpoints/root.js";
import { Node } from "./Node.js";
import { Nodes } from "./Nodes.js";
import { IdentityService } from "./server/IdentityService.js";
import { ServerEndpointInitializer } from "./server/ServerEndpointInitializer.js";
import { NodeStore } from "./storage/NodeStore.js";

/**
 * Thrown when there is an error during factory reset.
 */
class FactoryResetError extends MatterError {
    constructor(message: string, cause: any) {
        super(message);
        this.cause = errorOf(cause);
    }
}

/**
 * A server-side Matter {@link Node}.
 *
 * The Matter specification often refers to server-side nodes as "devices".
 */
export class ServerNode<T extends ServerNode.RootEndpoint = ServerNode.RootEndpoint> extends Node<T> {
    #nodes?: Nodes;

    /**
     * Construct a new ServerNode.
     *
     * You can use {@link create} to construct the node and wait for it to initialize fully.
     *
     * @param type the variation of {@link RootEndpoint} that defines the root endpoint's behavior
     * @param options root endpoint options and the node's environment
     */
    constructor(type?: T, options?: Node.Options<T>);

    /**
     * Construct a new ServerNode.
     *
     * You can use {@link create} to construct the node and wait for it to initialize fully.
     *
     * @param config a {@link Endpoint.Configuration} for the root endpoint
     */
    constructor(config: Partial<Node.Configuration<T>>);

    constructor(definition?: T | Node.Configuration<T>, options?: Node.Options<T>) {
        super(Node.nodeConfigFor(ServerNode.RootEndpoint as T, definition, options));

        DiagnosticSource.add(this);
    }

    /**
     * Create a new ServerNode.
     *
     * @param type the variation of {@link RootEndpoint} that defines the root endpoint's behavior
     * @param options root endpoint configuration and, optionally, the node's environment
     */
    static async create<
        This extends typeof ServerNode<any>,
        T extends ServerNode.RootEndpoint = ServerNode.RootEndpoint,
    >(this: This, type?: T, options?: Node.Options<T>): Promise<ServerNode<T>>;

    /**
     * Create a new ServerNode.
     *
     * @param config root endpoint configuration and, optionally, the node's {@link Environment}
     */
    static async create<
        This extends typeof ServerNode<any>,
        T extends ServerNode.RootEndpoint = ServerNode.RootEndpoint,
    >(this: This, config: Partial<Node.Configuration<T>>): Promise<ServerNode<T>>;

    static async create<
        This extends typeof ServerNode<any>,
        T extends ServerNode.RootEndpoint = ServerNode.RootEndpoint,
    >(this: This, definition?: T | Node.Configuration<T>, options?: Node.Options<T>) {
        return await asyncNew(this, definition, options);
    }

    protected createRuntime(): ServerNetworkRuntime {
        return new ServerNetworkRuntime(this);
    }

    override async [Construction.destruct]() {
        await super[Construction.destruct]();

        if (this.env.has(NodeStore)) {
            const store = this.env.get(NodeStore);
            await store.close();
            this.env.delete(NodeStore, store);
        }
    }

    override async reset() {
        await super.reset();

        // Destroy the EndpointServer hierarchy
        await EndpointServer.forEndpoint(this)[Symbol.asyncDispose]();
    }

    /**
     * Perform a factory reset of the node.
     */
    async factoryReset() {
        try {
            await this.construction;

            // Go offline before performing reset
            const isOnline = this.lifecycle.isOnline;
            if (isOnline) {
                await this.cancel();
            }

            // Inform user
            this.statusUpdate("resetting to factory defaults");

            // Reset in-memory state
            await this.reset();

            // Reset persistent state
            await this.resetStorage();

            // Reset reverts node to inactive state; now reinitialize
            this.construction.start();

            // Go back online if we were online at time of reset, otherwise just await reinitialization
            if (isOnline) {
                await this.start();
            } else {
                await this.construction.ready;
            }
        } catch (e) {
            this.construction.crash();
            throw new FactoryResetError(`Error during factory reset of ${this}`, e);
        }
    }

    /**
     * Access other nodes on the fabric.
     */
    get nodes() {
        if (!this.#nodes) {
            this.#nodes = new Nodes(this);
        }
        return this.#nodes;
    }

    async advertiseNow() {
        await this.act(`advertiseNow<${this}>`, agent => agent.get(NetworkServer).advertiseNow());
    }

    protected override async initialize() {
        const nodeStore = await NodeStore.create(this.env, this.id);

        this.env.set(NodeStore, nodeStore);
        this.env.set(EndpointInitializer, new ServerEndpointInitializer(this.env));
        this.env.set(IdentityService, new IdentityService(this));

        return super.initialize();
    }

    /**
     * By default on factory reset we erase all stored data.
     *
     * If this is inappropriate for your application you may override to alter the behavior.   Matter requires that all
     * "security- and privacy-related data and key material" is removed on factory reset.
     *
     * @see {@link MatterSpecification.v12.Core} § 13.4
     */
    protected async resetStorage() {
        await this.env.get(NodeStore).erase();
    }

    /**
     * Normal endpoints must have an owner to complete construction but server nodes have no such precondition for
     * construction.
     */
    protected override assertConstructable() {}
}

export namespace ServerNode {
    export const RootEndpoint = BaseRootEndpoint.with(
        CommissioningBehavior,
        NetworkServer,
        ProductDescriptionServer,
        SessionsBehavior,
    );

    export interface RootEndpoint extends Identity<typeof RootEndpoint> {}
}