import {
    getOvermindPipePath
} from "overmind-api";
import { inject, injectable } from "tsyringe";
import { LoggerFactoryToken, type LoggerFactory } from "../logging";
import { OvermindIpcClient } from "./overmind-client";

@injectable()
export class OvermindIpcClientFactory {
    constructor(
        @inject(LoggerFactoryToken) private readonly loggerFactory: LoggerFactory
    ) { }

    getOvermindClient(configDir: string): OvermindIpcClient {
        const pipePath = getOvermindPipePath(configDir);
        const client = new OvermindIpcClient(pipePath, this.loggerFactory);
        return client;
    }
}
