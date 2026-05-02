import { ipcMain, BrowserWindow } from 'electron';
import net from 'net';
import { randomUUID } from 'crypto';
import {
  SOCKET_PATH,
  encodeMessage,
  decodeMessages,
  IpcResponseSchema,
  IpcEventSchema,
} from 'overmind';

let socket: net.Socket | null = null;
let buffer = '';
const pendingCallbacks = new Map<string, (response: unknown) => void>();

export function connectToService(socketPath: string = SOCKET_PATH): void {
  socket = net.createConnection(socketPath, () => {
    console.log('[overmind-ui] Connected to service');
  });

  socket.on('data', (chunk) => {
    const { messages, remaining } = decodeMessages(chunk.toString(), buffer);
    buffer = remaining;
    for (const msg of messages) {
      handleServiceMessage(msg);
    }
  });

  socket.on('error', (err) => {
    console.warn('[overmind-ui] Service connection error:', err.message);
    socket = null;
  });

  socket.on('close', () => {
    socket = null;
  });
}

function handleServiceMessage(msg: unknown): void {
  const responseResult = IpcResponseSchema.safeParse(msg);
  if (responseResult.success) {
    const { id, result, error } = responseResult.data;
    const cb = pendingCallbacks.get(id);
    if (cb) {
      pendingCallbacks.delete(id);
      cb({ result, error });
    }
    return;
  }

  const eventResult = IpcEventSchema.safeParse(msg);
  if (eventResult.success) {
    const { event, data } = eventResult.data;
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send(`service:event:${event}`, data);
    });
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle(
    'service:request',
    (_event, method: string, params: unknown): Promise<unknown> => {
      if (!socket) {
        return Promise.reject(new Error('Not connected to overmind service'));
      }
      return new Promise((resolve, reject) => {
        const id = randomUUID();
        pendingCallbacks.set(id, (response) => {
          const r = response as { result?: unknown; error?: { message: string } };
          if (r.error) reject(new Error(r.error.message));
          else resolve(r.result);
        });
        socket!.write(encodeMessage({ id, method, params }));
      });
    }
  );
}
