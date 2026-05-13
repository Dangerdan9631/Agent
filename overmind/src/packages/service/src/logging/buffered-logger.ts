import { singleton } from 'tsyringe';
import { Logger, LogLevel, LoggerFactory } from './logger';

export interface BufferedLogEvent {
    timestamp: Date;
    level: LogLevel;
    category: string;
    line: string;
}

type BufferedLogListener = (event: BufferedLogEvent) => void;

interface BufferedLogChannel {
    events: BufferedLogEvent[];
    listeners: Set<BufferedLogListener>;
}

const GLOBAL_BUFFER_NAME = '__global__';

@singleton()
export class BufferedLogBuffer {
    readonly buffers = new Map<string, BufferedLogChannel>();
    readonly maxEntries = 1000;

    append(event: BufferedLogEvent, bufferName?: string): void {
        const buffer = this.getBuffer(bufferName);

        buffer.events.push(event);
        if (buffer.events.length > this.maxEntries) {
            buffer.events.shift();
        }

        for (const listener of buffer.listeners) {
            listener(event);
        }
    }

    subscribe(listener: BufferedLogListener, historyPlaybackSize?: number, bufferName?: string): () => void {
        const buffer = this.getBuffer(bufferName);
        const playbackSize = historyPlaybackSize === undefined
            ? buffer.events.length
            : Math.max(0, historyPlaybackSize);
        const startIndex = Math.max(0, buffer.events.length - playbackSize);

        for (const event of buffer.events.slice(startIndex)) {
            listener(event);
        }

        buffer.listeners.add(listener);
        return () => {
            buffer.listeners.delete(listener);
        };
    }

    getBuffer(bufferName?: string): BufferedLogChannel {
        const key = bufferName ?? GLOBAL_BUFFER_NAME;
        let buffer = this.buffers.get(key);
        if (buffer) {
            return buffer;
        }

        buffer = {
            events: [],
            listeners: new Set<BufferedLogListener>(),
        };
        this.buffers.set(key, buffer);
        return buffer;
    }
}

export class BufferedLogger implements Logger {
    constructor(
        private level: LogLevel,
        private readonly category: string,
        private readonly buffer: BufferedLogBuffer,
        private readonly bufferName?: string,
    ) { }

    logLevel(level: LogLevel): LoggerFactory {
        this.level = level;
        return this;
    }

    create(category: string): Logger {
        return new BufferedLogger(this.level, `${this.category}:${category}`, this.buffer, this.bufferName);
    }

    debug(...args: unknown[]): void {
        if (this.level > LogLevel.Debug) return;
        this.append(LogLevel.Debug, args.join(" "));
    }

    info(...args: unknown[]): void {
        if (this.level > LogLevel.Info) return;
        this.append(LogLevel.Info, args.join(" "));
    }

    warn(...args: unknown[]): void {
        if (this.level > LogLevel.Warn) return;
        this.append(LogLevel.Warn, args.join(" "));
    }

    error(...args: unknown[]): void {
        this.append(LogLevel.Error, args.join(" "));
    }

    append(level: LogLevel, args: string): void {
        this.buffer.append({
            timestamp: new Date(),
            level,
            category: this.category,
            line: args
        }, this.bufferName);
    }
}
