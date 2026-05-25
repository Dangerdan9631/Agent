import { InjectionToken } from "tsyringe";
import { LoggerFactory } from "overmind-sdk/logging";

export const LoggerFactoryToken: InjectionToken<LoggerFactory> = Symbol.for('Overmind.LoggerFactory');
