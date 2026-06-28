<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useCampusStore } from '../stores/campus'
import { CampusScene, type RoomInfoCard } from '../three/scene'

const store = useCampusStore()
const canvasContainer = ref<HTMLDivElement | null>(null)

let scene: CampusScene | null = null

// 信息卡
const hoverInfo = ref<RoomInfoCard | null>(null)
const clickInfo = ref<RoomInfoCard | null>(null)

const statusLegend = [
  { label: '空闲', color: '#10b981' },
  { label: '占用', color: '#6b7280' },
  { label: '报修', color: '#ef4444' },
  { label: '命中', color: '#3b82f6' },
]

const statusLabel = (s: string) => {
  const map: Record<string, string> = { free: '空闲', busy: '占用', repair: '报修' }
  return map[s] || s
}
const typeLabel = (t: string) => {
  const map: Record<string, string> = { meeting: '会议室', classroom: '教室', venue: '场馆', lab: '实验室' }
  return map[t] || t
}

onMounted(() => {
  if (!canvasContainer.value) return
  scene = new CampusScene()

  scene.onRoomHover = (info: RoomInfoCard | null) => {
    hoverInfo.value = info
  }

  scene.onRoomClick = (info: RoomInfoCard | null) => {
    clickInfo.value = info
    if (info) {
      store.selectedBuildingId = info.roomId
    } else {
      store.selectedBuildingId = null
    }
  }

  scene.init(canvasContainer.value, store.buildings)
})

// 监听高亮变化 → 联动 3D
watch(() => store.highlightedRoomIds, (ids) => {
  if (scene) scene.highlightRooms(ids)
}, { deep: true })

// 监听预约/报修导致的房间状态变化 → 同步 3D 颜色
watch(() => store.allRooms.map(r => ({ id: r.id, status: r.status })), (changes) => {
  if (!scene) return
  changes.forEach(({ id, status }) => {
    scene.updateRoomStatus(id, status)
  })
}, { deep: true })

onUnmounted(() => {
  if (scene) {
    scene.dispose()
    scene = null
  }
})

function closeInfoCard() {
  clickInfo.value = null
  store.selectedBuildingId = null
}
</script>

<template>
  <div ref="canvasContainer" class="absolute inset-0">
    <!-- Three.js Canvas 由 scene.init() 自动插入 -->
  </div>

  <!-- Hover 浮层 -->
  <Teleport to="body">
    <div
      v-if="hoverInfo && !clickInfo"
      class="fixed z-[9999] pointer-events-none px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm border border-white/15 text-white text-xs space-y-0.5 transition-opacity duration-100"
      :style="{ left: hoverInfo.screenX + 12 + 'px', top: hoverInfo.screenY - 10 + 'px' }"
    >
      <div class="font-medium">{{ hoverInfo.buildingName }} · {{ hoverInfo.roomName }}</div>
      <div class="text-white/60">{{ typeLabel(hoverInfo.type) }} · {{ hoverInfo.floor }}F · {{ hoverInfo.capacity }}人</div>
    </div>
  </Teleport>

  <!-- 点击信息卡 -->
  <Teleport to="body">
    <div
      v-if="clickInfo"
      class="fixed z-[9999] w-56 rounded-xl bg-[#111827]/95 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden"
      :style="{ left: Math.min(clickInfo.screenX + 16, window.innerWidth - 240) + 'px', top: Math.min(clickInfo.screenY - 20, window.innerHeight - 200) + 'px' }"
    >
      <!-- 头部 -->
      <div class="px-3 py-2.5 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div>
          <div class="text-white text-sm font-medium">{{ clickInfo.roomName }}</div>
          <div class="text-white/50 text-[11px]">{{ clickInfo.buildingName }} · {{ clickInfo.floor }}F</div>
        </div>
        <button @click="closeInfoCard" class="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <!-- 详情 -->
      <div class="px-3 py-2.5 space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-[10px] px-1.5 py-0.5 rounded border"
            :class="{
              'border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]': clickInfo.status === 'free',
              'border-gray-500/50 bg-gray-500/10 text-gray-400': clickInfo.status === 'busy',
              'border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ef4444]': clickInfo.status === 'repair',
            }"
          >{{ statusLabel(clickInfo.status) }}</span>
          <span class="text-white/40 text-[11px]">{{ typeLabel(clickInfo.type) }}</span>
          <span class="text-white/40 text-[11px]">{{ clickInfo.capacity }}人</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span v-for="eq in clickInfo.equipment" :key="eq" class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">{{ eq }}</span>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 状态图例 -->
  <div class="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 z-10">
    <div v-for="s in statusLegend" :key="s.label" class="flex items-center gap-1.5">
      <span class="w-2.5 h-2.5 rounded-full" :style="{ background: s.color }"></span>
      <span class="text-white/60 text-[11px]">{{ s.label }}</span>
    </div>
  </div>

  <!-- 右上角 KPI -->
  <div class="absolute top-4 right-4 flex flex-col gap-2 z-10">
    <div class="px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-right">
      <div class="text-white/40 text-[10px]">全校占用率</div>
      <div class="text-white/80 text-lg font-semibold">{{ store.occupancyRate }}%</div>
    </div>
    <div class="px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-right">
      <div class="text-white/40 text-[10px]">可用房间</div>
      <div class="text-lg font-semibold" style="color: #10b981">{{ store.freeRooms.length }}</div>
    </div>
  </div>

  <!-- 楼名标签（3D 对应的 HTML 标注） -->
  <div class="absolute top-4 left-4 flex flex-col gap-1 z-10">
    <div v-for="b in store.buildings" :key="b.id" class="px-2.5 py-1 rounded-md bg-black/30 backdrop-blur-sm border border-white/10">
      <div class="text-white/60 text-[11px] font-medium">{{ b.name }}</div>
    </div>
  </div>
</template>
