import 'reflect-metadata';

import { BufferedLogBuffer, BufferedLoggerFactory, LogLevel } from 'overmind-sdk/logging';
import { describe, expect, it } from 'vitest';

import { AttachToOutputUseCase } from '../../src/application/use-cases/attach-to-output.js';

describe('AttachToOutputUseCase', () => {
  it('replays named stream history and terminates cleanly', async () => {
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

    await terminate?.({ name: streamName });
    expect(packets.at(-1)).toEqual({
      type: 'terminate',
      data: {
        name: streamName,
      },
    });
  });

  it('attaches to the global buffer when no cerebrate name is provided', async () => {
    const buffer = new BufferedLogBuffer();
    const loggerFactory = new BufferedLoggerFactory(buffer).logLevel(LogLevel.Debug);
    const useCase = new AttachToOutputUseCase(buffer, loggerFactory.create('AttachToOutputUseCase'));
    const outputPackets: Array<{ name: string | undefined; data: string; timestamp: number }> = [];

    buffer.append({
      timestamp: new Date(2_000),
      level: LogLevel.Info,
      category: 'service',
      line: 'service-log-line',
    });

    await useCase.execute(
      { historyPlaybackSize: 5 },
      {
        attached: () => undefined,
        output: (packet) => outputPackets.push(packet),
        terminate: () => undefined,
      },
      () => undefined,
    );

    expect(outputPackets).toEqual([
      {
        name: undefined,
        timestamp: 2_000,
        data: 'service-log-line',
      },
    ]);
  });
});
