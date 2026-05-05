import path from 'node:path';

export const DEFAULT_PIPE_NAME = 'overmind-service';

export function getDefaultOvermindPipePath(pipeName = DEFAULT_PIPE_NAME): string {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\${pipeName}`;
  }

  return path.join('/tmp', `${pipeName}.sock`);
}