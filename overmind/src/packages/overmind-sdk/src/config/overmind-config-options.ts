import crypto from 'node:crypto';
import path from 'node:path';

import { missingConfigDirError } from "@overmind-sdk/api";

const DEFAULT_PIPE_NAME = 'overmind';

export interface OvermindConfigOptions {
    configDir?: string;
    resolvedConfigDir: string;
    instanceName: string;
    instanceHash: string;
    pipePath: string;
}

export function createConfigOptions(configDir: string | undefined): OvermindConfigOptions {
    const resolvedConfigDir = resolveConfigDir(configDir);
    const instanceName = path.basename(resolvedConfigDir);
    const instanceHash = getInstanceHash(resolvedConfigDir);
    const pipePath = getOvermindPipePath(instanceName, instanceHash);
    return {
        configDir,
        resolvedConfigDir,
        instanceName,
        instanceHash,
        pipePath,
    };
};

function resolveConfigDir(configDir: string | undefined): string {
    const explicitConfigDir = configDir?.trim();
    if (explicitConfigDir && explicitConfigDir.length > 0) {
        return path.resolve(explicitConfigDir);
    }

    const envConfigDir = process.env['OVERMIND_CONFIG_DIR']?.trim();
    if (envConfigDir && envConfigDir.length > 0) {
        return path.resolve(envConfigDir);
    }

    throw missingConfigDirError();
};

function getInstanceHash(resolvedConfigDir: string): string {
    return crypto.createHash('sha1')
        .update(resolvedConfigDir)
        .digest('hex')
        .slice(0, 8);
};

function getOvermindPipePath(instanceName: string, instanceHash: string): string {
    const pipeName = `${DEFAULT_PIPE_NAME}-${instanceName}-${instanceHash}`;
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\${pipeName}`;
    }

    return path.join('/tmp', `${pipeName}.sock`);
};