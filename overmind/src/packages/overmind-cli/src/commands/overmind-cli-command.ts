import { Command } from "commander";

export interface OvermindCliCommand {
    register(program: Command): void;
}
