import { AttachCommand } from '@overmind-cli/commands/attach';
import { SendCommand } from '@overmind-cli/commands/send';
import { ShutdownCommand } from '@overmind-cli/commands/shutdown';
import { StartCommand } from '@overmind-cli/commands/start';
import { StartCerebrateCommand } from '@overmind-cli/commands/start-cerebrate';
import { StatsCommand } from '@overmind-cli/commands/stats';
import { StopCerebrateCommand } from '@overmind-cli/commands/stop-cerebrate';
import { OvermindApiFactory } from "overmind-sdk";
import { ConsoleLoggerFactory } from 'overmind-sdk/logging';
import { container, DependencyContainer } from "tsyringe";

import { LoggerFactoryToken } from "./logger-factory-token";
import { OvermindCliCommandToken } from "./overmind-cli-command-token";

export function buildCliContainer(): DependencyContainer {
    const cliContainer = container.createChildContainer();

    cliContainer.register(LoggerFactoryToken, { useClass: ConsoleLoggerFactory });
    cliContainer.register(OvermindApiFactory, { useClass: OvermindApiFactory });
    cliContainer.register(OvermindCliCommandToken, { useClass: AttachCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: StartCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: ShutdownCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: StatsCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: StartCerebrateCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: StopCerebrateCommand });
    cliContainer.register(OvermindCliCommandToken, { useClass: SendCommand });

    return cliContainer;
}