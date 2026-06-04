import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { StartRequest, StartResponse } from '@overmind-sdk/api';
import type { OvermindConfigOptions } from "@overmind-sdk/config";
import { LoggerFactoryToken } from '@overmind-sdk/di/logger-factory-token';
import { OvermindConfigOptionsToken } from '@overmind-sdk/di/overmind-config-options-token';
import { OvermindIpcClient } from '@overmind-sdk/ipc/overmind-ipc-client';
import type { Logger, LoggerFactory } from '@overmind-sdk/logging';
import { inject, injectable } from 'tsyringe';

@injectable()
export class StartOperation {
    private readonly logger: Logger;

    constructor(
        @inject(OvermindIpcClient) private readonly overmindIpcClient: OvermindIpcClient,
        @inject(OvermindConfigOptionsToken) private readonly configOptions: OvermindConfigOptions,
        @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
    ) {
        this.logger = loggerFactory.create('OvermindApi:Start');
    }

    async execute(_request: StartRequest): Promise<StartResponse> {
        if (await this.isRunning()) {
            throw new Error(`Overmind service is already running for config dir "${this.configOptions.resolvedConfigDir}".`);
        }

        const serviceBinPath = this.resolveServiceBinPath();

        this.logger.info('Starting service:', this.configOptions.instanceName);
        this.logger.debug('  - service bin:', serviceBinPath);
        this.logger.debug('  - config:', this.configOptions.resolvedConfigDir);
        const child = spawn(process.execPath, [serviceBinPath, this.configOptions.resolvedConfigDir], {
            detached: true,
            stdio: ['ignore', 'ignore', 'pipe'],
        });

        child.stderr?.on('data', (chunk: Buffer) => {
            process.stderr.write(chunk);
        });

        child.unref();

        this.logger.debug('Waiting for service startup.');
        await this.waitForService();

        return { message: 'Service started successfully.' };
    }

    private async waitForService(): Promise<void> {
        const startedAt = Date.now();
        const timeoutMs = 5_000;

        while (Date.now() - startedAt < timeoutMs) {
            if (await this.isRunning()) {
                return;
            }

            this.logger.debug('Waiting for service startup: ', Date.now() - startedAt, 'ms elapsed');
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        throw new Error('Timed out waiting for service startup.');
    }

    private resolveServiceBinPath(): string {
        try {
            return fileURLToPath(import.meta.resolve('overmind-service/bin'));
        } catch {
            return path.resolve(process.cwd(), 'packages/overmind/dist/bin.js');
        }
    }

    private async isRunning(): Promise<boolean> {
        try {
            const response = await this.overmindIpcClient.getStats();
            
            return response !== undefined;
        } catch {
            return false;
        }
    }
}
