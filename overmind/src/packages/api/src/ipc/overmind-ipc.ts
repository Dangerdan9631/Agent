import type { GetServiceStatsError, GetServiceStatsRequest, GetServiceStatsResponse } from '../api/get-service-stats.js';
import type { ShutdownError, ShutdownRequest, ShutdownResponse } from '../api/shutdown.js';
import type { SendCerebrateCommandError, SendCerebrateCommandRequest, SendCerebrateCommandResponse } from '../api/send-cerebrate-command.js';
import type { StartCerebrateError, StartCerebrateRequest, StartCerebrateResponse } from '../api/start-cerebrate.js';
import type { StopCerebrateError, StopCerebrateRequest, StopCerebrateResponse } from '../api/stop-cerebrate.js';
import type { OvermindResponse } from '../api/overmind-api.js';
import { AttachError, AttachListener, AttachPacketAck, AttachPacketOutput, AttachPacketTerminate, AttachRequest, AttachResponse } from '../api/attach.js';

export type OvermindMessageEnvelope<TMessageType, TMessage> = {
  method: TMessageType;
  message: TMessage;
}

export type OvermindStreamPacketEnvelope<TPacketType, TPacket> = {
  packet: TPacketType;
  data: TPacket;
}

export type OvermindIpcClientMessageEnvelope =
  | {
    [M in keyof OvermindMethodMap]
        : OvermindMessageEnvelope<M, OvermindMethodMap[M]['request']>;
  }[keyof OvermindMethodMap];

export type OvermindIpcServerMessageEnvelope =
  | {
    [M in keyof OvermindMethodMap]
        : OvermindMessageEnvelope<M,OvermindMethodMap[M]['response']>;
  }[keyof OvermindMethodMap];

export type OvermindIpcClientStreamMessageEnvelope =
  | {
    [M in keyof OvermindStreamMethodMap]
    : OvermindMessageEnvelope<M, OvermindStreamMethodMap[M]['service']>;
  }[keyof OvermindStreamMethodMap];

export type OvermindIpcServerStreamMessageEnvelope =
  | {
    [M in keyof OvermindStreamMethodMap]: {
      [P in keyof OvermindStreamMethodMap[M]['service']['packets']]
      : OvermindMessageEnvelope<M, OvermindStreamPacketEnvelope<P, OvermindStreamMethodMap[M]['service']['packets'][P]>>;
    }[keyof OvermindStreamMethodMap[M]['service']['packets']]
  }[keyof OvermindStreamMethodMap];

export type OvermindMethodMap = {
  'service.stats': {
    'request': GetServiceStatsRequest;
    'response': OvermindResponse<GetServiceStatsResponse, GetServiceStatsError>;
  };
  'service.shutdown': {
    'request': ShutdownRequest;
    'response': OvermindResponse<ShutdownResponse, ShutdownError>;
  };
  'cerebrate.start': {
    'request': StartCerebrateRequest;
    'response': OvermindResponse<StartCerebrateResponse, StartCerebrateError>;
  };
  'cerebrate.stop': {
    'request': StopCerebrateRequest;
    'response': OvermindResponse<StopCerebrateResponse, StopCerebrateError>;
  };
  'cerebrate.command': {
    'request': SendCerebrateCommandRequest;
    'response': OvermindResponse<SendCerebrateCommandResponse, SendCerebrateCommandError>;
  };
}

export type OvermindStreamMethodMap = {
  'service.attach': {
    'request': AttachRequest;
    'client': {
      'packets': {
        'terminate': AttachPacketTerminate;
      }
    };
    'service': {
      'listener': AttachListener;
      'packets': {
        'ack': AttachPacketAck;
        'output': AttachPacketOutput;
        'terminate': AttachPacketTerminate;
      },
    };
    'error': AttachError;
  }
}

