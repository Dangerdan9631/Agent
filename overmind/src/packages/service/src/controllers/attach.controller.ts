import type {
  AttachError,
  AttachRequest,
  AttachServerChannel,
  OvermindStreamResponse,
} from 'overmind-api';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from 'overmind-core';
import { inject, injectable } from 'tsyringe';
import { BufferedLogBuffer } from '../logging/index.js';

type AttachStreamHandle = {
  disconnect: () => void;
};

@injectable()
export class AttachController {
  private readonly logger: Logger;

  constructor(
    private readonly logBuffer: BufferedLogBuffer,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('AttachController');
  }

  async execute(
    request: AttachRequest,
    channel: AttachServerChannel,
  ): Promise<OvermindStreamResponse<AttachStreamHandle, AttachError>> {
    const streamName = request.name;

    try {
      const unsubscribe = this.logBuffer.subscribe((event) => {
        channel.send({
          name: streamName,
          timestamp: event.timestamp.valueOf(),
          data: event.line,
        });
      }, request.historyPlaybackSize, streamName);

      channel.attached({ name: streamName });

      return {
        success: true,
        client: {
          disconnect: () => {
            this.logger.info('attach stream closed', streamName ?? 'global');
            unsubscribe();
          },
        },
      };
    } catch (error) {
      this.logger.error('attach failed', error);
      return {
        success: false,
        error: { errorMessage: error instanceof Error ? error.message : 'Unknown attach error.' },
      };
    }
  }
}