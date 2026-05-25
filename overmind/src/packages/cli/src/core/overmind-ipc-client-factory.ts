import { getOvermindPipePath, type LoggerFactory,LoggerFactoryToken, resolveCliConfigDir } from 'overmind-core';
import { inject, injectable } from "tsyringe";

import { OvermindIpcClient } from "./overmind-ipc-client";

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
