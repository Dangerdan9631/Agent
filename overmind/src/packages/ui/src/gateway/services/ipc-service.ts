import { singleton } from 'tsyringe';

type EventHandler = (data: unknown) => void;

declare global {
  interface Window {
    ipc: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>;
      on(channel: string, handler: EventHandler): () => void;
    };
  }
}

@singleton()
export class IpcService {
  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    return window.ipc.invoke('service:request', method, params) as Promise<T>;
  }

  subscribe(event: string, handler: EventHandler): () => void {
    return window.ipc.on(`service:event:${event}`, handler);
  }
}
