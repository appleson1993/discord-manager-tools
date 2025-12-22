const { contextBridge, ipcMain } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // 你可以在这里暴露一些 API 给渲染进程使用
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
  }
});
