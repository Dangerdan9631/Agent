import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers, connectToService } from './ipc-handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow(agentId?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    const url = agentId ? `${devServerUrl}?agentId=${encodeURIComponent(agentId)}` : devServerUrl;
    win.loadURL(url);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    const hash = agentId ? `#agentId=${encodeURIComponent(agentId)}` : '';
    win.loadFile(indexPath, { hash });
  }

  return win;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  connectToService();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Expose createWindow for use by renderer via IPC (e.g. open new agent window)
import { ipcMain } from 'electron';
ipcMain.handle('window:openAgent', (_event, agentId: string) => {
  createWindow(agentId);
});
