<template>
  <v-app>
    <v-navigation-drawer width="320" permanent>
      <v-toolbar flat density="comfortable">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Discord Server Manager
        </v-toolbar-title>
      </v-toolbar>
      <v-divider />

      <ServerList
        v-model:servers="servers"
        v-model:selected="selectedServerId"
        @add="showAddServerDialog = true"
      />
    </v-navigation-drawer>

    <v-app-bar flat density="comfortable">
      <v-app-bar-title>
        <span v-if="selectedServer">{{ selectedServer.name }}</span>
        <span v-else class="text-medium-emphasis">請選擇伺服器</span>
      </v-app-bar-title>

      <v-spacer />

      <v-tooltip v-if="!selectedServer" text="請先選擇伺服器">
        <template #activator="{ props }">
          <div v-bind="props">
            <v-btn variant="tonal" disabled>
              <v-icon start icon="mdi-library" />
              模板庫
            </v-btn>
          </div>
        </template>
      </v-tooltip>
      <v-btn v-else variant="tonal" @click="showTemplateLibrary = true">
        <v-icon start icon="mdi-library" />
        模板庫
      </v-btn>
      <v-btn class="ml-2" variant="tonal" @click="showSettings = true">
        <v-icon start icon="mdi-cog" />
        設定
      </v-btn>
      <v-btn class="ml-2" variant="tonal" @click="showBackupDialog = true" :disabled="!selectedServer">
        <v-icon start icon="mdi-backup-restore" />
        備份
      </v-btn>
      <v-tooltip v-if="selectedServer && !hasGuildId" text="請先在伺服器設定填入 Guild ID">
        <template #activator="{ props }">
          <div v-bind="props">
            <v-btn class="ml-2" variant="tonal" disabled>
              <v-icon start icon="mdi-download" />
              讀取頻道
            </v-btn>
          </div>
        </template>
      </v-tooltip>
      <v-btn 
        v-else-if="selectedServer" 
        class="ml-2" 
        variant="tonal" 
        @click="loadFromDiscord"
      >
        <v-icon start icon="mdi-download" />
        讀取頻道
      </v-btn>
      <v-btn class="ml-2" color="primary" :disabled="!selectedServer" @click="syncServer">
        <v-icon start icon="mdi-sync" />
        同步
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-6" style="height: 100%">
        <ChannelEditor
          v-if="selectedServer"
          :server="selectedServer"
          @update="updateServer"
        />

        <v-sheet v-else class="d-flex align-center justify-center" height="100%" rounded="lg" border>
          <div class="text-center">
            <v-icon icon="mdi-discord" size="64" class="mb-4" />
            <div class="text-body-1 text-medium-emphasis mb-4">選擇一個 Discord 伺服器開始管理頻道</div>
            <v-btn color="primary" @click="showAddServerDialog = true">
              <v-icon start icon="mdi-plus" />
              連接伺服器
            </v-btn>
          </div>
        </v-sheet>
      </v-container>
    </v-main>

    <!-- 模板庫 -->
    <TemplateLibrary
      v-model:show="showTemplateLibrary"
      :has-selected-server="!!selectedServer"
      @close="showTemplateLibrary = false"
      @apply="applyTemplate"
    />

    <!-- 連接伺服器 -->
    <AddServerDialog
      v-model:show="showAddServerDialog"
      @close="showAddServerDialog = false"
      @add="addServer"
    />

    <!-- 設定 -->
    <v-dialog v-model="showSettings" max-width="720">
      <SettingsView v-model="showSettings" />
    </v-dialog>

    <!-- 備份與還原 -->
    <BackupDialog
      v-model:show="showBackupDialog"
      :server="selectedServer"
      @restore="restoreFromBackup"
    />
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ServerList from './components/ServerList.vue'
import ChannelEditor from './components/ChannelEditor.vue'
import TemplateLibrary from './components/TemplateLibrary.vue'
import AddServerDialog from './components/AddServerDialog.vue'
import SettingsView from './components/SettingsView.vue'
import BackupDialog from './components/BackupDialog.vue'
import { useElectron } from './composables/useElectron'

const { loadServers, saveServers, fetchGuildStructure, backupServerConfig: backupAPI, syncGuildStructure } = useElectron()

const servers = ref([])
const selectedServerId = ref(null)
const showTemplateLibrary = ref(false)
const showAddServerDialog = ref(false)
const showSettings = ref(false)
const showBackupDialog = ref(false)
const syncing = ref(false)

const selectedServer = computed(() => {
  return servers.value.find(s => s.id === selectedServerId.value)
})

const hasGuildId = computed(() => {
  const s = selectedServer.value
  if (!s) return false
  return !!(s.guildId || (/^\d{16,20}$/.test(s.id)))
})

onMounted(async () => {
  const result = await loadServers()
  if (result.success && result.data) {
    servers.value = result.data
  }
})

async function updateServer(updatedServer) {
  const index = servers.value.findIndex(s => s.id === updatedServer.id)
  if (index !== -1) {
    servers.value[index] = updatedServer
    await saveServers(servers.value)
  }
}

async function addServer(server) {
  if (!server.guildId) {
    alert('Guild ID 必填')
    return
  }
  const res = await fetchGuildStructure(server.guildId)
  if (!res.success) {
    let errorMsg = res.error || '未知錯誤'
    if (errorMsg.includes('Unknown Guild') || errorMsg.includes('404')) {
      errorMsg = `連接失敗：找不到伺服器\n\n✓ 檢查清單：\n1. Bot Token 已在設定中設置\n2. 機器人已加入該伺服器\n3. Guild ID 正確無誤`
    } else if (errorMsg.includes('缺少') || errorMsg.includes('undefined')) {
      errorMsg = `連接失敗：未設置 Bot Token\n\n請先在「⚙ 設定」中設置有效的 Discord Bot Token`
    } else {
      errorMsg = `連接失敗：${errorMsg}`
    }
    alert(errorMsg)
    return
  }
  const categories = (res.data?.categories || [])
  const name = server.name || res.data?.guildName || '未命名伺服器'
  const newServer = {
    id: Date.now().toString(),
    guildId: server.guildId,
    name,
    color: server.color,
    categories
  }
  servers.value.push(newServer)
  selectedServerId.value = newServer.id
  const saveRes = await saveServers(servers.value)
  if (!saveRes?.success) {
    alert(`保存伺服器失敗：${saveRes?.error || '未知錯誤'}`)
  }
  showAddServerDialog.value = false
}

function applyTemplate(template) {
  if (selectedServer.value) {
    // 確保 categories 包含所有必要屬性
    const categories = (template.categories || []).map(cat => ({
      id: cat.id || Date.now().toString(),
      name: cat.name,
      collapsed: false,
      channels: (cat.channels || []).map(ch => ({
        id: ch.id || Date.now().toString(),
        name: ch.name,
        type: ch.type || 'text',
        topic: ch.topic || ''
      }))
    }))
    
    // 觸發響應式更新
    const index = servers.value.findIndex(s => s.id === selectedServer.value.id)
    if (index !== -1) {
      servers.value[index] = {
        ...servers.value[index],
        categories
      }
      saveServers(servers.value)
    }
    
    showTemplateLibrary.value = false
  }
}

function syncServer() {
  const s = selectedServer.value
  if (!s) return
  const guildId = s.guildId || (typeof s.id === 'string' && /^\d{16,20}$/.test(s.id) ? s.id : null)
  if (!guildId) {
    alert('請先在伺服器設定填寫 Discord Guild ID')
    return
  }

  const payload = {
    guildId,
    categories: (s.categories || []).map(cat => ({
      id: cat.id,
      name: cat.name,
      channels: (cat.channels || []).map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        topic: ch.topic || ''
      }))
    }))
  }

  syncGuildStructure(payload).then(res => {
    if (!res.success) {
      alert('同步失敗：' + (res.error || '未知錯誤'))
      return
    }
    const sum = res.summary || {}
    const msg = `同步完成\n\n` +
      `新增分類：${(sum.createdCategories || []).length}\n` +
      `新增頻道：${(sum.createdChannels || []).length}\n` +
      `更新頻道：${(sum.updatedChannels || []).length}`
    alert(msg)
  }).catch(err => {
    alert('同步失敗：' + err.message)
  })
}

async function loadFromDiscord() {
  const s = selectedServer.value
  if (!s) return
  const guildId = s.guildId || (typeof s.id === 'string' && /^\d{16,20}$/.test(s.id) ? s.id : null)
  if (!guildId) {
    alert('請先在伺服器設定填寫 Discord Guild ID')
    return
  }
  const res = await fetchGuildStructure(guildId)
  if (!res.success) {
    alert('讀取失敗：' + (res.error || '未知錯誤'))
    return
  }
  const categories = (res.data?.categories || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    collapsed: false,
    channels: (cat.channels || []).map(ch => ({
      id: ch.id,
      name: ch.name,
      type: ch.type || 'text',
      topic: ch.topic || ''
    }))
  }))
  const index = servers.value.findIndex(ss => ss.id === s.id)
  if (index !== -1) {
    servers.value[index] = { ...servers.value[index], categories }
    await saveServers(servers.value)
  }
}

async function backupServerConfig() {
  if (!selectedServer.value) return
  const res = await backupAPI(selectedServer.value)
  if (res.success) {
    alert(`備份完成！\n\n檔案位置：${res.path}`)
  } else {
    alert(`備份失敗：${res.error || '未知錯誤'}`)
  }
}

function restoreFromBackup({ serverId, backupData }) {
  const index = servers.value.findIndex(s => s.id === serverId)
  if (index !== -1) {
    servers.value[index] = {
      ...servers.value[index],
      categories: backupData.categories || []
    }
    saveServers(servers.value)
  }
}
</script>
