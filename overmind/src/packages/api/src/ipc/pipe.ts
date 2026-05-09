import crypto from 'node:crypto';
import path from 'node:path';

const DEFAULT_PIPE_NAME = 'overmind-service';

export function getOvermindPipePath(configDir: string): string {
    const hash = crypto.createHash('sha1')
        .update(path.resolve(configDir))
        .digest('hex')
        .slice(0, 8);
    const pipeName = `${DEFAULT_PIPE_NAME}-${hash}`;
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\${pipeName}`;
    }

    return path.join('/tmp', `${pipeName}.sock`);
}