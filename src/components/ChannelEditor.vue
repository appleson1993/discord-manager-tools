<template>
  <div class="d-flex" style="height: 100%">
    <div class="flex-1-1-auto pr-4" style="min-width: 0">
      <div class="d-flex align-center mb-4">
        <v-btn color="primary" variant="tonal" @click="addCategory">
          <v-icon start icon="mdi-folder-plus" />
          新增分類
        </v-btn>
        <v-btn class="ml-2" color="primary" :disabled="!selectedCategory" @click="addChannel">
          <v-icon start icon="mdi-plus-box" />
          新增頻道
        </v-btn>
      </div>

      <v-card variant="tonal" rounded="lg" class="fill-height">
        <v-card-text class="pa-0">
          <v-list 
            ref="categoriesListRef"
            v-if="server.categories && server.categories.length" 
            density="compact" 
            nav 
            lines="one"
          >
            <template v-for="category in server.categories" :key="category.id">
              <v-list-item
                :title="category.name"
                :active="selectedCategory === category.id"
                @click="toggleCategory(category.id)"
              >
                <template #prepend>
                  <v-icon :icon="category.collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down'" />
                </template>
                <template #append>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    @click.stop="deleteCategory(category.id)"
                  >
                    <v-icon icon="mdi-delete" />
                  </v-btn>
                </template>
              </v-list-item>

              <v-expand-transition>
                <div v-show="!category.collapsed" class="pl-6 pr-2 pb-2">
                  <v-list 
                    :data-category-id="category.id"
                    density="compact" 
                    nav 
                    lines="one" 
                    class="rounded-lg"
                  >
                    <v-list-item
                      v-for="channel in (category.channels || [])"
                      :key="channel.id"
                      :title="channel.name"
                      :active="selectedChannel?.id === channel.id"
                      @click="selectChannel(channel)"
                    >
                      <template #prepend>
                        <v-icon :icon="getChannelIcon(channel.type)" />
                      </template>
                      <template #append>
                        <v-btn
                          icon
                          size="x-small"
                          variant="text"
                          color="error"
                          @click.stop="deleteChannel(category.id, channel.id)"
                        >
                          <v-icon icon="mdi-close" />
                        </v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                </div>
              </v-expand-transition>
            </template>
          </v-list>

          <div v-else class="pa-8 text-center text-medium-emphasis">
            <v-icon icon="mdi-format-list-bulleted" size="48" class="mb-3" />
            <div>尚無頻道，點擊上方按鈕開始建立</div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <div style="width: 360px">
      <v-card v-if="selectedChannel" rounded="lg" variant="tonal">
        <v-card-title class="text-subtitle-1 font-weight-bold">頻道設定</v-card-title>
        
        <v-tabs v-model="editTab">
          <v-tab value="basic">基本</v-tab>
          <v-tab value="permissions">權限</v-tab>
        </v-tabs>
        
        <v-card-text>
          <!-- 基本設定 -->
          <div v-show="editTab === 'basic'">
            <v-text-field
              v-model="selectedChannel.name"
              label="頻道名稱"
              density="comfortable"
              variant="outlined"
              @blur="emit('update', props.server)"
            />
            <v-select
              v-model="selectedChannel.type"
              label="頻道類型"
              density="comfortable"
              variant="outlined"
              :items="channelTypeItems"
              item-title="title"
              item-value="value"
              @update:model-value="emit('update', props.server)"
            />
            <v-textarea
              v-model="selectedChannel.topic"
              label="主題"
              density="comfortable"
              variant="outlined"
              rows="3"
              auto-grow
              @blur="emit('update', props.server)"
            />
          </div>
          
          <!-- 權限設定 -->
          <div v-show="editTab === 'permissions'" class="mt-4">
            <v-btn-toggle v-model="permissionMode" group mandatory>
              <v-btn value="simple">簡易</v-btn>
              <v-btn value="advanced">進階</v-btn>
            </v-btn-toggle>
            
            <!-- 簡易模式 -->
            <div v-if="permissionMode === 'simple'" class="mt-4">
              <div class="text-subtitle-2 mb-2">預設權限</div>
              <v-switch 
                v-model="getChannelPermissions().everyone"
                label="所有人可見"
                density="comfortable"
                @update:model-value="updateChannelPermissions"
              />
              <v-switch 
                v-model="getChannelPermissions().everyoneCanSend"
                label="所有人可發言"
                density="comfortable"
                @update:model-value="updateChannelPermissions"
              />
              <v-switch 
                v-model="getChannelPermissions().mentionable"
                label="可被提及"
                density="comfortable"
                @update:model-value="updateChannelPermissions"
              />
            </div>
            
            <!-- 進階模式 -->
            <div v-if="permissionMode === 'advanced'" class="mt-4">
              <div class="text-subtitle-2 mb-3">角色權限</div>
              <v-expansion-panels>
                <v-expansion-panel title="檢視">
                  <v-switch 
                    v-model="getChannelPermissions().viewChannel"
                    label="檢視此頻道"
                    density="comfortable"
                    @update:model-value="updateChannelPermissions"
                  />
                  <v-switch 
                    v-model="getChannelPermissions().readMessageHistory"
                    label="讀取訊息歷史"
                    density="comfortable"
                    @update:model-value="updateChannelPermissions"
                  />
                </v-expansion-panel>
                <v-expansion-panel title="發言">
                  <v-switch 
                    v-model="getChannelPermissions().sendMessages"
                    label="發送訊息"
                    density="comfortable"
                    @update:model-value="updateChannelPermissions"
                  />
                  <v-switch 
                    v-model="getChannelPermissions().sendMessagesInThreads"
                    label="在執行緒中發送訊息"
                    density="comfortable"
                    @update:model-value="updateChannelPermissions"
                  />
                  <v-switch 
                    v-model="getChannelPermissions().createPublicThreads"
                    label="建立公開執行緒"
                    density="comfortable"
                    @update:model-value="updateChannelPermissions"
                  />
                </v-expansion-panel>
                <v-expansion-panel title="管理">
                  <v-switch 
                    v-model="getChannelPermissions().manageMessages"
                    label="管理訊息"
                    density="comfortable"
                    @update:model-value="updateChannelPermissions"
                  />
                  <v-switch 
                    v-model="getChannelPermissions().manageChannel"
                    label="管理此頻道"
                    density="comfortable"
                    @update:model-value="updateChannelPermissions"
                  />
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card v-else rounded="lg" variant="tonal" class="text-center pa-6">
        <v-icon icon="mdi-tune" size="48" class="mb-3" />
        <div class="text-body-2 text-medium-emphasis">選擇一個頻道以編輯設定</div>
      </v-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import Sortable from 'sortablejs'

const props = defineProps({
  server: Object
})

const emit = defineEmits(['update'])

const categoriesListRef = ref(null)
const selectedCategory = ref(null)
const selectedChannel = ref(null)

const categorySortable = ref(null)
const channelSortables = ref({})

const editTab = ref('basic')
const permissionMode = ref('simple')

const channelTypeItems = [
  { title: '文字頻道', value: 'text' },
  { title: '語音頻道', value: 'voice' },
  { title: '公告頻道', value: 'announcement' }
]

function getChannelPermissions() {
  if (!selectedChannel.value) return {}
  if (!selectedChannel.value.permissions) {
    selectedChannel.value.permissions = {
      // 簡易模式
      everyone: true,
      everyoneCanSend: true,
      mentionable: true,
      // 進階模式
      viewChannel: true,
      readMessageHistory: true,
      sendMessages: true,
      sendMessagesInThreads: true,
      createPublicThreads: false,
      manageMessages: false,
      manageChannel: false
    }
  }
  return selectedChannel.value.permissions
}

function updateChannelPermissions() {
  emit('update', props.server)
}

function addCategory() {
  const newCategory = {
    id: Date.now().toString(),
    name: '新分類',
    collapsed: false,
    channels: []
  }
  
  if (!props.server.categories) {
    props.server.categories = []
  }
  
  props.server.categories.push(newCategory)
  emit('update', props.server)
}

function addChannel() {
  if (!selectedCategory.value) return
  
  const newChannel = {
    id: Date.now().toString(),
    name: '新頻道',
    type: 'text',
    topic: ''
  }
  
  const category = props.server.categories.find(c => c.id === selectedCategory.value)
  if (category) {
    if (!category.channels) {
      category.channels = []
    }
    category.channels.push(newChannel)
    emit('update', props.server)
  }
}

function toggleCategory(categoryId) {
  const category = props.server.categories.find(c => c.id === categoryId)
  if (category) {
    category.collapsed = !category.collapsed
    selectedCategory.value = category.collapsed ? null : categoryId
  }
}

function selectChannel(channel) {
  selectedChannel.value = channel
}

function deleteCategory(categoryId) {
  if (confirm('確定要刪除此分類及其所有頻道？')) {
    props.server.categories = props.server.categories.filter(c => c.id !== categoryId)
    emit('update', props.server)
  }
}

function deleteChannel(categoryId, channelId) {
  if (confirm('確定要刪除此頻道？')) {
    const category = props.server.categories.find(c => c.id === categoryId)
    if (category) {
      category.channels = category.channels.filter(ch => ch.id !== channelId)
      if (selectedChannel.value?.id === channelId) {
        selectedChannel.value = null
      }
      emit('update', props.server)
    }
  }
}

function getChannelIcon(type) {
  const icons = {
    text: 'mdi-pound',
    voice: 'mdi-volume-high',
    announcement: 'mdi-bullhorn'
  }
  return icons[type] || 'mdi-pound'
}

function initCategorySortable() {
  if (categorySortable.value) {
    categorySortable.value.destroy()
    categorySortable.value = null
  }

  const el = categoriesListRef.value?.$el
  if (!el) return

  categorySortable.value = Sortable.create(el, {
    group: 'categories',
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    handle: '.v-list-item__prepend',
    onEnd(evt) {
      if (props.server.categories) {
        const movedItem = props.server.categories[evt.oldIndex]
        props.server.categories.splice(evt.oldIndex, 1)
        props.server.categories.splice(evt.newIndex, 0, movedItem)
        emit('update', props.server)
      }
    }
  })
}

function initChannelSortables() {
  // 清理舊的 sortables
  Object.values(channelSortables.value).forEach(instance => instance.destroy())
  channelSortables.value = {}

  if (!props.server.categories) return

  props.server.categories.forEach((category) => {
    const el = document.querySelector(`[data-category-id="${category.id}"]`)
    if (!el) return

    const sortable = Sortable.create(el, {
      group: `channels-${category.id}`,
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      handle: '.v-list-item__prepend',
      onEnd(evt) {
        const categoryIdx = props.server.categories.findIndex(c => c.id === category.id)
        if (categoryIdx !== -1) {
          const channels = props.server.categories[categoryIdx].channels || []
          const movedChannel = channels[evt.oldIndex]
          channels.splice(evt.oldIndex, 1)
          channels.splice(evt.newIndex, 0, movedChannel)
          emit('update', props.server)
        }
      }
    })

    channelSortables.value[category.id] = sortable
  })
}

async function initSortables() {
  await nextTick()
  initCategorySortable()
  initChannelSortables()
}

onMounted(() => {
  initSortables()
})

watch(
  () => props.server.categories?.map(c => ({ id: c.id, len: c.channels?.length || 0 })),
  () => initSortables(),
  { deep: true }
)

onBeforeUnmount(() => {
  if (categorySortable.value) categorySortable.value.destroy()
  Object.values(channelSortables.value).forEach(instance => instance.destroy())
})
</script>

<style scoped>
:deep(.sortable-ghost) {
  opacity: 0.4;
  background-color: rgba(88, 101, 242, 0.1);
}

:deep(.sortable-drag) {
  opacity: 0.8;
}

:deep(.v-list-item) {
  transition: all 0.2s ease;
}

:deep(.v-list-item):hover {
  cursor: grab;
}

:deep(.v-list-item):active {
  cursor: grabbing;
}
</style>
