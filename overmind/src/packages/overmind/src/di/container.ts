import { BufferedLoggerFactory } from 'overmind-sdk/logging';
import { container, DependencyContainer } from "tsyringe";

import { OvermindConnectionHandler } from '../service/overmind-connection-handler.js';
import { OvermindIpcServer } from '../service/overmind-ipc-server.js';
import { OvermindService } from '../service/overmind-service.js';
import { LoggerFactoryToken } from './logger-factory-token';

export function buildServiceContainer(): DependencyContainer {
    const serviceContainer = container.createChildContainer();

    serviceContainer.register(LoggerFactoryToken, { useClass: BufferedLoggerFactory });
    serviceContainer.registerSingleton(OvermindIpcServer, OvermindIpcServer);
    serviceContainer.registerSingleton(OvermindService, OvermindService);
    serviceContainer.registerSingleton(OvermindConnectionHandler, OvermindConnectionHandler);

    return serviceContainer;
}
