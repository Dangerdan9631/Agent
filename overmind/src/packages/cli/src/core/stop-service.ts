import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectable } from 'tsyringe';
import { resolveCliConfigDir } from 'overmind-core';

type WindowsProcess = {
    commandLine: string;
    processId: number;
};

@injectable()
export class StopServiceHelper {
    killAllServiceProcesses(configDir: string | undefined): number {
        const serviceEntryPath = fileURLToPath(import.meta.resolve('overmind-service'));
        const serviceBinPath = path.resolve(path.dirname(serviceEntryPath), 'bin.js');
        const resolvedConfigDir = resolveCliConfigDir(configDir);
        const rawConfigDir = configDir?.trim() || resolvedConfigDir;

        if (process.platform === 'win32') {
            const matchingProcesses = this.getWindowsNodeProcesses().filter((processInfo) => {
                const normalizedCommand = processInfo.commandLine.toLowerCase();
                return normalizedCommand.includes(serviceBinPath.toLowerCase())
                    && (
                        normalizedCommand.includes(rawConfigDir.toLowerCase())
                        || normalizedCommand.includes(resolvedConfigDir.toLowerCase())
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