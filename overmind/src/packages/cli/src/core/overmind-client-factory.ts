import { inject, injectable } from "tsyringe";
import { LoggerFactoryToken, getOvermindPipePath, resolveCliConfigDir, type LoggerFactory } from 'overmind-core';
import { OvermindIpcClient } from "./overmind-client";

@injectable()
export class OvermindIpcClientFactory {
    constructor(
        @inject(LoggerFactoryToken) private readonly loggerFactory: LoggerFactory
    ) { }

    getOvermindClient(configDir: string | undefined): OvermindIpcClient {
        const resolvedConfigDir = resolveCliConfigDir(configDir);
        const pipePath = getOvermindPipePath(resolvedConfigDir);
        const client = new OvermindIpcClient(pipePath, this.loggerFactory);
        return client;
    }
}
