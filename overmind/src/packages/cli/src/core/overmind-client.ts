import {
    AttachEventAttached,
    AttachEventOutput,
    AttachEventTerminate,
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
} from 'overmind-api';
import {
    type MessageEnvelope,
    type StreamEventEnvelope,
    RPC_ATTACH,
    createMessageEnvelope,
    createStreamEventEnvelope,
    EVENT_ATTACHED,
    EVENT_OUTPUT,
    EVENT_TERMINATE,
    isMessageEnvelope,
    RPC_GET_SERVICE_STATS,
    RPC_SHUTDOWN,
    RPC_START_CEREBRATE,
    RPC_STOP_CEREBRATE,
    RPC_SEND_CEREBRATE_COMMAND,
    isStreamEventEnvelope,
} from 'overmind-core';
import {
    createIpcClientConnection,
    IpcConnection,
    type IpcConnectionError,
    type Logger,
    type LoggerFactory
} from 'overmind-core';

type AttachEventListeners = {
    attached: Set<(event: AttachEventAttached) => void>;
    output: Set<(event: AttachEventOutput) => void>;
    terminate: Set<(event: AttachEventTerminate) => void>;
};

export class OvermindIpcClient implements OvermindApi {
    private readonly logger: Logger;

    constructor(
        private readonly pipePath: string,
        loggerFactory: LoggerFactory
    ) {
        this.logger = loggerFactory.create('OvermindIpcClient');
    }

    async getServiceStats(request: GetServiceStatsRequest): Promise<OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>> {
        return await this.send(RPC_GET_SERVICE_STATS, request) as OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>;
    }

    async shutdown(request: ShutdownRequest): Promise<OvermindResponse<ShutdownResponse, ShutdownError>> {
        return await this.send(RPC_SHUTDOWN, request) as OvermindResponse<ShutdownResponse, ShutdownError>;
    }

    async attach(request: AttachRequest): Promise<OvermindStreamResponse<AttachClientChannel, AttachError>> {
        return await this.attachStream(request);
    }

    async startCerebrate(request: StartCerebrateRequest): Promise<OvermindResponse<StartCerebrateResponse, StartCerebrateError>> {
        return await this.send(RPC_START_CEREBRATE, request) as OvermindResponse<StartCerebrateResponse, StartCerebrateError>;
    }

    async stopCerebrate(request: StopCerebrateRequest): Promise<OvermindResponse<StopCerebrateResponse, StopCerebrateError>> {
        return await this.send(RPC_STOP_CEREBRATE, request) as OvermindResponse<StopCerebrateResponse, StopCerebrateError>;
    }

    async sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<OvermindResponse<SendCerebrateCommandResponse, SendCerebrateCommandError>> {
        return await this.send(RPC_SEND_CEREBRATE_COMMAND, request) as OvermindResponse<SendCerebrateCommandResponse, SendCerebrateCommandError>;
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

    private createAttachChannel(
        sendMessage: (message: string) => void
    ): {
        channel: AttachClientChannel;
        dispatch: (response: MessageEnvelope<string>) => void;
        reportError: (error: Error) => void;
    } {
        const listeners: AttachEventListeners = {
            attached: new Set(),
            output: new Set(),
            terminate: new Set(),
        };

        const channel: AttachClientChannel = {
            onError: (_error: Error) => undefined,
            listen: async () => undefined,
            terminate: (event) => {
                const envelope = createMessageEnvelope(RPC_ATTACH, createStreamEventEnvelope(EVENT_TERMINATE, event));
                sendMessage(JSON.stringify(envelope));
            },
            onAttached: (listener) => {
                listeners.attached.add(listener);
            },
            onOutput: (listener) => {
                listeners.output.add(listener);
            },
            onTerminate: (listener) => {
                listeners.terminate.add(listener);
            },
        };

        return {
            channel,
            dispatch: (response) => {
                this.handleServiceStreamMessage(response, listeners);
            },
            reportError: (error) => {
                channel.onError(error);
            },
        };
    }

    private handleServiceStreamMessage(response: MessageEnvelope<string>, listeners: AttachEventListeners): void {
        switch (response.method) {
            case RPC_ATTACH:
                const streamEvent = response.message as StreamEventEnvelope<string>;
                switch (streamEvent.event) {
                    case EVENT_ATTACHED:
                        listeners.attached.forEach((listener) => listener(streamEvent.data as AttachEventAttached));
                        return;
                    case EVENT_OUTPUT:
                        listeners.output.forEach((listener) => listener(streamEvent.data as AttachEventOutput));
                        return;
                    case EVENT_TERMINATE:
                        listeners.terminate.forEach((listener) => listener(streamEvent.data as AttachEventTerminate));
                        return;
                    default:
                        throw new Error('Unknown attach event received');
                }
            default:
                throw new Error('Unknown stream message received');
        }
    }

    private async send(
        method: string,
        message: unknown
    ): Promise<OvermindResponse<unknown, unknown>> {
        return new Promise<OvermindResponse<unknown, unknown>>((resolve, reject) => {
            const client = createIpcClientConnection(
                this.pipePath,
                {
                    onConnect: () => {
                        const envelope = createMessageEnvelope(method, message);
                        client.send(JSON.stringify(envelope));
                    },
                    onReceive: (_connection, data) => {
                        try {
                            const response = JSON.parse(data) as MessageEnvelope<string>;
                            if (isMessageEnvelope(response)
                                && response.method === method
                                && isOvermindResponse(response.message)
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

    private async attachStream(request: AttachRequest): Promise<OvermindStreamResponse<AttachClientChannel, AttachError>> {
        return new Promise<OvermindStreamResponse<AttachClientChannel, AttachError>>((resolve, reject) => {
            let connected = false;
            let client: IpcConnection;

            const streamChannel = this.createAttachChannel((payload) => {
                client.send(payload);
            });

            client = createIpcClientConnection(
                this.pipePath,
                {
                    onConnect: () => {
                        connected = true;
                        const envelope = createMessageEnvelope(RPC_ATTACH, request);
                        client.send(JSON.stringify(envelope));
                        resolve(createStreamConnectedResponse(streamChannel.channel));
                    },
                    onReceive: (_connection, data) => {
                        try {
                            const response = JSON.parse(data) as MessageEnvelope<string>;
                            if (isMessageEnvelope(response) && isStreamEventEnvelope(response.message)) {
                                streamChannel.dispatch(response);
                            } else {
                                streamChannel.reportError(new Error('Invalid response received: ' + data));
                                client.disconnect();
                            }
                        } catch (error) {
                            streamChannel.reportError(error instanceof Error ? error : new Error('Unknown error: ' + error));
                            client.disconnect();
                        }
                    },
                    onError: (_connection, error) => {
                        if (!connected) {
                            reject(this.toIpcError(error));
                        } else {
                            streamChannel.reportError(this.toIpcError(error));
                        }
                    },
                    onDisconnect: () => {
                        if (!connected) {
                            reject(new Error('Disconnected before response received'));
                        } else {
                            streamChannel.reportError(new Error('Disconnected before response received'));
                        }
                    },
                },
                this.logger)
        });
    }
}