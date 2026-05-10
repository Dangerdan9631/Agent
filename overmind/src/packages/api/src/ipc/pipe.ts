import crypto from 'node:crypto';
import path from 'node:path';

const DEFAULT_PIPE_NAME = 'overmind';

export function getOvermindPipePath(configDir: string): string {
    const configPath = path.resolve(configDir);
    const dir = path.basename(configPath);
    const hash = crypto.createHash('sha1')
        .update(path.resolve(configDir))
        .digest('hex')
        .slice(0, 8);
    const pipeName = `${DEFAULT_PIPE_NAME}-${dir}-${hash}`;
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\${pipeName}`;
    }

    return path.join('/tmp', `${pipeName}.sock`);
}