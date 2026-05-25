import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { AttachToOutputUseCase } from '../../src/application/use-cases/attach-to-output.js';
import { BufferedLogBuffer } from '../../src/logging/buffered-logger.js';
import { BufferedLoggerFactory } from '../../src/logging/buffered-logger-factory.js';
import { LogLevel } from 'overmind-core';

describe('AttachToOutputUseCase', () => {
  it('replays buffered history and terminates cleanly', async () => {
    const streamName = 'alpha';
    const buffer = new BufferedLogBuffer();
    const loggerFactory = new BufferedLoggerFactory(buffer).logLevel(LogLevel.Debug);
    const useCase = new AttachToOutputUseCase(buffer, loggerFactory.create('AttachToOutputUseCase'));
    const packets: Array<{ type: string; data: unknown }> = [];
    let terminate: ((packet: { name: string | undefined }) => Promise<void>) | undefined;

    buffer.append({
      timestamp: new Date(1_000),
      level: LogLevel.Info,
      category: 'test',
      line: 'before-attach',
    }, streamName);

    await useCase.execute(
      { name: streamName, historyPlaybackSize: 1 },
      {
        attached: (packet) => packets.push({ type: 'ack', data: packet }),
        output: (packet) => packets.push({ type: 'output', data: packet }),
        terminate: (packet) => packets.push({ type: 'terminate', data: packet }),
      },
      () => undefined,
      (onTerminate) => {
        terminate = onTerminate;
      },
    );

    expect(packets).toEqual([
      {
        type: 'output',
        data: {
          name: streamName,
          timestamp: 1_000,
          data: 'before-attach',
        },
      },
      {
        type: 'ack',
        data: {
          name: streamName,
        },
      },
    ]);

    expect(terminate).toBeTypeOf('function');
    await terminate?.({ name: streamName });

    buffer.append({
      timestamp: new Date(2_000),
      level: LogLevel.Info,
      category: 'test',
      line: 'after-disconnect',
    }, streamName);

    expect(packets).toEqual([
      {
        type: 'output',
        data: {
          name: streamName,
          timestamp: 1_000,
          data: 'before-attach',
        },
      },
      {
        type: 'ack',
        data: {
          name: streamName,
        },
      },
      {
        type: 'terminate',
        data: {
          name: streamName,
        },
      },
    ]);
  });
});