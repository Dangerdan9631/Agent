import { OvermindConfigOptions } from '@overmind-sdk/config';
import { ConsoleLoggerFactory } from '@overmind-sdk/logging';
import { OvermindApiHandler } from '@overmind-sdk/operations/overmind-api-handler';
import { container, DependencyContainer } from "tsyringe";

import { LoggerFactoryToken } from './logger-factory-token';
import { OvermindConfigOptionsToken } from './overmind-config-options-token';

export function buildSdkContainer(configOptions: OvermindConfigOptions): DependencyContainer {
    const sdkContainer = container.createChildContainer();

    sdkContainer.register(LoggerFactoryToken, { useClass: ConsoleLoggerFactory });
    sdkContainer.register(OvermindConfigOptionsToken, { useValue: configOptions });
    sdkContainer.register(OvermindApiHandler, { useClass: OvermindApiHandler });

    return sdkContainer;
}