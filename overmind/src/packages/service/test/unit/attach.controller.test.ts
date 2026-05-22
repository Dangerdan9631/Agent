import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { AttachController } from '../../src/controllers/attach.controller.js';
import { BufferedLogBuffer } from '../../src/logging/buffered-logger.js';
import { BufferedLoggerFactory } from '../../src/logging/buffered-logger-factory.js';
import { LogLevel } from 'overmind-core';

describe('AttachController', () => {
  it('replays buffered history and disconnects cleanly', async () => {
    const streamName = 'alpha';
    const buffer = new BufferedLogBuffer();
    const loggerFactory = new BufferedLoggerFactory(buffer).logLevel(LogLevel.Debug);
    const controller = new AttachController(buffer, loggerFactory);
    const packets: Array<{ type: string; data: unknown }> = [];

    buffer.append({
      timestamp: new Date(1_000),
      level: LogLevel.Info,
      category: 'test',
      line: 'before-attach',
    }, streamName);

    const response = await controller.execute(
      { name: streamName, historyPlaybackSize: 1 },
      {
        onError: () => undefined,
        listen: async () => undefined,
        attached: (packet) => packets.push({ type: 'ack', data: packet }),
        send: (packet) => packets.push({ type: 'output', data: packet }),
        terminate: (packet) => packets.push({ type: 'terminate', data: packet }),
        onTerminate: () => undefined,
      },
    );

    expect(response.success).toBe(true);
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

    if (!response.success) {
      return;
    }

    response.client.disconnect();
    buffer.append({
      timestamp: new Date(2_000),
      level: LogLevel.Info,
      category: 'test',
      line: 'after-disconnect',
    }, streamName);

    expect(packets).toHaveLength(2);
  });
});