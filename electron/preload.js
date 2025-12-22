const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // 服務器配置
  saveServers: (servers) => ipcRenderer.invoke('save-servers', servers),
  loadServers: () => ipcRenderer.invoke('load-servers'),
  
  // 模板操作
  exportTemplate: (template) => ipcRenderer.invoke('export-template', template),
  importTemplate: () => ipcRenderer.invoke('import-template'),

  // 設定
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),

  // Discord
  fetchGuildStructure: (guildId) => ipcRenderer.invoke('fetch-guild-structure', guildId),
  discordTestToken: (token) => ipcRenderer.invoke('discord-test-token', token),

  // 備份
  backupServerConfig: (server) => ipcRenderer.invoke('backup-server-config', server),

  // 同步
  syncGuildStructure: (payload) => ipcRenderer.invoke('sync-guild-structure', payload)
});
