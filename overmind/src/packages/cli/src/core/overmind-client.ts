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
    OvermindResponse,
    AttachListener,
    AttachRequest,
    AttachError,
    OvermindStreamResponse,
    AttachClient,
    OvermindMethodMap,
    OvermindMessageEnvelope,
    OvermindIpcServerMessageEnvelope,
    OvermindStreamMethodMap,
    OvermindIpcServerStreamMessageEnvelope,
    AttachPacketAck,
    AttachPacketOutput,
    AttachPacketTerminate,
} from "overmind-api";
import { IpcClient } from "./ipc-client";
import { type Logger, type LoggerFactory } from "../logging";

type OvermindApiStreamListenerMethods = {
    [M in keyof OvermindStreamMethodMap]: {
        [P in keyof OvermindStreamMethodMap[M]['service']['packets']]
        : (listener: OvermindStreamMethodMap[M]['service']['listener'], data: OvermindStreamMethodMap[M]['service']['packets'][P]) => void;
    }
}

const OVERMIND_IPC_STREAM_METHODS: OvermindApiStreamListenerMethods = {
    'service.attach': {
        'ack': (listener: AttachListener, data: AttachPacketAck) => listener.onAttach?.(data),
        'output': (listener: AttachListener, data: AttachPacketOutput) => listener.onReceive(data),
        'terminate': (listener: AttachListener, data: AttachPacketTerminate) => listener.onTerminate?.(data),
    }
}

export class OvermindIpcClient implements OvermindApi {
    private readonly logger: Logger;

    constructor(
        private readonly pipePath: string,
        loggerFactory: LoggerFactory
    ) {
        this.logger = loggerFactory.create('OvermindIpcClient');
    }

    async getServiceStats(request: GetServiceStatsRequest): Promise<OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>> {
        return await this.send(
            'service.stats',
            request
        )
    }
    
    async shutdown(request: ShutdownRequest): Promise<OvermindResponse<ShutdownResponse, ShutdownError>> {
        return await this.send(
            'service.shutdown',
            request
        )
    }

    async attach(request: AttachRequest, listener: AttachListener): Promise<OvermindStreamResponse<AttachClient, AttachError>> {
        const result = await this.stream('service.attach', request, listener);
        if ('client' in result) {
            return {
                success: true,
                client: { disconnect: () => result.client.disconnect() },
            };
        }
        return { success: false, error: result.error ?? { errorMessage: 'Unknown error' } };
    }
    
    async startCerebrate(request: StartCerebrateRequest): Promise<OvermindResponse<StartCerebrateResponse, StartCerebrateError>> {
        return await this.send(
            'cerebrate.start',
            request
        )
    }
    
    async stopCerebrate(request: StopCerebrateRequest): Promise<OvermindResponse<StopCerebrateResponse, StopCerebrateError>> {
        return await this.send(
            'cerebrate.stop',
            request
        )
    }

    async sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<OvermindResponse<SendCerebrateCommandResponse, SendCerebrateCommandError>> {
        return await this.send(
            'cerebrate.command',
            request
        )
    }

    private async send<TMethod extends keyof OvermindMethodMap>(
        method: TMethod,
        message: OvermindMethodMap[TMethod]['request']
    ): Promise<OvermindMethodMap[TMethod]['response']> {
        return await new Promise<OvermindMethodMap[TMethod]['response']>((resolve, reject) => {
            const client = new IpcClient(
                this.pipePath,
                {
                    onConnect: () => {
                        const envelope: OvermindMessageEnvelope<TMethod, OvermindMethodMap[TMethod]['request']> = {
                            method,
                            message,
                        };
                        client.send(JSON.stringify(envelope));
                    },
                    onReceive: (data) => {
                        try {
                            const response = JSON.parse(data) as OvermindIpcServerMessageEnvelope;
                            if (!response?.message || response.method !== method) {
                                reject(new Error('Invalid response received: ' + data));
                            } else {
                                resolve(response.message as OvermindMethodMap[TMethod]['response']);
                            }
                            client.disconnect();
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onError: (error) => {
                        switch (error.type) {
                            case 'timeout':
                                reject(new Error('Connection timed out'));
                                break;
                            case 'disconnected':
                                reject(new Error('Disconnected before response received'));
                                break;
                            case 'service_error':
                                reject(error.error ?? new Error(error.message));
                                break;
                            default:
                                const _exhaustiveCheck: never = error;
                                throw new Error(`Unhandled Error: ${JSON.stringify(_exhaustiveCheck)}`);
                        }
                    },
                    onDisconnect: () => {
                        reject(new Error('Disconnected before response received'));
                    },
                },
                this.logger)
        });
    }

    private async stream<TMethod extends keyof OvermindStreamMethodMap>(
        method: TMethod,
        message: OvermindStreamMethodMap[TMethod]['request'],
        listener: OvermindStreamMethodMap[TMethod]['service']['listener']
    ): Promise<{ client: IpcClient } | { error?: OvermindStreamMethodMap[TMethod]['error'] }> {
        return await new Promise((resolve, reject) => {
            const client = new IpcClient(
                this.pipePath,
                {
                    onConnect: () => {
                        const envelope: OvermindMessageEnvelope<TMethod, OvermindStreamMethodMap[TMethod]['request']> = {
                            method,
                            message,
                        };
                        client.send(JSON.stringify(envelope));
                    },
                    onReceive: (data) => {
                        try {
                            const response = JSON.parse(data) as OvermindIpcServerStreamMessageEnvelope;
                            const packet = response?.message;
                            if (response?.method !== method || !packet?.packet) {
                                reject(new Error('Invalid response received: ' + data));
                                client.disconnect();
                            } else {
                                (OVERMIND_IPC_STREAM_METHODS[method][packet.packet] as unknown as (listener: OvermindStreamMethodMap[TMethod]['service']['listener'], data: unknown) => void)(listener, packet.data);
                            }
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onError: (error) => {
                        reject(error);
                    },
                    onDisconnect: () => {
                        reject(new Error('Disconnected before response received'));
                    },
                },
                this.logger)
            resolve({ client });
        });
    }
}