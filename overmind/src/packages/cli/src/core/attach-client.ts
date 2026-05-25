import type net from 'node:net';

import type {
  AttachClient,
  AttachErrorListener,
  AttachEventAttached,
  AttachEventListener,
  AttachEventOutput,
  AttachEventTerminate,
  AttachRequest,
  AttachServerEventSink,
  OvermindRpcApi,
} from 'overmind-api';

type AttachRemoteApi = Pick<OvermindRpcApi, 'attach' | 'terminateAttach'>;

export class AttachStreamClient implements AttachClient {
  private readonly attachedListeners = new Set<AttachEventListener<AttachEventAttached>>();
  private readonly outputListeners = new Set<AttachEventListener<AttachEventOutput>>();
  private readonly terminateListeners = new Set<AttachEventListener<AttachEventTerminate>>();
  private readonly errorListeners = new Set<AttachErrorListener>();
  private listenPromise: Promise<void> | undefined;
  private closePromise: Promise<void> | undefined;

  constructor(
    private readonly request: AttachRequest,
    private readonly remoteApi: AttachRemoteApi,
    private readonly socket: net.Socket,
    private readonly closeConnection: () => Promise<void>,
  ) {}

  onAttached(listener: AttachEventListener<AttachEventAttached>): () => void {
    return this.addListener(this.attachedListeners, listener);
  }

  onOutput(listener: AttachEventListener<AttachEventOutput>): () => void {
    return this.addListener(this.outputListeners, listener);
  }

  onTerminate(listener: AttachEventListener<AttachEventTerminate>): () => void {
    return this.addListener(this.terminateListeners, listener);
  }

  onError(listener: AttachErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  async terminate(event: AttachEventTerminate): Promise<void> {
    if (this.socket.destroyed) {
      return;
    }

    if (!this.listenPromise) {
      await this.safeClose();
      return;
    }

    try {
      await this.remoteApi.terminateAttach(event);
    } catch (error) {
      await this.emitError(this.normalizeError(error));
    }

    await this.listenPromise;
  }

  listen(): Promise<void> {
    this.listenPromise ??= this.listenInternal();
    return this.listenPromise;
  }

  private addListener<TEvent>(listeners: Set<AttachEventListener<TEvent>>, listener: AttachEventListener<TEvent>): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  private async listenInternal(): Promise<void> {
    const onSocketError = (error: Error) => {
      void this.emitError(error);
    };
    const socketClosed = new Promise<{ kind: 'socket-closed' }>((resolve) => {
      this.socket.once('close', () => resolve({ kind: 'socket-closed' }));
    });

    this.socket.on('error', onSocketError);

    try {
      const attachOutcome = this.remoteApi
        .attach(this.request, this.createServerEventSink())
        .then(() => ({ kind: 'remote-complete' as const }))
        .catch((error) => ({ kind: 'remote-error' as const, error: this.normalizeError(error) }));

      const outcome = await Promise.race([attachOutcome, socketClosed]);
      if (outcome.kind === 'remote-error' && !this.socket.destroyed) {
        await this.emitError(outcome.error);
      }
    } finally {
      this.socket.off('error', onSocketError);
      await this.safeClose();
    }
  }

  private createServerEventSink(): AttachServerEventSink {
    return {
      attached: async (event) => {
        await this.emitEvent(this.attachedListeners, event);
      },
      output: async (event) => {
        await this.emitEvent(this.outputListeners, event);
      },
      terminate: async (event) => {
        await this.emitEvent(this.terminateListeners, event);
        await this.safeClose();
      },
    };
  }

  private async emitEvent<TEvent>(listeners: Set<AttachEventListener<TEvent>>, event: TEvent): Promise<void> {
    for (const listener of listeners) {
      try {
        await listener(event);
      } catch (error) {
        await this.emitError(this.normalizeError(error));
      }
    }
  }

  private async emitError(error: Error): Promise<void> {
    for (const listener of this.errorListeners) {
      try {
        await listener(error);
      } catch {
        // Ignore error listener failures so they do not cascade.
      }
    }
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }

  private async safeClose(): Promise<void> {
    this.closePromise ??= this.closeConnection().catch(async (error) => {
      await this.emitError(this.normalizeError(error));
    });
    await this.closePromise;
  }
}