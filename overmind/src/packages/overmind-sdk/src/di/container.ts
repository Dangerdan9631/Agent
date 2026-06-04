import { OvermindConfigOptions } from '@overmind-sdk/config';
import { OvermindIpcClient } from '@overmind-sdk/ipc/overmind-ipc-client';
import { ConsoleLoggerFactory } from '@overmind-sdk/logging';
import { OvermindApiHandler } from '@overmind-sdk/operations/overmind-api-handler';
import { ShutdownOperation } from '@overmind-sdk/operations/shutdown';
import { StartOperation } from '@overmind-sdk/operations/start';
import { container, DependencyContainer } from "tsyringe";

import { LoggerFactoryToken } from './logger-factory-token';
import { OvermindConfigOptionsToken } from './overmind-config-options-token';

export function buildSdkContainer(configOptions: OvermindConfigOptions): DependencyContainer {
    const sdkContainer = container.createChildContainer();

    sdkContainer.register(LoggerFactoryToken, { useClass: ConsoleLoggerFactory });
    sdkContainer.register(OvermindConfigOptionsToken, { useValue: configOptions });
    sdkContainer.register(OvermindIpcClient, { useClass: OvermindIpcClient });
    sdkContainer.register(StartOperation, { useClass: StartOperation });
    sdkContainer.register(ShutdownOperation, { useClass: ShutdownOperation });
    sdkContainer.register(OvermindApiHandler, { useClass: OvermindApiHandler });

    return sdkContainer;
}
