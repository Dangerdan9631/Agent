import {
    GetServiceStatsRequest,
    GetServiceStatsResponse,
    OvermindApi,
    SendCerebrateCommandRequest,
    SendCerebrateCommandResponse,
    ShutdownRequest,
    ShutdownResponse,
    StartCerebrateRequest,
    StartCerebrateResponse,
    StopCerebrateRequest,
    StopCerebrateResponse,
    GetServiceStatsError,
    SendCerebrateCommandError,
    ShutdownError,
    StartCerebrateError,
    StopCerebrateError,
    AttachRequest,
    AttachError,
    AttachClientChannel,
    createStreamConnectedResponse,
    isOvermindResponse,
    OvermindResponse,
    OvermindStreamResponse,
} from 'overmind-api';
import {
    createMessageEnvelope,
    isMessageEnvelope,
    RPC_GET_SERVICE_STATS,
    RPC_SHUTDOWN,
    RPC_START_CEREBRATE,
    RPC_STOP_CEREBRATE,
    RPC_SEND_CEREBRATE_COMMAND,
    isStreamEventEnvelope,
    RPC_ATTACH,
} from 'overmind-core';
import {
    createIpcClientConnection,
    type IpcConnectionError,
    type Logger,
    type LoggerFactory
} from 'overmind-core';
import { AttachStreamClient } from './attach-stream-client';
import { StreamClient } from './stream-client';

export class OvermindIpcClient implements OvermindApi {
    private readonly logger: Logger;

    constructor(
        private readonly pipePath: string,
        loggerFactory: LoggerFactory
    ) {
        this.logger = loggerFactory.create('OvermindIpcClient');
    }

    async getServiceStats(request: GetServiceStatsRequest): Promise<OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>> {
        return await this.send(RPC_GET_SERVICE_STATS, request);
    }

    async shutdown(request: ShutdownRequest): Promise<OvermindResponse<ShutdownResponse, ShutdownError>> {
        return await this.send(RPC_SHUTDOWN, request);
    }

    async attach(request: AttachRequest): Promise<OvermindStreamResponse<AttachClientChannel, AttachError>> {
        return await this.stream<typeof RPC_ATTACH, AttachRequest, AttachClientChannel, AttachError>(
            RPC_ATTACH,
            request,
            (message: AttachRequest, sendMessage: (message: unknown) => void) =>
                new AttachStreamClient(message, sendMessage)
        );
    }

    async startCerebrate(request: StartCerebrateRequest): Promise<OvermindResponse<StartCerebrateResponse, StartCerebrateError>> {
        return await this.send(RPC_START_CEREBRATE, request);
    }

    async stopCerebrate(request: StopCerebrateRequest): Promise<OvermindResponse<StopCerebrateResponse, StopCerebrateError>> {
        return await this.send(RPC_STOP_CEREBRATE, request);
    }

    async sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<OvermindResponse<SendCerebrateCommandResponse, SendCerebrateCommandError>> {
        return await this.send(RPC_SEND_CEREBRATE_COMMAND, request);
    }

    private async send<TMethod extends string, TRequest, TResponse, TError>(
        method: TMethod,
        message: TRequest
    ): Promise<OvermindResponse<TResponse, TError>> {
        return new Promise<OvermindResponse<TResponse, TError>>((resolve, reject) => {
            const client = createIpcClientConnection(
                this.pipePath,
                {
                    onConnect: () => {
                        const envelope = createMessageEnvelope(method, message);
                        client.send(JSON.stringify(envelope));
                    },
                    onReceive: (_connection, data) => {
                        try {
                            const response: unknown = JSON.parse(data);
                            if (isMessageEnvelope<TMethod>(method, response)
                                && isOvermindResponse<TResponse, TError>(response.message)
                            ) {
                                resolve(response.message);
                            } else {
                                reject(new Error('Invalid response received: ' + data));
                            }
                        } catch (error) {
                            reject(error);
                        } finally {
                            client.disconnect();
                        }
                    },
                    onError: (_connection, error) => {
                        reject(this.toIpcError(error));
                    },
                    onDisconnect: () => {
                        reject(new Error('Disconnected before response received'));
                    },
                },
                this.logger)
        });
    }

    private async stream<TMethod extends string, TRequest, TClientChannel, TError>(
        method: TMethod,
        message: TRequest,
        clientChannelFactory: (message: TRequest, sendMessage: (message: unknown) => void) => StreamClient & TClientChannel,
    ): Promise<OvermindStreamResponse<TClientChannel, TError>> {
        return new Promise<OvermindStreamResponse<TClientChannel, TError>>((resolve, reject) => {
            let channel: (StreamClient & TClientChannel) | undefined = undefined;
            const client = createIpcClientConnection(
                this.pipePath,
                {
                    onConnect: () => {
                        channel = clientChannelFactory(message, (message) => {
                            const envelope = createMessageEnvelope(method, message);
                            client.send(JSON.stringify(envelope));
                        });
                        resolve(createStreamConnectedResponse<TClientChannel>(channel));
                    },
                    onReceive: (_connection, data) => {
                        if (channel) {
                            try {
                                const response: unknown = JSON.parse(data);
                                if (isMessageEnvelope<TMethod>(method, response)
                                    && isStreamEventEnvelope(response.message)
                                ) {
                                    channel.handleReceive(response.message);
                                } else {
                                    reject(new Error('Invalid response received: ' + data));
                                }
                            } catch (error) {
                                channel.handleError(error instanceof Error ? error : new Error('Unknown error: ' + error));
                                client.disconnect();
                            }
                        } else {
                            reject(new Error('Channel not initialized before receiving messages'));
                        }
                    },
                    onError: (_connection, error) => {
                        this.handleStreamError(this.toIpcError(error), channel, reject);
                    },
                    onDisconnect: () => {
                        this.handleStreamError(new Error('Disconnected before response received'), channel, reject);
                    },
                },
                this.logger)
        });
    }

    private toIpcError(error: IpcConnectionError): Error {
        switch (error.type) {
            case 'timeout':
                return new Error('Connection timed out');
            case 'disconnected':
                return new Error('Disconnected before response received');
            case 'remote_error':
                return error.error ?? new Error(error.message);
            default:
                const exhaustiveCheck: never = error;
                throw new Error(`Unhandled Error: ${JSON.stringify(exhaustiveCheck)}`);
        }
    }

    private handleStreamError(error: Error, channel: StreamClient | undefined, reject: (reason?: any) => void): void {
        if (channel) {
            channel.handleError(error);
        } else {
            reject(error);
        }
    }
} 
