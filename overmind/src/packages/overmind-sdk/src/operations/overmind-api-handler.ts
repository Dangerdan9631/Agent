
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
import { OvermindConfigOptions, createConfigOptions } from "@overmind-sdk/config";

export class OvermindApiHandler implements OvermindApi {
    private readonly configOptions: OvermindConfigOptions;

    constructor(private readonly configDir: string | undefined) {
        this.configOptions = createConfigOptions(configDir);
    }

    start(request: StartRequest): Promise<StartResponse> {
        throw new Error("Method not implemented.");
    }
    shutdown(request: ShutdownRequest): Promise<ShutdownResponse> {
        throw new Error("Method not implemented.");
    }
    getStats(request: GetStatsRequest): Promise<GetStatsResponse> {
        throw new Error("Method not implemented.");
    }
    attach(request: AttachRequest): Promise<AttachChannel> {
        throw new Error("Method not implemented.");
    }
    startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse> {
        throw new Error("Method not implemented.");
    }
    stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse> {
        throw new Error("Method not implemented.");
    }
    sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse> {
        throw new Error("Method not implemented.");
    }
}