import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Logger, type LoggerFactory,LoggerFactoryToken, resolveCliConfigDir } from 'overmind-core';
import { inject, injectable } from 'tsyringe';

import { OvermindIpcClientFactory } from './overmind-ipc-client-factory';

@injectable()
export class StartServiceHelper {
    private readonly logger: Logger;

    constructor(
        private readonly clientFactory: OvermindIpcClientFactory,
        @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
    ) {
        this.logger = loggerFactory.create('StartServiceHelper');
    }

    async startService(configDir: string | undefined): Promise<void> {
        const resolvedConfigDir = resolveCliConfigDir(configDir);
        const serviceEntryPath = fileURLToPath(import.meta.resolve('overmind-service'));
        const serviceBinPath = path.resolve(path.dirname(serviceEntryPath), 'bin.js');

        this.logger.info('Starting service process:', serviceBinPath);
        this.logger.info('  - config:', resolvedConfigDir);
        const child = spawn(process.execPath, [serviceBinPath, resolvedConfigDir], {
            detached: true,
            stdio: ['ignore', 'ignore', 'pipe'],
        });

        child.stderr?.on('data', (chunk: Buffer) => {
            process.stderr.write(chunk);
        });

        child.unref();

        this.logger.debug('Waiting for service startup.');
        await this.waitForService(resolvedConfigDir);
    }

    private async isRunning(configDir: string): Promise<boolean> {
        try {
            const client = this.clientFactory.getOvermindClient(configDir);
            const response = await client.getServiceStats({});
            return response.success;
        } catch {
            return false;
        }
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
}