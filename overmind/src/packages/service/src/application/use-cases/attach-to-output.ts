import type { AttachEventTerminate, AttachRequest, AttachServerEventSink } from 'overmind-api';
import { AttachError } from 'overmind-api';
import type { Logger } from 'overmind-core';
import type { OutputSink } from '../ports/output-sink.js';

export class AttachToOutputUseCase {
  constructor(
    private readonly outputSink: OutputSink,
    private readonly logger: Logger,
  ) {}

  async execute(
    request: AttachRequest,
    serverEvents: AttachServerEventSink,
    onDisconnect: (disconnect: () => void) => void,
    onTerminate: (terminate: (event: AttachEventTerminate) => Promise<void>) => void = () => undefined,
  ): Promise<void> {
    const streamName = request.name;

    try {
      let closed = false;
      const unsubscribe = this.outputSink.subscribe((event) => {
        void serverEvents.output({
          name: streamName,
          timestamp: event.timestamp.valueOf(),
          data: event.line,
        });
      }, request.historyPlaybackSize, streamName);

      const closeStream = () => {
        if (closed) {
          return;
        }

        closed = true;
        this.logger.info('attach stream closed', streamName ?? 'global');
        unsubscribe();
      };

      onDisconnect(closeStream);
      onTerminate(async (event) => {
        closeStream();
        await serverEvents.terminate(event);
      });

      await serverEvents.attached({ name: streamName });
    } catch (error) {
      this.logger.error('attach failed', error);
      throw new AttachError(error instanceof Error ? error.message : 'Unknown attach error.');
    }
  }
}
