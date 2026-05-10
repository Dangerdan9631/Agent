import { InjectionToken } from "tsyringe";

export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3
}

export const LoggerFactoryToken: InjectionToken<LoggerFactory> = Symbol.for('Overmind.LoggerFactory');

export interface LoggerFactory {
    logLevel(level: LogLevel): LoggerFactory;
    create(category: string): Logger;
}

export interface Logger extends LoggerFactory {
    debug(...args: unknown[]): void
    info(...args: unknown[]): void
    warn(...args: unknown[]): void
    error(...args: unknown[]): void
}


