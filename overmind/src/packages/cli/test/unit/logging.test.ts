import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLoggerFactory } from '../../src/logging/console-logger-factory.js';
import { LogLevel } from 'overmind-core';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConsoleLoggerFactory', () => {
  it('updates child loggers that still match the parent log level', () => {
    const factory = new ConsoleLoggerFactory().logLevel(LogLevel.Info) as ConsoleLoggerFactory;
    const parent = factory.create('parent');
    const child = parent.create('child');
    const output = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    factory.logLevel(LogLevel.Error);
    child.warn('hidden');
    child.error('shown');

    expect(output).toHaveBeenCalledTimes(1);
    expect(output.mock.calls[0]?.[1]).toBe('[EROR]');
  });

  it('does not overwrite a child logger level once it diverges', () => {
    const factory = new ConsoleLoggerFactory().logLevel(LogLevel.Info) as ConsoleLoggerFactory;
    const parent = factory.create('parent');
    const child = parent.create('child');
    const output = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    child.logLevel(LogLevel.Debug);
    parent.logLevel(LogLevel.Error);
    child.debug('still visible');

    expect(output).toHaveBeenCalledTimes(1);
    expect(output.mock.calls[0]?.[1]).toBe('[DEBG]');
  });
});