import { container, DependencyContainer } from "tsyringe";
import { OvermindApiFactory } from "overmind-sdk";
import { ConsoleLoggerFactory } from 'overmind-sdk/logging';
import {
    StartCommand,
    SendCommand,
    ShutdownCommand,
    StartCerebrateCommand,
    StatsCommand,
    StopCerebrateCommand,
} from "@overmind-cli/commands";
import { LoggerFactoryToken } from "./logger-factory-token";
import { OvermindCliCommandToken } from "./overmind-cli-command-token";

export function buildCliContainer(): DependencyContainer {
    const cliContainer = container.createChildContainer();

    cliContainer.register(LoggerFactoryToken, { useClass: ConsoleLoggerFactory });
    cliContainer.register(OvermindApiFactory, { useClass: OvermindApiFactory });
    cliContainer.register(OvermindCliCommandToken, { useClass: StartCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: ShutdownCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: StatsCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: StartCerebrateCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: StopCerebrateCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: SendCommand });
    // cliContainer.register(OvermindCliCommandToken, { useClass: AttachCommand });

    return cliContainer;
}