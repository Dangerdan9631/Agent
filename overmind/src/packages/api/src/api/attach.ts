export interface AttachRequest {
    name?: string | undefined;
    historyPlaybackSize?: number;
}

export interface AttachResponse {
    name: string | undefined;
}

export interface AttachError {
    errorMessage: string;
}

export interface AttachClient {
    disconnect: () => void;
}

export interface AttachListener {
    onAttach?: (packet: AttachPacketAck) => void;
    onReceive: (packet: AttachPacketOutput) => void;
    onTerminate?: (packet: AttachPacketTerminate) => void;
}

export interface AttachPacketAck {
    name: string | undefined;
}

export interface AttachPacketOutput {
    name: string | undefined;
    timestamp: number;
    data: string;
}

export interface AttachPacketTerminate {
    name: string | undefined;
}
