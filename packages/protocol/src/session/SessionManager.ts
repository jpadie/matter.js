/**
 * @license
 * Copyright 2022-2024 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    AsyncObservable,
    BasicSet,
    Bytes,
    Crypto,
    Logger,
    MatterFlowError,
    Observable,
    StorageContext,
} from "#general";
import { CaseAuthenticatedTag, FabricId, FabricIndex, NodeId } from "#types";
import { Fabric } from "../fabric/Fabric.js";
import { MessageCounter } from "../protocol/MessageCounter.js";
import { InsecureSession } from "./InsecureSession.js";
import { SecureSession } from "./SecureSession.js";
import {
    FALLBACK_DATAMODEL_REVISION,
    FALLBACK_INTERACTIONMODEL_REVISION,
    FALLBACK_MAX_PATHS_PER_INVOKE,
    FALLBACK_SPECIFICATION_VERSION,
    SESSION_ACTIVE_INTERVAL_MS,
    SESSION_ACTIVE_THRESHOLD_MS,
    SESSION_IDLE_INTERVAL_MS,
    SessionContext,
    SessionParameterOptions,
    SessionParameters,
} from "./Session.js";

const logger = Logger.get("SessionManager");

export const UNICAST_UNSECURE_SESSION_ID = 0x0000;

export interface ResumptionRecord {
    sharedSecret: Uint8Array;
    resumptionId: Uint8Array;
    fabric: Fabric;
    peerNodeId: NodeId;
    sessionParameters: SessionParameters;
    caseAuthenticatedTags?: CaseAuthenticatedTag[];
}

type ResumptionStorageRecord = {
    nodeId: NodeId;
    sharedSecret: Uint8Array;
    resumptionId: Uint8Array;
    fabricId: FabricId;
    peerNodeId: NodeId;
    sessionParameters: {
        idleIntervalMs: number;
        activeIntervalMs: number;
        activeThresholdMs: number;
        dataModelRevision: number;
        interactionModelRevision: number;
        specificationVersion: number;
        maxPathsPerInvoke: number;
    };
    caseAuthenticatedTags?: CaseAuthenticatedTag[];
};

export class SessionManager {
    readonly #insecureSessions = new Map<NodeId, InsecureSession>();
    readonly #sessions = new BasicSet<SecureSession>();
    #nextSessionId = Crypto.getRandomUInt16();
    #resumptionRecords = new Map<NodeId, ResumptionRecord>();
    readonly #sessionStorage: StorageContext;
    readonly #globalUnencryptedMessageCounter = new MessageCounter();
    readonly #subscriptionsChanged = Observable<[session: SecureSession]>();
    readonly #sessionOpened = Observable<[session: SecureSession]>();
    readonly #sessionClosed = AsyncObservable<[session: SecureSession], void>();

    constructor(
        private readonly context: SessionContext,
        sessionStorage: StorageContext,
    ) {
        this.#sessionStorage = sessionStorage;
    }

    get subscriptionsChanged() {
        return this.#subscriptionsChanged;
    }

    get sessionOpened() {
        return this.#sessionOpened;
    }

    get sessionClosed() {
        return this.#sessionClosed;
    }

    createUnsecureSession(options: {
        initiatorNodeId?: NodeId;
        sessionParameters?: SessionParameterOptions;
        isInitiator?: boolean;
    }) {
        const { initiatorNodeId, sessionParameters, isInitiator } = options;
        if (initiatorNodeId !== undefined) {
            if (this.#insecureSessions.has(initiatorNodeId)) {
                throw new MatterFlowError(`UnsecureSession with NodeId ${initiatorNodeId} already exists.`);
            }
        }
        while (true) {
            const session = new InsecureSession({
                context: this.context,
                messageCounter: this.#globalUnencryptedMessageCounter,
                closeCallback: async () => {
                    logger.info(`End insecure session ${session.name}`);
                    this.#insecureSessions.delete(session.nodeId);
                },
                initiatorNodeId,
                sessionParameters,
                isInitiator: isInitiator ?? false,
            });

            const ephermalNodeId = session.nodeId;
            if (this.#insecureSessions.has(ephermalNodeId)) continue;

            this.#insecureSessions.set(ephermalNodeId, session);
            return session;
        }
    }

    async createSecureSession(args: {
        sessionId: number;
        fabric: Fabric | undefined;
        peerNodeId: NodeId;
        peerSessionId: number;
        sharedSecret: Uint8Array;
        salt: Uint8Array;
        isInitiator: boolean;
        isResumption: boolean;
        peerSessionParameters?: SessionParameterOptions;
        caseAuthenticatedTags?: CaseAuthenticatedTag[];
    }) {
        const {
            sessionId,
            fabric,
            peerNodeId,
            peerSessionId,
            sharedSecret,
            salt,
            isInitiator,
            isResumption,
            peerSessionParameters,
            caseAuthenticatedTags,
        } = args;
        const session = await SecureSession.create({
            context: this.context,
            id: sessionId,
            fabric,
            peerNodeId,
            peerSessionId,
            sharedSecret,
            salt,
            isInitiator,
            isResumption,
            closeCallback: async () => {
                logger.info(`End ${session.isPase ? "PASE" : "CASE"} session ${session.name}`);
                this.#sessions.delete(session);
                await this.#sessionClosed.emit(session);
            },
            peerSessionParameters: peerSessionParameters,
            caseAuthenticatedTags,
            subscriptionChangedCallback: () => {
                this.#subscriptionsChanged.emit(session);
            },
        });

        this.#sessions.add(session);
        this.#sessionOpened.emit(session);

        return session;
    }

    removeSession(sessionId: number) {
        const session = this.getSession(sessionId);
        if (session !== undefined) {
            this.#sessions.delete(session);
        }
    }

    async removeResumptionRecord(peerNodeId: NodeId) {
        this.#resumptionRecords.delete(peerNodeId);
        await this.storeResumptionRecords();
    }

    findOldestInactiveSession() {
        let oldestSession: SecureSession | undefined = undefined;
        for (const session of this.#sessions) {
            if (!oldestSession || session.activeTimestamp < oldestSession.activeTimestamp) {
                oldestSession = session;
            }
        }
        if (oldestSession === undefined) {
            throw new MatterFlowError("No session found to close and all session ids are taken.");
        }
        return oldestSession;
    }

    async getNextAvailableSessionId() {
        for (let i = 0; i < 0xffff; i++) {
            const id = this.#nextSessionId;
            this.#nextSessionId = (this.#nextSessionId + 1) & 0xffff;
            if (this.#nextSessionId === 0) this.#nextSessionId++;

            if (this.getSession(id) === undefined) {
                return id;
            }
        }

        // All session ids are taken, search for the oldest unused session, and close it and re-use its ID
        const oldestSession = this.findOldestInactiveSession();
        await oldestSession.end(true, false);
        this.#nextSessionId = oldestSession.id;
        return this.#nextSessionId++;
    }

    getSession(sessionId: number) {
        return this.#sessions.get("id", sessionId);
    }

    getPaseSession() {
        return [...this.#sessions].find(
            session => session.isSecure && session.isPase && !session.closingAfterExchangeFinished,
        ) as SecureSession;
    }

    getSessionForNode(fabric: Fabric, nodeId: NodeId) {
        //TODO: It can have multiple sessions for one node ...
        return [...this.#sessions].find(session => {
            if (!session.isSecure) return false;
            const secureSession = session;
            return secureSession.fabric?.fabricId === fabric.fabricId && secureSession.peerNodeId === nodeId;
        });
    }

    async removeAllSessionsForNode(nodeId: NodeId, sendClose = false) {
        for (const session of this.#sessions) {
            if (!session.isSecure) continue;
            const secureSession = session;
            if (secureSession.peerNodeId === nodeId) {
                await secureSession.destroy(sendClose, false);
            }
        }
    }

    getUnsecureSession(sourceNodeId?: NodeId) {
        if (sourceNodeId === undefined) {
            return this.#insecureSessions.get(NodeId.UNSPECIFIED_NODE_ID);
        }
        return this.#insecureSessions.get(sourceNodeId);
    }

    findGroupSession(groupId: number, groupSessionId: number) {
        // Use groupsession id to find the key ??!!
        // The Group Session ID MAY help receiving nodes efficiently locate the Operational Group Key used to encrypt an incoming groupcast message. It SHALL NOT be used as the sole means to locate the asso­ ciated Operational Group Key, since it MAY collide within the fabric. Instead, the Group Session ID provides receiving nodes a means to identify Operational Group Key candidates without the need to first attempt to decrypt groupcast messages using all available keys.
        // On receipt of a message of Group Session Type, all valid, installed, operational group key candidates referenced by the given Group Session ID SHALL be attempted until authentication is passed or there are no more operational group keys to try. This is done because the same Group Session ID might arise from different keys. The chance of a Group Session ID collision is 2-16 but the chance of both a Group Session ID collision and the message MIC matching two different operational group keys is 2-80.

        // TODO
        throw new Error(`Not implemented ${groupId} ${groupSessionId}`);
    }

    findResumptionRecordById(resumptionId: Uint8Array) {
        return [...this.#resumptionRecords.values()].find(record => Bytes.areEqual(record.resumptionId, resumptionId));
    }

    findResumptionRecordByNodeId(nodeId: NodeId) {
        return this.#resumptionRecords.get(nodeId);
    }

    async saveResumptionRecord(resumptionRecord: ResumptionRecord) {
        this.#resumptionRecords.set(resumptionRecord.peerNodeId, resumptionRecord);
        await this.storeResumptionRecords();
    }

    async updateFabricForResumptionRecords(fabric: Fabric) {
        const record = this.#resumptionRecords.get(fabric.rootNodeId);
        if (record === undefined) {
            throw new MatterFlowError("Resumption record not found. Should never happen.");
        }
        this.#resumptionRecords.set(fabric.rootNodeId, { ...record, fabric });
        await this.storeResumptionRecords();
    }

    async storeResumptionRecords() {
        await this.#sessionStorage.set(
            "resumptionRecords",
            [...this.#resumptionRecords].map(
                ([
                    nodeId,
                    { sharedSecret, resumptionId, peerNodeId, fabric, sessionParameters, caseAuthenticatedTags },
                ]) =>
                    ({
                        nodeId,
                        sharedSecret,
                        resumptionId,
                        fabricId: fabric.fabricId,
                        peerNodeId: peerNodeId,
                        sessionParameters,
                        caseAuthenticatedTags,
                    }) as ResumptionStorageRecord,
            ),
        );
    }

    async initFromStorage(fabrics: Fabric[]) {
        const storedResumptionRecords = await this.#sessionStorage.get<ResumptionStorageRecord[]>(
            "resumptionRecords",
            [],
        );

        storedResumptionRecords.forEach(
            ({
                nodeId,
                sharedSecret,
                resumptionId,
                fabricId,
                peerNodeId,
                sessionParameters: {
                    idleIntervalMs,
                    activeIntervalMs,
                    activeThresholdMs,
                    dataModelRevision,
                    interactionModelRevision,
                    specificationVersion,
                    maxPathsPerInvoke,
                } = {},
                caseAuthenticatedTags,
            }) => {
                const fabric = fabrics.find(fabric => fabric.fabricId === fabricId);
                logger.info(
                    "restoring resumption record for node",
                    nodeId,
                    "and peer node",
                    peerNodeId,
                    "for fabric index",
                    fabric?.fabricIndex,
                );
                if (!fabric) {
                    logger.error("fabric not found for resumption record", fabricId);
                    return;
                }
                this.#resumptionRecords.set(nodeId, {
                    sharedSecret,
                    resumptionId,
                    fabric,
                    peerNodeId,
                    sessionParameters: {
                        // Make sure to initialize default values when restoring an older resumption record
                        idleIntervalMs: idleIntervalMs ?? SESSION_IDLE_INTERVAL_MS,
                        activeIntervalMs: activeIntervalMs ?? SESSION_ACTIVE_INTERVAL_MS,
                        activeThresholdMs: activeThresholdMs ?? SESSION_ACTIVE_THRESHOLD_MS,
                        dataModelRevision: dataModelRevision ?? FALLBACK_DATAMODEL_REVISION,
                        interactionModelRevision: interactionModelRevision ?? FALLBACK_INTERACTIONMODEL_REVISION,
                        specificationVersion: specificationVersion ?? FALLBACK_SPECIFICATION_VERSION,
                        maxPathsPerInvoke: maxPathsPerInvoke ?? FALLBACK_MAX_PATHS_PER_INVOKE,
                    },
                    caseAuthenticatedTags,
                });
            },
        );
    }

    getActiveSessionInformation() {
        return [...this.#sessions]
            .filter(session => session.isSecure && !session.isPase)
            .map(session => ({
                name: session.name,
                nodeId: session.nodeId,
                peerNodeId: session.peerNodeId,
                fabric: session instanceof SecureSession ? session.fabric?.externalInformation : undefined,
                isPeerActive: session.isPeerActive(),
                secure: session.isSecure,
                lastInteractionTimestamp: session instanceof SecureSession ? session.timestamp : undefined,
                lastActiveTimestamp: session instanceof SecureSession ? session.activeTimestamp : undefined,
                numberOfActiveSubscriptions: session instanceof SecureSession ? session.numberOfActiveSubscriptions : 0,
            }));
    }

    async clearSubscriptionsForNode(fabricIndex: FabricIndex, nodeId: NodeId, flushSubscriptions?: boolean) {
        for (const session of this.#sessions) {
            if (session.fabric?.fabricIndex === fabricIndex && session.peerNodeId === nodeId) {
                await session.clearSubscriptions(flushSubscriptions);
            }
        }
    }

    async close() {
        await this.storeResumptionRecords();
        for (const session of this.#sessions) {
            await session?.end(false);
            this.#sessions.delete(session);
        }
        for (const session of this.#insecureSessions.values()) {
            await session?.end();
            this.#insecureSessions.delete(session.nodeId);
        }
    }
}

namespace SessionManager {
    export interface Options {
        maxPathsPerInvoke?: number;
    }
}
