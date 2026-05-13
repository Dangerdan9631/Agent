import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { BufferedLogBuffer } from '../../src/logging/buffered-logger.js';
import { BufferedLoggerFactory } from '../../src/logging/buffered-logger-factory.js';
import { LogLevel } from '../../src/logging/logger.js';

describe('BufferedLoggerFactory', () => {
  it('updates child loggers that still match the parent log level', () => {
    const buffer = new BufferedLogBuffer();
    const factory = new BufferedLoggerFactory(buffer).logLevel(LogLevel.Info) as BufferedLoggerFactory;
    const parent = factory.create('parent');
    const child = parent.create('child');

    factory.logLevel(LogLevel.Error);
    child.warn('hidden');
    child.error('shown');

    expect(buffer.getBuffer().events).toHaveLength(1);
    expect(buffer.getBuffer().events[0]).toMatchObject({
      category: 'parent:child',
      level: LogLevel.Error,
      line: 'shown',
    });
  });

  it('does not overwrite a child logger level once it diverges', () => {
    const buffer = new BufferedLogBuffer();
    const factory = new BufferedLoggerFactory(buffer).logLevel(LogLevel.Info) as BufferedLoggerFactory;
    const parent = factory.create('parent');
    const child = parent.create('child');

    child.logLevel(LogLevel.Debug);
    parent.logLevel(LogLevel.Error);
    child.debug('still visible');

    expect(buffer.getBuffer().events).toHaveLength(1);
    expect(buffer.getBuffer().events[0]).toMatchObject({
      category: 'parent:child',
      level: LogLevel.Debug,
      line: 'still visible',
    });
  });
});