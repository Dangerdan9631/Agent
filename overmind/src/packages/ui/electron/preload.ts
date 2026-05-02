import { contextBridge, ipcRenderer } from 'electron';

type EventHandler = (data: unknown) => void;

contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> =>
    ipcRenderer.invoke(channel, ...args),

  on: (channel: string, handler: EventHandler): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => handler(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
