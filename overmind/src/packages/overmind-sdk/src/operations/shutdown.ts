import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ShutdownRequest, ShutdownResponse } from '@overmind-sdk/api';
import type { OvermindConfigOptions } from "@overmind-sdk/config";
import { LoggerFactoryToken } from '@overmind-sdk/di/logger-factory-token';
import { OvermindConfigOptionsToken } from '@overmind-sdk/di/overmind-config-options-token';
import { OvermindIpcClient } from '@overmind-sdk/ipc/overmind-ipc-client';
import type { Logger, LoggerFactory } from '@overmind-sdk/logging';
import { inject, injectable } from 'tsyringe';

type WindowsProcess = {
    commandLine: string;
    processId: number;
};

@injectable()
export class ShutdownOperation {
    private readonly logger: Logger;

    constructor(
        private readonly overmindIpcClient: OvermindIpcClient,
        @inject(OvermindConfigOptionsToken) private readonly configOptions: OvermindConfigOptions,
        @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
    ) {
        this.logger = loggerFactory.create('OvermindApi:Shutdown');
    }

    async execute(_request: ShutdownRequest): Promise<ShutdownResponse> {

        if (_request.force !== true) {
            this.logger.info('Sending service shut down command:', this.configOptions.instanceName);
            return await this.overmindIpcClient.shutdown();
        } else {
            const count = this.forceKillAllProcesses();
            return { message: `Force shutdown complete. Killed ${count} process(es).` };
        }
    }

    private forceKillAllProcesses(): number {
        const serviceEntryPath = fileURLToPath(import.meta.resolve('overmind-service'));
        const serviceBinPath = path.resolve(path.dirname(serviceEntryPath), 'bin.js');
        const rawConfigDir = this.configOptions.configDir?.trim() || this.configOptions.resolvedConfigDir;

        this.logger.info('Shutting down service process:', this.configOptions.instanceName);
        this.logger.debug('  - service bin:', serviceBinPath);
        this.logger.debug('  - config:', this.configOptions.resolvedConfigDir);

        if (process.platform === 'win32') {
            const matchingProcesses = this.getWindowsNodeProcesses().filter((processInfo) => {
                const normalizedCommand = processInfo.commandLine.toLowerCase();
                return normalizedCommand.includes(serviceBinPath.toLowerCase())
                    && (
                        normalizedCommand.includes(rawConfigDir.toLowerCase())
                        || normalizedCommand.includes(this.configOptions.resolvedConfigDir.toLowerCase())
                    );
            });

            let killedCount = 0;
            for (const processInfo of matchingProcesses) {
                try {
                    execFileSync('taskkill', ['/F', '/PID', String(processInfo.processId)], { stdio: 'ignore' });
                    killedCount += 1;
                } catch {
                    // Process may already be gone.
                }
            }

            return killedCount;
        } else {
            const countOutput = execSync(`ps -eo pid=,args= | grep '${serviceBinPath}' | grep -F -- '${rawConfigDir}' | grep -v grep || true`).toString();
            const pids = countOutput
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((line) => line.split(/\s+/, 1)[0])
                .filter((pid) => /^\d+$/.test(pid));

            for (const pid of pids) {
                execSync(`kill -9 ${pid} || true`, { stdio: 'ignore' });
            }

            return pids.length;
        }
    }

    private getWindowsNodeProcesses(): WindowsProcess[] {
        try {
            const output = execFileSync('wmic', [
                'process',
                'where',
                "name='node.exe'",
                'get',
                'CommandLine,ProcessId',
                '/format:csv',
            ]).toString();

            return output
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0 && !line.startsWith('Node,CommandLine,ProcessId'))
                .map((line) => {
                    const parts = line.split(',');
                    const processId = parseInt(parts.at(-1) ?? '', 10);
                    const commandLine = parts.slice(1, -1).join(',').trim();
                    return {
                        commandLine,
                        processId,
                    };
                })
                .filter((processInfo) => Number.isInteger(processInfo.processId) && processInfo.commandLine.length > 0);
        } catch {
            return [];
        }
    }
}