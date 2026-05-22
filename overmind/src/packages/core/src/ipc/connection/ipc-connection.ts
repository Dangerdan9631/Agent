import net from 'node:net';
import { IpcConnectionError } from './ipc-connection-error';
import type { Logger, LoggerFactory } from '../../logging/index.js';

export enum IpcConnectionState {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    Error = 'error',
    Closed = 'closed',
}

export interface IpcConnectionListener {
    onConnect: (connection: IpcConnection) => void;
    onReceive: (connection: IpcConnection, data: string) => void;
    onError: (connection: IpcConnection, error: IpcConnectionError) => void;
    onDisconnect: (connection: IpcConnection) => void;
}

export class IpcConnection {
    private state: IpcConnectionState = IpcConnectionState.Disconnected;
    private buffer: string = '';

    get State(): IpcConnectionState {
        return this.state;
    }

    get Path(): string {
        return this.socket.address().toString();
    }

    constructor(
        private readonly socket: net.Socket,
        private readonly listener: IpcConnectionListener,
        private readonly logger: Logger
    ) {
        this.socket.setEncoding('utf8');
        this.socket.once('connect', () => this.handleConnect());
        this.socket.on('data', (chunk) => this.handleReceive(chunk));
        this.socket.once('error', (error) => {
            this.handleError({
                type: 'remote_error',
                message: error.message,
                error: error
            })
        });
        this.socket.once('end', () => {
            this.handleError({ type: 'disconnected' });
        });
        this.socket.once('close', () => this.handleDisconnect());
        this.socket.once('timeout', () => {
            this.handleError({ type: 'timeout' });
            this.socket.destroy();
        });

        // Accepted server sockets are already open and will never emit 'connect'.
        if (this.socket.pending) {
            this.state = IpcConnectionState.Connecting;
        } else {
            this.state = IpcConnectionState.Connected;
            queueMicrotask(() => {
                this.logger.debug('Connected');
                this.listener.onConnect(this);
            });
        }
    }

    disconnect(): void {
        this.logger.debug('Disconnect');
        this.socket.end();
    }

    send(message: string): void {
        this.logger.debug('Send:', message);
        this.socket.write(message.trimEnd() + '\n');
    }

    async awaitConnection(timeoutMs: number): Promise<boolean> {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            if (this.state === IpcConnectionState.Connected) {
                this.logger.debug('Awaiting connection complete');
                return true;
            }

            this.logger.debug('Awaiting connection: ', startedAt - Date.now(), 'ms remaining');
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.logger.debug('Awaiting connection failed after', timeoutMs, 'ms');
        return false;
    }

    private handleConnect(): void {
        if (this.state !== IpcConnectionState.Connecting) {
            this.logger.warn('Handling connect from invalid state', this.state);
            return;
        }

        this.logger.debug('Connected');
        this.state = IpcConnectionState.Connected;
        this.listener.onConnect(this);
    }

    private handleReceive(chunk: string | Buffer<ArrayBuffer>): void {
        if (this.state !== IpcConnectionState.Connected) {
            this.logger.warn('Handling receive from invalid state', this.state);
            return;
        }

        this.logger.debug('received chunk:', chunk);
        this.buffer += chunk;

        let newlineIdx: number;
        while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
            const rawLine = this.buffer.slice(0, newlineIdx);
            this.buffer = this.buffer.slice(newlineIdx + 1);

            const trimmed = rawLine.trimEnd();
            if (!trimmed) {
                continue;
            }

            this.logger.debug('receive message complete');
            this.listener.onReceive(this, trimmed);
        }
    }

    private handleError(error: IpcConnectionError): void {
        this.logger.debug('Error:', JSON.stringify(error));
        this.state = IpcConnectionState.Error;
        this.listener.onError(this, error);
    }

    private handleDisconnect(): void {
        if (this.state !== IpcConnectionState.Error) {
            this.logger.warn('Handling disconnect from invalid state', this.state);
            this.state = IpcConnectionState.Closed;
        }

        this.logger.debug('Disconnected');
        this.listener.onDisconnect(this);
    }
}

export function createIpcClientConnection(pipePath: string, listener: IpcConnectionListener, loggerFactory: LoggerFactory): IpcConnection {
    const socket = net.createConnection(pipePath);
    return new IpcConnection(socket, listener, loggerFactory.create('IpcClient'));
}