// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  extractPdfText: (filePath) => ipcRenderer.invoke('extract-pdf-text', filePath)
});