import net from 'node:net';
import { Logger, LoggerFactory } from '../logging';

export type IpcClientError = 
    { type: 'service_error'; message: string; error?: Error }
    | { type: 'timeout' }
    | { type: 'disconnected' }

export enum IpcClientState {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    Error = 'error',
    Closed = 'closed',
}

export interface IpcListener {
    onConnect: () => void;
    onReceive: (data: string) => void;
    onError: (error: IpcClientError) => void;
    onDisconnect: () => void;
}

export class IpcClient {
    private state: IpcClientState = IpcClientState.Disconnected;
    private socket: net.Socket;
    private buffer: string = '';
    private logger: Logger;
  
    constructor(
        private readonly pipePath: string,
        private readonly listener: IpcListener,
        loggerFactory: LoggerFactory
    ) {
        this.logger = loggerFactory.create('IpcClient');
        this.socket = net.createConnection(this.pipePath);
        this.socket.setEncoding('utf8');
        this.socket.once('connect', () => this.handleConnect());
        this.socket.on('data', (chunk) => this.handleReceive(chunk));
        this.socket.once('error', (error) => {
            this.handleError({
                type: 'service_error',
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
        this.state = IpcClientState.Connecting;
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
            if (this.state === IpcClientState.Connected) {
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
        if (this.state !== IpcClientState.Connecting) {
            this.logger.warn('Handling connect from invalid state', this.state);
            return;
        }

        this.logger.debug('Connected');
        this.state = IpcClientState.Connected;
        this.listener.onConnect();
    }
  
    private handleReceive(chunk: string | Buffer<ArrayBuffer>): void {
        if (this.state !== IpcClientState.Connected) {
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
            this.listener.onReceive(trimmed);
        }
    }
  
    private handleError(error: IpcClientError): void {
        this.logger.debug('Error:', JSON.stringify(error));
        this.state = IpcClientState.Error;
        this.listener.onError(error);
    }

    private handleDisconnect(): void {
        if (this.state !== IpcClientState.Error) {
            this.logger.warn('Handling disconnect from invalid state', this.state);
            this.state = IpcClientState.Closed;
        }

        this.logger.debug('Disconnected');
        this.listener.onDisconnect();
    }
}