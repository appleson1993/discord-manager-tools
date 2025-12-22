<template>
  <v-dialog v-model="open" max-width="720">
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center">
        <span class="text-h6">備份與還原</span>
        <v-spacer />
        <v-btn icon variant="text" @click="open = false">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-tabs v-model="tab">
        <v-tab value="create">建立備份</v-tab>
        <v-tab value="restore">還原備份</v-tab>
      </v-tabs>

      <v-card-text class="pa-6">
        <!-- 建立備份 -->
        <div v-show="tab === 'create'">
          <v-card variant="tonal" class="mb-4">
            <v-card-text>
              <div class="text-subtitle-2 font-weight-bold mb-2">{{ selectedServer?.name || '未選擇伺服器' }}</div>
              <div class="text-caption text-medium-emphasis mb-4">
                分類數：{{ selectedServer?.categories?.length || 0 }}<br>
                總頻道數：{{ totalChannels }}
              </div>
              <v-btn 
                color="primary" 
                :loading="backupLoading"
                @click="performBackup"
                block
              >
                <v-icon start icon="mdi-content-save" />
                開始備份
              </v-btn>
            </v-card-text>
          </v-card>

          <div v-if="backupHistory.length" class="mt-4">
            <div class="text-subtitle-2 font-weight-bold mb-3">最近備份</div>
            <v-list>
              <v-list-item
                v-for="backup in backupHistory"
                :key="backup.path"
                :title="`${backup.name} (${backup.date})`"
                :subtitle="backup.path"
              >
                <template #append>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    @click="deleteBackup(backup.path)"
                  >
                    <v-icon icon="mdi-delete" />
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </div>

        <!-- 還原備份 -->
        <div v-show="tab === 'restore'">
          <v-btn color="primary" @click="selectBackupFile" block class="mb-4">
            <v-icon start icon="mdi-folder-open" />
            選擇備份檔案
          </v-btn>

          <div v-if="selectedBackupFile" class="mb-4">
            <v-card variant="tonal">
              <v-card-text>
                <div class="text-subtitle-2 font-weight-bold mb-2">{{ selectedBackupFile.name }}</div>
                <div class="text-caption text-medium-emphasis mb-3">
                  <div>備份時間：{{ selectedBackupFile.exported }}</div>
                  <div>分類數：{{ selectedBackupFile.categories?.length || 0 }}</div>
                  <div>檔案位置：{{ selectedBackupFile.path }}</div>
                </div>
                <v-btn 
                  color="success" 
                  :loading="restoreLoading"
                  @click="performRestore"
                  block
                >
                  <v-icon start icon="mdi-restore" />
                  還原此備份
                </v-btn>
              </v-card-text>
            </v-card>
          </div>

          <div v-else class="text-center pa-8 text-medium-emphasis">
            <v-icon icon="mdi-backup-restore" size="48" class="mb-3" />
            <div>選擇一個備份檔案以還原</div>
          </div>
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="open = false">關閉</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useElectron } from '../composables/useElectron'

const props = defineProps({
  show: Boolean,
  server: Object
})

const emit = defineEmits(['update:show', 'restore'])

const { backupServerConfig: backupAPI, showOpenDialog } = useElectron()

const open = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const tab = ref('create')
const backupLoading = ref(false)
const restoreLoading = ref(false)
const selectedBackupFile = ref(null)
const backupHistory = ref([])

const selectedServer = computed(() => props.server)

const totalChannels = computed(() => {
  if (!selectedServer.value?.categories) return 0
  return selectedServer.value.categories.reduce((sum, cat) => sum + (cat.channels?.length || 0), 0)
})

onMounted(() => {
  loadBackupHistory()
})

function loadBackupHistory() {
  // TODO: 從本地存儲載入備份歷史
  backupHistory.value = [
    // 示例數據
    // { name: '伺服器_2025-01-01', date: '2025-01-01 10:30', path: 'C:\\...' }
  ]
}

async function performBackup() {
  if (!selectedServer.value) {
    alert('請先選擇伺服器')
    return
  }

  backupLoading.value = true
  try {
    // 創建清潔的伺服器對象，避免克隆問題
    const cleanServer = {
      id: selectedServer.value.id,
      guildId: selectedServer.value.guildId,
      name: selectedServer.value.name,
      color: selectedServer.value.color,
      categories: JSON.parse(JSON.stringify(selectedServer.value.categories || []))
    }
    const res = await backupAPI(cleanServer)
    if (res.success) {
      alert(`✅ 備份完成！\n\n檔案位置：${res.path}\n\n備份時間：${new Date().toLocaleString('zh-TW')}`)
      loadBackupHistory()
    } else if (!res.cancelled) {
      alert(`❌ 備份失敗：${res.error || '未知錯誤'}`)
    }
  } catch (error) {
    alert(`❌ 備份錯誤：${error.message}`)
  } finally {
    backupLoading.value = false
  }
}

async function selectBackupFile() {
  const result = await showOpenDialog({
    title: '選擇備份檔案',
    filters: [
      { name: '伺服器備份', extensions: ['json'] },
      { name: '所有檔案', extensions: ['*'] }
    ],
    properties: ['openFile']
  })

  if (result && result[0]) {
    try {
      const filePath = result[0]
      const content = await window.electronAPI.readFile(filePath)
      
      if (content.success) {
        const backupData = JSON.parse(content.content)
        selectedBackupFile.value = {
          ...backupData.server,
          exported: backupData.exported,
          path: filePath
        }
      } else {
        alert('讀取檔案失敗')
      }
    } catch (error) {
      alert(`讀取備份檔案失敗：${error.message}`)
    }
  }
}

async function performRestore() {
  if (!selectedBackupFile.value || !selectedServer.value) {
    alert('請先選擇備份檔案')
    return
  }

  const confirmed = confirm(`確定要將伺服器「${selectedServer.value.name}」還原為「${selectedBackupFile.value.name}」嗎？\n\n此操作將覆蓋目前的頻道設定。`)
  
  if (!confirmed) return

  restoreLoading.value = true
  try {
    emit('restore', {
      serverId: selectedServer.value.id,
      backupData: selectedBackupFile.value
    })
    alert('✅ 還原完成！')
    selectedBackupFile.value = null
    tab.value = 'create'
  } catch (error) {
    alert(`❌ 還原失敗：${error.message}`)
  } finally {
    restoreLoading.value = false
  }
}

function deleteBackup(path) {
  if (confirm('確定要刪除此備份嗎？')) {
    // TODO: 實現刪除備份檔案
    backupHistory.value = backupHistory.value.filter(b => b.path !== path)
  }
}
</script>
