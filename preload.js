const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showWindow: () => ipcRenderer.send('show-window'), // ウィンドウを表示するリクエストを送信
  writeStorage: (key, data) => ipcRenderer.invoke('writeStorage', key, data),
  readStorage: (key) => ipcRenderer.invoke('readStorage', key)
});
