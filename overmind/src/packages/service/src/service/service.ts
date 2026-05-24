import type {
  AttachError,
  AttachEventAttached,
  AttachEventOutput,
  AttachEventTerminate,
  AttachServerChannel,
  AttachRequest,
  GetServiceStatsError,
  GetServiceStatsRequest,
  GetServiceStatsResponse,
  OvermindApi,
  OvermindResponse,
  OvermindStreamResponse,
  MessageEnvelope,
  SendCerebrateCommandError,
  SendCerebrateCommandRequest,
  SendCerebrateCommandResponse,
  StreamEventEnvelope,
  ShutdownError,
  ShutdownRequest,
  ShutdownResponse,
  StartCerebrateError,
  StartCerebrateRequest,
  StartCerebrateResponse,
  StopCerebrateError,
  StopCerebrateRequest,
  StopCerebrateResponse,
  AttachClientChannel,
} from 'overmind-api';
import {
  type MessageEnvelope,
  type StreamEventEnvelope,
  createMessageEnvelope,
  createStreamEventEnvelope,
  EVENT_ATTACHED,
  EVENT_OUTPUT,
  EVENT_TERMINATE,
  IpcConnection,
  IpcConnectionError,
  isMessageEnvelope,
  isStreamEventEnvelope,
  LoggerFactoryToken,
  RPC_ATTACH,
  RPC_GET_SERVICE_STATS,
  RPC_SEND_CEREBRATE_COMMAND,
  RPC_SHUTDOWN,
  RPC_START_CEREBRATE,
  RPC_STOP_CEREBRATE,
  type Logger,
  type LoggerFactory,
} from 'overmind-core';
import { inject, injectable } from 'tsyringe';
import {
  AttachController,
  GetServiceStatsController,
  SendCerebrateCommandController,
  ShutdownController,
  StartCerebrateController,
  StopCerebrateController,
} from '@overmind/controllers';
import { IpcServer } from './ipc-server';

@injectable()
export class OvermindService implements OvermindApi {
  constructor(
    private readonly attachController: AttachController,
    private readonly getServiceStatsController: GetServiceStatsController,
    private readonly sendCerebrateCommandController: SendCerebrateCommandController,
    private readonly shutdownController: ShutdownController,
    private readonly startCerebrateController: StartCerebrateController,
    private readonly stopCerebrateController: StopCerebrateController,
  ) { }

  getServiceStats(request: GetServiceStatsRequest): Promise<OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>> {
    return this.getServiceStatsController.execute(request);
  }
  
  shutdown(request: ShutdownRequest): Promise<OvermindResponse<ShutdownResponse, ShutdownError>> {
    return this.shutdownController.execute(request);
  }

  attach(request: AttachRequest): Promise<OvermindStreamResponse<AttachClientChannel, AttachError>>;
  attach(request: AttachRequest, channel: AttachServerChannel): Promise<OvermindStreamResponse<{ disconnect: () => void }, AttachError>>;
  attach(
    request: AttachRequest,
    channel?: AttachServerChannel,
  ): Promise<OvermindStreamResponse<AttachClientChannel | { disconnect: () => void }, AttachError>> {
    if (!channel) {
      return Promise.resolve({
        success: false,
        error: { errorMessage: 'Attach requires a server channel.' },
      });
    }

    return this.attachController.execute(request, channel);
  }

  startCerebrate(request: StartCerebrateRequest): Promise<OvermindResponse<StartCerebrateResponse, StartCerebrateError>> {
    return this.startCerebrateController.execute(request);
  }

  stopCerebrate(request: StopCerebrateRequest): Promise<OvermindResponse<StopCerebrateResponse, StopCerebrateError>> {
    return this.stopCerebrateController.execute(request);
  }

  sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<OvermindResponse<SendCerebrateCommandResponse, SendCerebrateCommandError>> {
    return this.sendCerebrateCommandController.execute(request);
  }
}

export class OvermindServer {
  private readonly logger: Logger;
  private readonly ipcServer: IpcServer;
  private readonly attachDisconnectHandlers = new WeakMap<IpcConnection, () => void>();

  constructor(
    private readonly pipePath: string,
    private readonly service: OvermindService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('OvermindService');
    this.ipcServer = new IpcServer(this.pipePath, {
      onConnect: this.handleConnect.bind(this),
      onReceive: this.handleReceive.bind(this),
      onError: this.handleError.bind(this),
      onDisconnect: this.handleDisconnect.bind(this),
    }, loggerFactory);
  }

  async start(): Promise<void> {
    await this.ipcServer.listen();
  }

  private handleConnect(_connection: IpcConnection): void {
  }

  private handleReceive(connection: IpcConnection, data: string): void {
    void this.routeMessage(connection, data);
  }

  private async routeMessage(connection: IpcConnection, data: string): Promise<void> {
    try {
      const request = JSON.parse(data) as MessageEnvelope<string>;
      if (!isMessageEnvelope(request)) {
        throw new Error('Invalid request format');
      }

      let response: unknown;
      switch (request.method) {
        case RPC_GET_SERVICE_STATS:
          response = await this.service.getServiceStats(request.message as GetServiceStatsRequest);
          connection.send(JSON.stringify(createMessageEnvelope(RPC_GET_SERVICE_STATS, response)));
          return;
        case RPC_SHUTDOWN:
          response = await this.service.shutdown(request.message as ShutdownRequest);
          connection.send(JSON.stringify(createMessageEnvelope(RPC_SHUTDOWN, response)));
          return;
        case RPC_ATTACH:
          if (isStreamEventEnvelope(request.message)) {
            this.handleAttachClientMessage(connection, request as MessageEnvelope<string>);
            return;
          }

          await this.handleAttachRequest(connection, request.message as AttachRequest);
          return;
        case RPC_START_CEREBRATE:
          response = await this.service.startCerebrate(request.message as StartCerebrateRequest);
          connection.send(JSON.stringify(createMessageEnvelope(RPC_START_CEREBRATE, response)));
          return;
        case RPC_STOP_CEREBRATE:
          response = await this.service.stopCerebrate(request.message as StopCerebrateRequest);
          connection.send(JSON.stringify(createMessageEnvelope(RPC_STOP_CEREBRATE, response)));
          return;
        case RPC_SEND_CEREBRATE_COMMAND:
          response = await this.service.sendCerebrateCommand(request.message as SendCerebrateCommandRequest);
          connection.send(JSON.stringify(createMessageEnvelope(RPC_SEND_CEREBRATE_COMMAND, response)));
        default:
          throw new Error(`Unknown method: ${data}`);
      }
    } catch (error) {
      this.handleError(connection, {
        type: 'remote_error',
        message: error instanceof Error ? error.message : 'Unknown IPC server error',
        error: error instanceof Error ? error : undefined,
      });
    }
  }

  private handleAttachClientMessage(connection: IpcConnection, request: MessageEnvelope<string>): void {
    const streamEvent = request.message as StreamEventEnvelope<string>;
    switch (streamEvent.event) {
      case EVENT_TERMINATE:
        this.attachDisconnectHandlers.get(connection)?.();
        this.attachDisconnectHandlers.delete(connection);
        connection.disconnect();
        return;
      default:
        throw new Error(`Unsupported client stream event: ${String(streamEvent.event)}`);
    }
  }

  private async handleAttachRequest(connection: IpcConnection, request: AttachRequest): Promise<void> {
    const result = await this.service.attach(request, {
      onError: (error) => {
        this.handleError(connection, {
          type: 'remote_error',
          message: error.message,
          error,
        });
      },
      listen: async () => undefined,
      attached: (event) => {
        this.sendAttachStreamEvent(connection, EVENT_ATTACHED, event);
      },
      send: (event) => {
        this.sendAttachStreamEvent(connection, EVENT_OUTPUT, event);
      },
      terminate: (event) => {
        this.sendAttachStreamEvent(connection, EVENT_TERMINATE, event);
        this.attachDisconnectHandlers.get(connection)?.();
        this.attachDisconnectHandlers.delete(connection);
        connection.disconnect();
      },
      onTerminate: () => undefined,
    });

    if (!result.success) {
      throw new Error(result.error.errorMessage);
    }

    this.attachDisconnectHandlers.set(connection, result.client.disconnect);
  }

  private sendAttachStreamEvent(
    connection: IpcConnection,
    event: typeof EVENT_ATTACHED,
    payload: AttachEventAttached,
  ): void;
  private sendAttachStreamEvent(
    connection: IpcConnection,
    event: typeof EVENT_OUTPUT,
    payload: AttachEventOutput,
  ): void;
  private sendAttachStreamEvent(
    connection: IpcConnection,
    event: typeof EVENT_TERMINATE,
    payload: AttachEventTerminate,
  ): void;
  private sendAttachStreamEvent(
    connection: IpcConnection,
    event: typeof EVENT_ATTACHED | typeof EVENT_OUTPUT | typeof EVENT_TERMINATE,
    payload: AttachEventAttached | AttachEventOutput | AttachEventTerminate,
  ): void {
    const response = createMessageEnvelope(RPC_ATTACH, createStreamEventEnvelope(event, payload));
    connection.send(JSON.stringify(response));
  }

  private handleError(_connection: IpcConnection, error: IpcConnectionError): void {
    if ('message' in error) {
      this.logger.error(error.message);
      return;
    }

    this.logger.error(error.type);
  }

  private handleDisconnect(connection: IpcConnection): void {
    this.attachDisconnectHandlers.get(connection)?.();
    this.attachDisconnectHandlers.delete(connection);
  }
}
