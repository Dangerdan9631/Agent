import type { OvermindCliCommand } from '@overmind-cli/commands/overmind-cli-command';
import { InjectionToken } from "tsyringe";

export const OvermindCliCommandToken: InjectionToken<OvermindCliCommand> =
    Symbol.for('Overmind.OvermindCliCommand');