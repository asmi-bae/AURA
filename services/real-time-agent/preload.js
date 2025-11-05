/**
 * Preload script for AURA Real-Time Agent
 * 
 * This script runs in a separate context before the web page loads.
 * It exposes a secure API to the renderer process via window.electronAPI
 * 
 * Security: This prevents direct access to Node.js APIs from the renderer
 */

const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System information
  getPlatform: () => os.platform(),
  getRelease: () => os.release(),
  getElectronVersion: () => process.versions.electron,
  getServerUrl: () => process.env.AURA_SERVER_URL || 'http://localhost:3001',

  // IPC communication
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (event, data) => callback(data));
  },

  removeConnectionStatusListener: () => {
    ipcRenderer.removeAllListeners('connection-status');
  },

  // IPC handlers for renderer -> main communication
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  getCache: (key) => ipcRenderer.invoke('get-cache', key),
  setCache: (key, value) => ipcRenderer.invoke('set-cache', key, value),

  // Remove all listeners on cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Log that preload script loaded (for debugging)
console.log('[Preload] Electron API exposed to renderer process');

