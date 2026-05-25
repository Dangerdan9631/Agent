import { OvermindCliCommand } from "@overmind-cli/commands";
import { InjectionToken } from "tsyringe";

export const OvermindCliCommandToken: InjectionToken<OvermindCliCommand> =
    Symbol.for('Overmind.OvermindCliCommand');