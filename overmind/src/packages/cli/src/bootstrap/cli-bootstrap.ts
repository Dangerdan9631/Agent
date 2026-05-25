import { container, type DependencyContainer } from 'tsyringe';
import { LoggerFactoryToken } from 'overmind-core';
import {
  AttachCommand,
  OvermindCliCommandToken,
  SendCommand,
  ShutdownCommand,
  StartCerebrateCommand,
  StartCommand,
  StatsCommand,
  StopCerebrateCommand,
} from '../commands/index.js';
import { ConsoleLoggerFactory } from '../logging/console-logger-factory.js';

export function buildCliContainer(): DependencyContainer {
  const cliContainer = container.createChildContainer();

  cliContainer.register(LoggerFactoryToken, { useClass: ConsoleLoggerFactory });
  cliContainer.register(OvermindCliCommandToken, { useClass: AttachCommand });
  cliContainer.register(OvermindCliCommandToken, { useClass: ShutdownCommand });
  cliContainer.register(OvermindCliCommandToken, { useClass: SendCommand });
  cliContainer.register(OvermindCliCommandToken, { useClass: StartCommand });
  cliContainer.register(OvermindCliCommandToken, { useClass: StartCerebrateCommand });
  cliContainer.register(OvermindCliCommandToken, { useClass: StopCerebrateCommand });
  cliContainer.register(OvermindCliCommandToken, { useClass: StatsCommand });

  return cliContainer;
}
