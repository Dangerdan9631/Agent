import { OvermindConfigOptions } from '@overmind-sdk/config';
import { InjectionToken } from 'tsyringe';

export const OvermindConfigOptionsToken: InjectionToken<OvermindConfigOptions> =
    Symbol.for('Overmind.OvermindConfigOptions');