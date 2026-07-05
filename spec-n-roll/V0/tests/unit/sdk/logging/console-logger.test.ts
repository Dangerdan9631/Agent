import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConsoleLogger } from '../../../../src/sdk/logging/console-logger.js';
import { ConsoleLoggerFactory } from '../../../../src/sdk/logging/console-logger-factory.js';
import { LogLevel } from '../../../../src/sdk/logging/log-level.js';

describe('ConsoleLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('suppresses debug output when the minimum level is Info', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new ConsoleLogger(LogLevel.Info, 'test');

    logger.debug('hidden');

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('writes decorated info lines with category framing', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new ConsoleLogger(LogLevel.Info, 'WorkflowStateReadCommand');

    logger.info('hello');

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const args = infoSpy.mock.calls[0] ?? [];
    expect(args.some((arg) => String(arg).includes('[INFO]'))).toBe(true);
    expect(args.some((arg) => String(arg).includes('WorkflowStateReadCommand'))).toBe(true);
    expect(args.some((arg) => String(arg).includes('hello'))).toBe(true);
  });

  it('writes plain output directly without framing', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new ConsoleLogger(LogLevel.Info, 'plain', true);

    logger.info('{"ok":true}');
    logger.error('failed');

    expect(logSpy).toHaveBeenCalledWith('{"ok":true}');
    expect(errorSpy).toHaveBeenCalledWith('failed');
  });

  it('nests child categories and propagates log level changes', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const factory = new ConsoleLoggerFactory();
    const parent = factory.create('parent');
    const child = parent.create('child');

    parent.logLevel(LogLevel.Warn);
    parent.info('parent-hidden');
    child.info('child-hidden');
    child.warn('child-visible');

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const args = infoSpy.mock.calls[0] ?? [];
    expect(args.some((arg) => String(arg).includes('parent:child'))).toBe(true);
    expect(args.some((arg) => String(arg).includes('child-visible'))).toBe(true);
  });
});
