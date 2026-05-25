import 'reflect-metadata';

import { createConfigOptions } from "@overmind-sdk/config";
import { buildSdkContainer } from '@overmind-sdk/di';
import { OvermindApiHandler } from "@overmind-sdk/operations";

import { AttachChannel, AttachRequest } from "./attach";
import { GetStatsRequest, GetStatsResponse } from "./get-stats";
import { SendCerebrateCommandRequest, SendCerebrateCommandResponse } from "./send-cerebrate-command";
import { ShutdownRequest, ShutdownResponse } from "./shutdown";
import { StartRequest, StartResponse } from "./start";
import { StartCerebrateRequest, StartCerebrateResponse } from "./start-cerebrate";
import { StopCerebrateRequest, StopCerebrateResponse } from "./stop-cerebrate";

export class OvermindApiFactory {
    create(configDir: string | undefined): OvermindApi {
        const configOptions = createConfigOptions(configDir);
        return buildSdkContainer(configOptions).resolve(OvermindApiHandler);
    }
}

export interface OvermindApi {
    start(request: StartRequest): Promise<StartResponse>;
    shutdown(request: ShutdownRequest): Promise<ShutdownResponse>;
    getStats(request: GetStatsRequest): Promise<GetStatsResponse>;

    attach(request: AttachRequest): Promise<AttachChannel>;

    startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse>;
    stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse>;
    sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse>;
};

export type StreamEventListener<TEvent> = (event: TEvent) => void | Promise<void>;
export type StreamErrorListener = (error: Error) => void | Promise<void>;