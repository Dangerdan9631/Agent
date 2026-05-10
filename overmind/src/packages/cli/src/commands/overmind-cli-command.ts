import { Command } from 'commander';
import { InjectionToken } from 'tsyringe';

export const OvermindCliCommandToken: InjectionToken<OvermindCliCommand> =
  Symbol.for('Overmind.OvermindCliCommand');

export interface OvermindCliCommand {
  register(program: Command): void;
}
