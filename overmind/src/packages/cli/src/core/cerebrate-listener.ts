import {
    getOvermindPipePath,
} from "overmind-api";
import { IpcClient, IpcClientError } from "./ipc-client";
import { LoggerFactoryToken, type Logger, type LoggerFactory } from "../logging";
import { inject, injectable } from "tsyringe";

@injectable()
export class CerebrateListener {
    private readonly logger: Logger;

    constructor(
        @inject(LoggerFactoryToken) loggerFactory: LoggerFactory
    ) {
        this.logger = loggerFactory.create('CerebrateListener');
    }

    async attach(
        configDir: string,
        name: string,
        onReceive: (line: string) => void,
        onError: (error: IpcClientError) => void,
        onClose: () => void,
    ): Promise<() => void> {
        return await new Promise<() => void>((resolve, reject) => {
            const pipePath = getOvermindPipePath(configDir);
            const client = new IpcClient(
                pipePath,
                {
                    onConnect: () => {
                        client.send(JSON.stringify({ method: 'cerebrate.attach', params: { name } }));
                    },
                    onReceive: (data) => {
                        try {
                            const message = JSON.parse(data) as { method?: string; ack?: boolean; type?: string; line?: string };
                            if (message.method === 'cerebrate.attach' && message.ack === true) {
                                // Ack received — connection established, ignore.
                            } else if (message.type === 'output' && typeof message.line === 'string') {
                                onReceive(message.line);
                            } else {
                                onError({ type: 'service_error', message: `Invalid response received: ${data}` });
                                client.disconnect();
                            }
                        } catch (error) {
                            onError({ type: 'service_error', message: `Invalid response received: ${error}` });
                        }
                    },
                    onError: (error) => {
                        onError(error);
                    },
                    onDisconnect: () => {
                        onClose();
                    },
                },
                this.logger);
            
            resolve(() => { client.disconnect(); });
        });
    }
}
