
import {
    AttachChannel,
    AttachRequest,
    GetStatsRequest,
    GetStatsResponse,
    OvermindApi,
    SendCerebrateCommandRequest,
    SendCerebrateCommandResponse,
    ShutdownRequest,
    ShutdownResponse,
    StartCerebrateRequest,
    StartCerebrateResponse,
    StartRequest,
    StartResponse,
    StopCerebrateRequest,
    StopCerebrateResponse
} from "@overmind-sdk/api";
import { LoggerFactoryToken } from '@overmind-sdk/di/logger-factory-token';
import type { LoggerFactory } from "@overmind-sdk/logging";
import { inject, injectable } from 'tsyringe';

import { ShutdownOperation } from "./shutdown";
import { StartOperation } from "./start";

@injectable()
export class OvermindApiHandler implements OvermindApi {
    private readonly logger: LoggerFactory;

    constructor(
        private readonly startOperation: StartOperation,
        private readonly shutdownOperation: ShutdownOperation,
        @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
    ) { 
        this.logger = loggerFactory.create('OvermindApi');
    }

    async start(request: StartRequest): Promise<StartResponse> {
        return await this.startOperation.execute(request);
    }

    async shutdown(request: ShutdownRequest): Promise<ShutdownResponse> {
        return await this.shutdownOperation.execute(request);
    }

    getStats(_request: GetStatsRequest): Promise<GetStatsResponse> {
        throw new Error("Method not implemented.");
    }
    attach(_request: AttachRequest): Promise<AttachChannel> {
        throw new Error("Method not implemented.");
    }
    startCerebrate(_request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
        throw new Error("Method not implemented.");
    }
    stopCerebrate(_request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
        throw new Error("Method not implemented.");
    }
    sendCerebrateCommand(_request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
        throw new Error("Method not implemented.");
    }
}