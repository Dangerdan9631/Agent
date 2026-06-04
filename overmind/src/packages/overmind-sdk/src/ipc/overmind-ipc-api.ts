import type {
    AttachEventAttached,
    AttachEventListener,
    AttachEventOutput,
    AttachEventTerminate,
    AttachRequest,
    GetStatsRequest,
    GetStatsResponse,
    SendCerebrateCommandRequest,
    SendCerebrateCommandResponse,
    ShutdownRequest,
    ShutdownResponse,
    StartCerebrateRequest,
    StartCerebrateResponse,
    StartCerebrateWorkflowRequest,
    StartCerebrateWorkflowResponse,
    StopCerebrateRequest,
    StopCerebrateResponse,
} from '@overmind-sdk/api';

export interface OvermindIpcApi {
    shutdown(request: ShutdownRequest): Promise<ShutdownResponse>;
    getStats(request: GetStatsRequest): Promise<GetStatsResponse>;
    attach(
      request: AttachRequest,
      onAttached: AttachEventListener<AttachEventAttached>,
      onOutput: AttachEventListener<AttachEventOutput>,
      onTerminate: AttachEventListener<AttachEventTerminate>,
    ): Promise<void>;
    terminateAttach(event: AttachEventTerminate): Promise<void>;
    startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse>;
    startCerebrateWorkflow(request: StartCerebrateWorkflowRequest): Promise<StartCerebrateWorkflowResponse>;
    stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse>;
    sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse>;
}
