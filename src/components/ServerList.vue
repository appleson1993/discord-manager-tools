<template>
  <div class="pa-2 d-flex flex-column" style="height: 100%">
    <v-list nav density="comfortable" class="flex-1-1-auto" lines="one">
      <v-list-item
        v-for="server in servers"
        :key="server.id"
        :active="server.id === selected"
        @click="$emit('update:selected', server.id)"
        rounded="lg"
      >
        <template #prepend>
          <v-avatar :color="server.color || 'primary'" size="36">
            <span class="text-subtitle-2 font-weight-bold">
              {{ (server.name || '?').charAt(0).toUpperCase() }}
            </span>
          </v-avatar>
        </template>
        <v-list-item-title class="text-body-2">
          {{ server.name }}
        </v-list-item-title>
      </v-list-item>

      <v-list-item v-if="!servers || servers.length === 0" disabled>
        <v-list-item-title class="text-body-2 text-medium-emphasis">
          尚未新增伺服器
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <div class="pt-2">
      <v-btn block color="primary" variant="tonal" @click="$emit('add')">
        <v-icon start icon="mdi-plus" />
        新增伺服器
      </v-btn>
    </div>
  </div>
</template>

<script setup>
defineProps({
  servers: Array,
  selected: String
})

defineEmits(['update:selected', 'add'])
</script>
