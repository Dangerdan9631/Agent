import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { StartRequest, StartResponse } from '@overmind-sdk/api';
import type { OvermindConfigOptions } from "@overmind-sdk/config";
import { LoggerFactoryToken } from '@overmind-sdk/di/logger-factory-token';
import { OvermindConfigOptionsToken } from '@overmind-sdk/di/overmind-config-options-token';
import type { Logger, LoggerFactory } from '@overmind-sdk/logging';
import { inject, injectable } from 'tsyringe';

@injectable()
export class StartOperation {
    private readonly logger: Logger;

    constructor(
        @inject(OvermindConfigOptionsToken) private readonly configOptions: OvermindConfigOptions,
        @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
    ) {
        this.logger = loggerFactory.create('OvermindApi:Start');
    }

    async execute(_request: StartRequest): Promise<StartResponse> {
        const serviceEntryPath = fileURLToPath(import.meta.resolve('overmind-service'));
        const serviceBinPath = path.resolve(path.dirname(serviceEntryPath), 'bin.js');

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
        await this.waitForService(this.configOptions.resolvedConfigDir);

        return { message: 'Service started successfully.' };
    }

    private async waitForService(configDir: string): Promise<void> {
        const startedAt = Date.now();
        const timeoutMs = 5_000;

        while (Date.now() - startedAt < timeoutMs) {
            if (await this.isRunning(configDir)) {
                return;
            }

            this.logger.debug('Waiting for service startup: ', Date.now() - startedAt, 'ms elapsed');
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        throw new Error('Timed out waiting for service startup.');
    }

    private async isRunning(_configDir: string): Promise<boolean> {
        return true;
    }
}