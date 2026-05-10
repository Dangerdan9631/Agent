import {
    GetServiceStatsRequest,
    GetServiceStatsResponse,
    OvermindApi,
    OvermindApiMethod,
    OvermindApiErrorMap,
    OvermindApiRequestMap,
    OvermindApiResponseMap,
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
} from "overmind-api";
import { IpcClient } from "./ipc-client";
import { type Logger, type LoggerFactory } from "../logging";

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

    private async send<TMethod extends OvermindApiMethod>(
        method: TMethod,
        params: OvermindApiRequestMap[TMethod]
    ): Promise<OvermindResponse<OvermindApiResponseMap[TMethod], OvermindApiErrorMap[TMethod]>> {
        return await new Promise<OvermindResponse<OvermindApiResponseMap[TMethod], OvermindApiErrorMap[TMethod]>>((resolve, reject) => {
            const client = new IpcClient(
                this.pipePath,
                {
                    onConnect: () => {
                        client.send(JSON.stringify({ method, params }));
                    },
                    onReceive: (data) => {
                        try {
                            const response = JSON.parse(data) as { method: string, result: unknown };
                            if (!response?.result || response.method !== method) {
                                reject(new Error('Invalid response received: ' + data));
                            } else {
                                resolve(response.result as OvermindResponse<OvermindApiResponseMap[TMethod], OvermindApiErrorMap[TMethod]>);
                            }
                            client.disconnect();
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
        });
    }
}