import type { LoggerFactory } from '@overmind-sdk/logging';
import { InjectionToken } from 'tsyringe';

export const LoggerFactoryToken: InjectionToken<LoggerFactory> = Symbol.for('Overmind.LoggerFactory');
