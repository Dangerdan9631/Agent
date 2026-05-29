import { once } from 'node:events';
import net from 'node:net';

import { OvermindIpcApi } from 'overmind-sdk/ipc/overmind-ipc-api';
import { OvermindConfigOptions } from 'overmind-sdk/config';
import { NodeIo, RPCChannel } from 'kkrpc';
import { injectable } from "tsyringe";

@injectable()
export class OvermindIpcServer {
    private server: net.Server | undefined;
    private serverClosed: Promise<void> | undefined;

    async run(overmindService: OvermindIpcApi, configOptions: OvermindConfigOptions): Promise<number> {
        if (this.server) {
            throw new Error('OvermindService is already running.');
        }

        try {
            const server = net.createServer((socket) => {
                const io = new NodeIo(socket, socket);
                new RPCChannel<OvermindIpcApi, Record<string, never>>(io, { expose: overmindService });
            });

            this.server = server;
            this.serverClosed = once(server, 'close').then(() => undefined);

            await this.listen(server, configOptions.pipePath);
            await this.serverClosed;
            return 0;
        } catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
            this.server = undefined;
            this.serverClosed = undefined;
            return 1;
        }
    }

    stop(): void {
        if (!this.server) {
            throw new Error('OvermindService is not running.');
        }
        this.server.close();
    }

    private async listen(server: net.Server, pipePath: string): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const handleError = (error: Error) => {
                server.off('listening', handleListening);
                reject(error);
            };

            const handleListening = () => {
                server.off('error', handleError);
                resolve();
            };

            server.once('error', handleError);
            server.once('listening', handleListening);
            server.listen(pipePath);
        });
    }
}