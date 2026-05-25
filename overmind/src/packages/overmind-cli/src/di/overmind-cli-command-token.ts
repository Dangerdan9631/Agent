import { InjectionToken } from "tsyringe";
import { OvermindCliCommand } from "@overmind-cli/commands";

export const OvermindCliCommandToken: InjectionToken<OvermindCliCommand> =
    Symbol.for('Overmind.OvermindCliCommand');