/**
 * @license
 * Copyright 2022-2024 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger, MatterFlowError, NoResponseTimeoutError, UnexpectedDataError } from "#general";
import { Specification } from "#model";
import {
    Status,
    StatusCode,
    StatusResponseError,
    TlvAny,
    TlvAttributeReport,
    TlvDataReport,
    TlvDataReportForSend,
    TlvEventReport,
    TlvInvokeRequest,
    TlvInvokeResponse,
    TlvReadRequest,
    TlvSchema,
    TlvStatusResponse,
    TlvSubscribeRequest,
    TlvSubscribeResponse,
    TlvTimedRequest,
    TlvWriteRequest,
    TlvWriteResponse,
    TypeFromSchema,
} from "#types";
import { Message, SessionType } from "../codec/MessageCodec.js";
import { ChannelNotConnectedError, ExchangeProvider } from "../protocol/ExchangeManager.js";
import {
    ExchangeSendOptions,
    MessageExchange,
    RetransmissionLimitReachedError,
    UnexpectedMessageError,
} from "../protocol/MessageExchange.js";
import {
    DataReportPayload,
    canAttributePayloadBeChunked,
    chunkAttributePayload,
    encodeAttributePayload,
    encodeEventPayload,
} from "./AttributeDataEncoder.js";

export enum MessageType {
    StatusResponse = 0x01,
    ReadRequest = 0x02,
    SubscribeRequest = 0x03,
    SubscribeResponse = 0x04,
    ReportData = 0x05,
    WriteRequest = 0x06,
    WriteResponse = 0x07,
    InvokeRequest = 0x08,
    InvokeResponse = 0x09,
    TimedRequest = 0x0a,
}

export type ReadRequest = TypeFromSchema<typeof TlvReadRequest>;
export type DataReport = TypeFromSchema<typeof TlvDataReport>;
export type SubscribeRequest = TypeFromSchema<typeof TlvSubscribeRequest>;
export type SubscribeResponse = TypeFromSchema<typeof TlvSubscribeResponse>;
export type InvokeRequest = TypeFromSchema<typeof TlvInvokeRequest>;
export type InvokeResponse = TypeFromSchema<typeof TlvInvokeResponse>;
export type TimedRequest = TypeFromSchema<typeof TlvTimedRequest>;
export type WriteRequest = TypeFromSchema<typeof TlvWriteRequest>;
export type WriteResponse = TypeFromSchema<typeof TlvWriteResponse>;

const logger = Logger.get("InteractionMessenger");

class InteractionMessenger {
    constructor(protected exchange: MessageExchange) {}

    calculateMaximumPeerResponseTime(expectedProcessingTimeMs?: number) {
        return this.exchange.calculateMaximumPeerResponseTime(expectedProcessingTimeMs);
    }

    send(messageType: number, payload: Uint8Array, options?: ExchangeSendOptions) {
        return this.exchange.send(messageType, payload, options);
    }

    sendStatus(status: StatusCode) {
        return this.send(
            MessageType.StatusResponse,
            TlvStatusResponse.encode({ status, interactionModelRevision: Specification.INTERACTION_MODEL_REVISION }),
        );
    }

    async waitForSuccess(expectedProcessingTimeMs?: number) {
        // If the status is not Success, this would throw an Error.
        await this.nextMessage(MessageType.StatusResponse, expectedProcessingTimeMs);
    }

    async nextMessage(expectedMessageType?: number, expectedProcessingTimeMs?: number) {
        const message = await this.exchange.nextMessage(expectedProcessingTimeMs);
        const messageType = message.payloadHeader.messageType;
        this.throwIfErrorStatusMessage(message);
        if (expectedMessageType !== undefined && messageType !== expectedMessageType) {
            throw new UnexpectedDataError(
                `Received unexpected message type: ${messageType}, expected: ${expectedMessageType}`,
            );
        }
        return message;
    }

    async close() {
        await this.exchange.close();
    }

    protected throwIfErrorStatusMessage(message: Message) {
        const {
            payloadHeader: { messageType },
            payload,
        } = message;

        if (messageType !== MessageType.StatusResponse) return;
        const { status } = TlvStatusResponse.decode(payload);
        if (status !== StatusCode.Success) throw new StatusResponseError(`Received error status: ${status}`, status);
    }

    getExchangeChannelName() {
        return this.exchange.channel.name;
    }
}

export interface InteractionRecipient {
    handleReadRequest(exchange: MessageExchange, request: ReadRequest, message: Message): Promise<DataReport>;
    handleWriteRequest(exchange: MessageExchange, request: WriteRequest, message: Message): Promise<WriteResponse>;
    handleSubscribeRequest(
        exchange: MessageExchange,
        request: SubscribeRequest,
        messenger: InteractionServerMessenger,
        message: Message,
    ): Promise<void>;
    handleInvokeRequest(
        exchange: MessageExchange,
        request: InvokeRequest,
        messenger: InteractionServerMessenger,
        message: Message,
    ): Promise<void>;
    handleTimedRequest(exchange: MessageExchange, request: TimedRequest, message: Message): void;
}

export class InteractionServerMessenger extends InteractionMessenger {
    async handleRequest(recipient: InteractionRecipient) {
        let continueExchange = true; // are more messages expected in this "transaction"?
        let isGroupSession = false;
        try {
            while (continueExchange) {
                const message = await this.exchange.nextMessage();
                isGroupSession = message.packetHeader.sessionType === SessionType.Group;
                continueExchange = false;
                switch (message.payloadHeader.messageType) {
                    case MessageType.ReadRequest: {
                        if (isGroupSession) {
                            throw new StatusResponseError(
                                `ReadRequest is not supported in group sessions`,
                                Status.InvalidAction,
                            );
                        }
                        const readRequest = TlvReadRequest.decode(message.payload);
                        // This potentially sends multiple DataReport Messages
                        await this.sendDataReport(
                            await recipient.handleReadRequest(this.exchange, readRequest, message),
                            readRequest.isFabricFiltered,
                        );
                        break;
                    }
                    case MessageType.WriteRequest: {
                        const writeRequest = TlvWriteRequest.decode(message.payload);
                        const { suppressResponse } = writeRequest;
                        const writeResponse = await recipient.handleWriteRequest(this.exchange, writeRequest, message);
                        if (!suppressResponse && !isGroupSession) {
                            await this.send(MessageType.WriteResponse, TlvWriteResponse.encode(writeResponse));
                        }
                        break;
                    }
                    case MessageType.SubscribeRequest: {
                        const subscribeRequest = TlvSubscribeRequest.decode(message.payload);
                        await recipient.handleSubscribeRequest(this.exchange, subscribeRequest, this, message);
                        // response is sent by handler
                        break;
                    }
                    case MessageType.InvokeRequest: {
                        const invokeRequest = TlvInvokeRequest.decode(message.payload);
                        await recipient.handleInvokeRequest(this.exchange, invokeRequest, this, message);
                        // response is sent by the handler
                        break;
                    }
                    case MessageType.TimedRequest: {
                        const timedRequest = TlvTimedRequest.decode(message.payload);
                        recipient.handleTimedRequest(this.exchange, timedRequest, message);
                        await this.sendStatus(StatusCode.Success);
                        continueExchange = true;
                        break;
                    }
                    default:
                        throw new StatusResponseError(
                            `Unsupported message type ${message.payloadHeader.messageType}`,
                            Status.InvalidAction,
                        );
                }
            }
        } catch (error: any) {
            let errorStatusCode = StatusCode.Failure;
            if (error instanceof StatusResponseError) {
                logger.info(`Sending status response ${error.code} for interaction error: ${error.message}`);
                errorStatusCode = error.code;
            } else if (error instanceof NoResponseTimeoutError) {
                logger.info(error);
            } else {
                logger.warn(error);
            }
            if (!isGroupSession && !(error instanceof NoResponseTimeoutError)) {
                await this.sendStatus(errorStatusCode);
            }
        } finally {
            await this.exchange.close();
        }
    }

    /**
     * Handle DataReportPayload with the content of a DataReport to send, split them into multiple DataReport
     * messages and send them out based on the size.
     */
    async sendDataReport(dataReportPayload: DataReportPayload, forFabricFilteredRead: boolean) {
        const {
            subscriptionId,
            attributeReportsPayload,
            eventReportsPayload,
            suppressResponse,
            interactionModelRevision,
        } = dataReportPayload;

        const dataReport: TypeFromSchema<typeof TlvDataReportForSend> = {
            subscriptionId,
            suppressResponse,
            interactionModelRevision,
            attributeReports: undefined,
            eventReports: undefined,
        };

        if (attributeReportsPayload !== undefined || eventReportsPayload !== undefined) {
            // TODO Add tag compressing once https://github.com/project-chip/connectedhomeip/issues/29359 is solved

            const attributeReportsToSend = [...(attributeReportsPayload ?? [])];
            const eventReportsToSend = [...(eventReportsPayload ?? [])];

            dataReport.moreChunkedMessages = true; // Assume we have multiple chunks, also for size calculation
            const emptyDataReportBytes = TlvDataReportForSend.encode(dataReport);

            let firstAttributeAddedToReportMessage = false;
            let firstEventAddedToReportMessage = false;
            const sendAndResetReport = async () => {
                await this.sendDataReportMessage(dataReport);
                dataReport.attributeReports = undefined;
                dataReport.eventReports = undefined;
                messageSize = emptyDataReportBytes.length;
                firstAttributeAddedToReportMessage = false;
                firstEventAddedToReportMessage = false;
            };

            let messageSize = emptyDataReportBytes.length;
            while (true) {
                if (attributeReportsToSend.length > 0) {
                    const attributeReport = attributeReportsToSend.shift();
                    if (attributeReport !== undefined) {
                        if (!firstAttributeAddedToReportMessage) {
                            firstAttributeAddedToReportMessage = true;
                            messageSize += 3; // Array element is added now which needs 3 bytes
                        }
                        const allowMissingFieldsForNonFabricFilteredRead =
                            !forFabricFilteredRead && attributeReport.hasFabricSensitiveData;
                        const encodedAttribute = encodeAttributePayload(attributeReport, {
                            allowMissingFieldsForNonFabricFilteredRead,
                        });
                        const attributeReportBytes = TlvAny.getEncodedByteLength(encodedAttribute);
                        if (messageSize + attributeReportBytes > this.exchange.maxPayloadSize) {
                            if (canAttributePayloadBeChunked(attributeReport)) {
                                // Attribute is a non-empty array: chunk it and add the chunks to the beginning of the queue
                                attributeReportsToSend.unshift(...chunkAttributePayload(attributeReport));
                                continue;
                            }
                            await sendAndResetReport();
                        }
                        messageSize += attributeReportBytes;
                        if (dataReport.attributeReports === undefined) dataReport.attributeReports = [];
                        dataReport.attributeReports.push(encodedAttribute);
                    }
                } else if (eventReportsToSend.length > 0) {
                    const eventReport = eventReportsToSend.shift();
                    if (eventReport === undefined) {
                        // No more chunks to send
                        delete dataReport.moreChunkedMessages;
                        break;
                    }
                    if (!firstEventAddedToReportMessage) {
                        firstEventAddedToReportMessage = true;
                        messageSize += 3; // Array element is added now which needs 3 bytes
                    }
                    const allowMissingFieldsForNonFabricFilteredRead =
                        !forFabricFilteredRead && eventReport.hasFabricSensitiveData;
                    const encodedEvent = encodeEventPayload(eventReport, {
                        allowMissingFieldsForNonFabricFilteredRead,
                    });
                    const eventReportBytes = TlvAny.getEncodedByteLength(encodedEvent);
                    if (messageSize + eventReportBytes > this.exchange.maxPayloadSize) {
                        await sendAndResetReport();
                    }
                    messageSize += eventReportBytes;
                    if (dataReport.eventReports === undefined) dataReport.eventReports = [];
                    dataReport.eventReports.push(encodedEvent);
                } else {
                    // No more chunks to send
                    delete dataReport.moreChunkedMessages;
                    break;
                }
            }
        }

        await this.sendDataReportMessage(dataReport);
    }

    async sendDataReportMessage(dataReport: TypeFromSchema<typeof TlvDataReportForSend>) {
        const dataReportToSend = {
            ...dataReport,
            suppressResponse: dataReport.moreChunkedMessages ? false : dataReport.suppressResponse, // always false when moreChunkedMessages is true
        };
        const encodedMessage = TlvDataReportForSend.encode(dataReportToSend);
        if (encodedMessage.length > this.exchange.maxPayloadSize) {
            throw new MatterFlowError(
                `DataReport is too long to fit in a single chunk, This should not happen! Data: ${Logger.toJSON(
                    dataReportToSend,
                )}`,
            );
        }
        logger.debug(
            `Sending DataReport chunk with ${dataReportToSend.attributeReports?.length ?? 0} attributes and ${
                dataReportToSend.eventReports?.length ?? 0
            } events: ${encodedMessage.length} bytes (moreChunkedMessages: ${dataReportToSend.moreChunkedMessages ?? false}, suppressResponse: ${dataReportToSend.suppressResponse})`,
        );

        if (dataReportToSend.suppressResponse) {
            // We do not expect a response other than a Standalone Ack, so if we receive anything else, we throw an error
            try {
                await this.exchange.send(MessageType.ReportData, encodedMessage, {
                    expectAckOnly: true,
                });
            } catch (e) {
                UnexpectedMessageError.accept(e);

                const { receivedMessage } = e;
                this.throwIfErrorStatusMessage(receivedMessage);
            }
        } else {
            await this.exchange.send(MessageType.ReportData, encodedMessage);
            await this.waitForSuccess();
        }
    }
}

export class IncomingInteractionClientMessenger extends InteractionMessenger {
    async waitFor(messageType: number, timeoutMs?: number) {
        const message = await this.nextMessage(timeoutMs);
        const {
            payloadHeader: { messageType: receivedMessageType },
        } = message;
        if (receivedMessageType !== messageType) {
            if (receivedMessageType === MessageType.StatusResponse) {
                const statusCode = TlvStatusResponse.decode(message.payload).status;
                throw new StatusResponseError(`Received status response ${statusCode}`, statusCode);
            }
            throw new MatterFlowError(
                `Received unexpected message type ${receivedMessageType.toString(16)}. Expected ${messageType.toString(
                    16,
                )}`,
            );
        }
        return message;
    }
    async readDataReports(sendFinalAckMessage = true): Promise<DataReport> {
        let subscriptionId: number | undefined;
        const attributeValues: TypeFromSchema<typeof TlvAttributeReport>[] = [];
        const eventValues: TypeFromSchema<typeof TlvEventReport>[] = [];

        while (true) {
            const dataReportMessage = await this.waitFor(MessageType.ReportData);
            const report = TlvDataReport.decode(dataReportMessage.payload);
            if (subscriptionId === undefined && report.subscriptionId !== undefined) {
                subscriptionId = report.subscriptionId;
            } else if (
                (subscriptionId !== undefined || report.subscriptionId !== undefined) &&
                report.subscriptionId !== subscriptionId
            ) {
                throw new UnexpectedDataError(`Invalid subscription ID ${report.subscriptionId} received`);
            }

            logger.debug(
                `Received DataReport chunk with ${report.attributeReports?.length ?? 0} attributes and ${report.eventReports?.length ?? 0} events, suppressResponse: ${report.suppressResponse}, moreChunkedMessages: ${report.moreChunkedMessages}`,
            );

            if (Array.isArray(report.attributeReports) && report.attributeReports.length > 0) {
                attributeValues.push(...report.attributeReports);
            }
            if (Array.isArray(report.eventReports) && report.eventReports.length > 0) {
                eventValues.push(...report.eventReports);
            }

            if (report.moreChunkedMessages || (sendFinalAckMessage && !report.suppressResponse)) {
                await this.sendStatus(StatusCode.Success);
            }

            if (!report.moreChunkedMessages) {
                report.attributeReports = attributeValues;
                report.eventReports = eventValues;
                return report;
            }
        }
    }
}

export class InteractionClientMessenger extends IncomingInteractionClientMessenger {
    constructor(private readonly exchangeProvider: ExchangeProvider) {
        super(exchangeProvider.initiateExchange());
    }

    /** Implements a send method with an automatic reconnection mechanism */
    override async send(messageType: number, payload: Uint8Array, options?: ExchangeSendOptions) {
        try {
            if (this.exchange.channel.closed) {
                throw new ChannelNotConnectedError("The exchange channel is closed. Please connect the device first.");
            }

            return await this.exchange.send(messageType, payload, options);
        } catch (error) {
            if (error instanceof RetransmissionLimitReachedError || error instanceof ChannelNotConnectedError) {
                // When retransmission failed (most likely due to a lost connection or invalid session),
                // try to reconnect if possible and resend the message once
                logger.info(
                    `${error instanceof RetransmissionLimitReachedError ? "Retransmission limit reached" : "Channel not connected"}, trying to reconnect and resend the message.`,
                );
                await this.exchange.close();
                if (await this.exchangeProvider.reconnectChannel()) {
                    this.exchange = this.exchangeProvider.initiateExchange();
                    return await this.exchange.send(messageType, payload, options);
                }
            } else {
                throw error;
            }
        }
    }

    async sendReadRequest(readRequest: ReadRequest) {
        await this.send(MessageType.ReadRequest, TlvReadRequest.encode(readRequest));

        return this.readDataReports();
    }

    async sendSubscribeRequest(subscribeRequest: SubscribeRequest) {
        await this.send(MessageType.SubscribeRequest, TlvSubscribeRequest.encode(subscribeRequest));

        const report = await this.readDataReports();
        const { subscriptionId } = report;

        if (subscriptionId === undefined) {
            throw new UnexpectedDataError(`Subscription ID not provided in report`);
        }

        const subscribeResponseMessage = await this.nextMessage(MessageType.SubscribeResponse);
        const subscribeResponse = TlvSubscribeResponse.decode(subscribeResponseMessage.payload);

        if (subscribeResponse.subscriptionId !== subscriptionId) {
            throw new MatterFlowError(
                `Received subscription ID ${subscribeResponse.subscriptionId} instead of ${subscriptionId}`,
            );
        }

        return {
            subscribeResponse,
            report,
        };
    }

    async sendInvokeCommand(invokeRequest: InvokeRequest, expectedProcessingTimeMs?: number) {
        if (invokeRequest.suppressResponse) {
            await this.requestWithSuppressedResponse(
                MessageType.InvokeRequest,
                TlvInvokeRequest,
                invokeRequest,
                expectedProcessingTimeMs,
            );
        } else {
            return await this.request(
                MessageType.InvokeRequest,
                TlvInvokeRequest,
                MessageType.InvokeResponse,
                TlvInvokeResponse,
                invokeRequest,
                expectedProcessingTimeMs,
            );
        }
    }

    async sendWriteCommand(writeRequest: WriteRequest) {
        if (writeRequest.suppressResponse) {
            await this.requestWithSuppressedResponse(MessageType.WriteRequest, TlvWriteRequest, writeRequest);
        } else {
            return await this.request(
                MessageType.WriteRequest,
                TlvWriteRequest,
                MessageType.WriteResponse,
                TlvWriteResponse,
                writeRequest,
            );
        }
    }

    sendTimedRequest(timeoutSeconds: number) {
        return this.request(MessageType.TimedRequest, TlvTimedRequest, MessageType.StatusResponse, TlvStatusResponse, {
            timeout: timeoutSeconds,
            interactionModelRevision: Specification.INTERACTION_MODEL_REVISION,
        });
    }

    private async requestWithSuppressedResponse<RequestT>(
        requestMessageType: number,
        requestSchema: TlvSchema<RequestT>,
        request: RequestT,
        expectedProcessingTimeMs?: number,
    ): Promise<void> {
        await this.send(requestMessageType, requestSchema.encode(request), {
            expectAckOnly: true,
            expectedProcessingTimeMs,
        });
    }

    private async request<RequestT, ResponseT>(
        requestMessageType: number,
        requestSchema: TlvSchema<RequestT>,
        responseMessageType: number,
        responseSchema: TlvSchema<ResponseT>,
        request: RequestT,
        expectedProcessingTimeMs?: number,
    ): Promise<ResponseT> {
        await this.send(requestMessageType, requestSchema.encode(request), {
            expectAckOnly: false,
            expectedProcessingTimeMs,
        });
        const responseMessage = await this.nextMessage(responseMessageType, expectedProcessingTimeMs);
        return responseSchema.decode(responseMessage.payload);
    }
}