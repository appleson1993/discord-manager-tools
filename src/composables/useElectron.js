import { ref } from 'vue'

export function useElectron() {
  const isElectron = ref(!!window.electronAPI)

  const showSaveDialog = async (options) => {
    if (!isElectron.value) return null
    return await window.electronAPI.showSaveDialog(options)
  }

  const showOpenDialog = async (options) => {
    if (!isElectron.value) return []
    return await window.electronAPI.showOpenDialog(options)
  }

  const saveFile = async (filePath, content) => {
    if (!isElectron.value) return { success: false }
    return await window.electronAPI.saveFile(filePath, content)
  }

  const readFile = async (filePath) => {
    if (!isElectron.value) return { success: false }
    return await window.electronAPI.readFile(filePath)
  }

  const saveServers = async (servers) => {
    if (!isElectron.value) {
      localStorage.setItem('servers', JSON.stringify(servers))
      return { success: true }
    }
    const payload = JSON.parse(JSON.stringify(servers || []))
    return await window.electronAPI.saveServers(payload)
  }

  const loadServers = async () => {
    if (!isElectron.value) {
      const data = localStorage.getItem('servers')
      return { success: true, data: data ? JSON.parse(data) : [] }
    }
    return await window.electronAPI.loadServers()
  }

  const exportTemplate = async (template) => {
    if (!isElectron.value) return { success: false }
    return await window.electronAPI.exportTemplate(template)
  }

  const importTemplate = async () => {
    if (!isElectron.value) return { success: false }
    return await window.electronAPI.importTemplate()
  }

  const fetchGuildStructure = async (guildId) => {
    if (!isElectron.value) return { success: false, error: 'not-electron' }
    return await window.electronAPI.fetchGuildStructure(guildId)
  }

  const saveSettings = async (settings) => {
    if (!isElectron.value) {
      localStorage.setItem('settings', JSON.stringify(settings))
      return { success: true }
    }
    return await window.electronAPI.saveSettings(settings)
  }

  const loadSettings = async () => {
    if (!isElectron.value) {
      const data = localStorage.getItem('settings')
      return { success: true, data: data ? JSON.parse(data) : {} }
    }
    return await window.electronAPI.loadSettings()
  }

  const discordTestToken = async (token) => {
    if (!isElectron.value) return { success: false, error: 'not-electron' }
    return await window.electronAPI.discordTestToken(token)
  }

  const syncGuildStructure = async (payload) => {
    if (!isElectron.value || !window.electronAPI?.syncGuildStructure) {
      return { success: false, error: 'sync API unavailable (可能需要重啟應用)' }
    }
    // 深拷貝以避免 structured clone 問題
    const clean = JSON.parse(JSON.stringify(payload || {}))
    return await window.electronAPI.syncGuildStructure(clean)
  }

  const backupServerConfig = async (server) => {
    if (!isElectron.value) return { success: false, error: 'not-electron' }
    return await window.electronAPI.backupServerConfig(server)
  }

  return {
    isElectron,
    showSaveDialog,
    showOpenDialog,
    saveFile,
    readFile,
    saveServers,
    loadServers,
    exportTemplate,
    importTemplate,
    fetchGuildStructure,
    saveSettings,
    loadSettings,
    discordTestToken,
    backupServerConfig,
    syncGuildStructure
  }
}
