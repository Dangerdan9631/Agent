import { BufferedLoggerFactory } from 'overmind-sdk/logging';
import { container, DependencyContainer } from "tsyringe";
import { LoggerFactoryToken } from './logger-factory-token';

export function buildServiceContainer(): DependencyContainer {
    const serviceContainer = container.createChildContainer();

    serviceContainer.register(LoggerFactoryToken, { useClass: BufferedLoggerFactory });

    return serviceContainer;
}