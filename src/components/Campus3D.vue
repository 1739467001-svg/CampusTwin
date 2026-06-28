<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCampusStore } from '../stores/campus'

const store = useCampusStore()
const canvasContainer = ref<HTMLDivElement | null>(null)

// 状态指示器
const statusLegend = [
  { label: '空闲', color: 'bg-status-free' },
  { label: '占用', color: 'bg-status-busy' },
  { label: '报修', color: 'bg-status-repair' },
  { label: '命中', color: 'bg-status-hit' },
]

// 3D 场景将在后续步骤接入 Three.js，当前为占位骨架
onMounted(() => {
  // TODO: init Three.js scene
})
onUnmounted(() => {
  // TODO: dispose Three.js resources
})
</script>

<template>
  <div ref="canvasContainer" class="absolute inset-0">
    <!-- 3D Canvas 占位 -->
    <div class="w-full h-full flex items-center justify-center bg-surface-dark">
      <div class="text-center space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-white/30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
        </div>
        <div class="space-y-1">
          <p class="text-white/40 text-sm font-medium">3D 校园孪生</p>
          <p class="text-white/25 text-xs">Three.js 场景加载中（下一步接入）</p>
        </div>
        <!-- 模拟建筑占位卡片 -->
        <div class="flex gap-3 justify-center mt-6">
          <div v-for="b in store.buildings" :key="b.id" class="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-left min-w-[100px]">
            <div class="text-white/50 text-xs font-medium">{{ b.name }}</div>
            <div class="text-white/30 text-[10px] mt-0.5">{{ b.floors.length }} 层 · {{ b.floors.reduce((sum, f) => sum + f.rooms.length, 0) }} 房间</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态图例 -->
    <div class="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
      <div v-for="s in statusLegend" :key="s.label" class="flex items-center gap-1.5">
        <span :class="['w-2.5 h-2.5 rounded-full', s.color]"></span>
        <span class="text-white/60 text-[11px]">{{ s.label }}</span>
      </div>
    </div>

    <!-- 右上角信息 -->
    <div class="absolute top-4 right-4 flex flex-col gap-2">
      <div class="px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-right">
        <div class="text-white/40 text-[10px]">全校占用率</div>
        <div class="text-white/80 text-lg font-semibold">{{ store.occupancyRate }}%</div>
      </div>
      <div class="px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-right">
        <div class="text-white/40 text-[10px]">可用房间</div>
        <div class="text-status-free text-lg font-semibold">{{ store.freeRooms.length }}</div>
      </div>
    </div>
  </div>
</template>
