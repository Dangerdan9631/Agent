import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { OvermindConfigOptions } from "@overmind-sdk/config";

export class StartOperation {
    async execute(configOptions: OvermindConfigOptions): Promise<void> {
        const serviceEntryPath = fileURLToPath(import.meta.resolve('overmind-service'));
        const serviceBinPath = path.resolve(path.dirname(serviceEntryPath), 'bin.js');

        const child = spawn(process.execPath, [serviceBinPath, configOptions.resolvedConfigDir], {
            detached: true,
            stdio: ['ignore', 'ignore', 'pipe'],
        });

        child.stderr?.on('data', (chunk: Buffer) => {
            process.stderr.write(chunk);
        });

        child.unref();

        await this.waitForService(configOptions.resolvedConfigDir);
    }

    private async waitForService(configDir: string): Promise<void> {
        const startedAt = Date.now();
        const timeoutMs = 5_000;

        while (Date.now() - startedAt < timeoutMs) {
            if (await this.isRunning(configDir)) {
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        throw new Error('Timed out waiting for service startup.');
    }

    private async isRunning(configDir: string): Promise<boolean> {
        return true;
    }
}