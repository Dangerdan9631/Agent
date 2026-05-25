import type { LogLevel } from 'overmind-core';

export interface OutputEvent {
  timestamp: Date;
  level: LogLevel;
  category: string;
  line: string;
}

export interface OutputSink {
  append(event: OutputEvent, channelName?: string): void;
  subscribe(listener: (event: OutputEvent) => void, historyPlaybackSize?: number, channelName?: string): () => void;
}
