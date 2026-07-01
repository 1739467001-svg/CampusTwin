<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCampusStore } from '../stores/campus'
import { CampusScene, type RoomInfoCard } from '../three/scene'

const store = useCampusStore()
const canvasContainer = ref<HTMLDivElement | null>(null)

let scene: CampusScene | null = null

const hoverInfo = ref<RoomInfoCard | null>(null)
const clickInfo = ref<RoomInfoCard | null>(null)
const expandedBuildings = ref<Set<string>>(new Set())

// 窗口尺寸（模板中使用）
const winWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const winHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    winWidth.value = window.innerWidth
    winHeight.value = window.innerHeight
  })
}

const statusLegend = [
  { label: '空闲', color: '#10b981' },
  { label: '占用', color: '#94a3b8' },
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
      // 自动联动右侧面板
      if (info.canBook) {
        store.setActivePanel('booking')
      } else if (info.status === 'repair') {
        store.setActivePanel('repair')
      }
    } else {
      store.selectedBuildingId = null
    }
  }

  scene.init(canvasContainer.value, store.buildings)
})

// 高亮房间
watch(() => store.highlightedRoomIds, (ids) => {
  if (scene) scene.highlightRooms(ids)
}, { deep: true })

// 房间状态变化同步到 3D
watch(() => store.allRooms.map(r => ({ id: r.id, status: r.status })), (changes) => {
  if (!scene) return
  changes.forEach(({ id, status }) => {
    scene!.updateRoomStatus(id, status)
  })
}, { deep: true })

// 热力图
watch(() => store.heatmapMode, (mode) => {
  if (!scene) return
  if (mode === 'off') {
    scene.clearHeatMap()
    return
  }
  const heatData = new Map<string, number>()
  store.allRooms.forEach(room => {
    if (mode === 'energy') {
      const buildingEnergy = store.energies.find(e => e.buildingId === room.floorId.split('-')[0])?.kwh || 500
      const floorsInBuilding = store.buildings.find(b => b.id === room.floorId.split('-')[0])?.floors.length || 1
      const roomsInFloor = store.buildings
        .find(b => b.id === room.floorId.split('-')[0])
        ?.floors.find(f => f.id === room.floorId)?.rooms.length || 1
      const perRoom = buildingEnergy / (floorsInBuilding * roomsInFloor)
      const busy = room.status === 'busy' ? 1.5 : room.status === 'repair' ? 0.8 : 0.3
      heatData.set(room.id, Math.min(1, (perRoom / 200) * busy))
    } else if (mode === 'traffic') {
      const traffic = store.traffics.find(t => t.zoneId === room.floorId.split('-')[0])?.count || 100
      const busy = room.status === 'busy' ? 1.2 : 0.3
      heatData.set(room.id, Math.min(1, (traffic / 500) * busy))
    }
  })
  scene.updateHeatMap(heatData)
})

// 聚焦建筑
watch(() => store.focusBuildingId, (buildingId) => {
  if (!scene || !buildingId) return
  scene.focusBuilding(buildingId)
})

// Agent 指令触发 3D 联动
watch(() => store.activePanel, (panel) => {
  if (!scene) return
  if (panel === 'booking' && store.highlightedRoomIds.length > 0) {
    const firstId = store.highlightedRoomIds[0]
    scene.focusRoom(firstId)
  }
})

// flyToTarget — Agent 发出飞行指令后，3D 场景飞行到目标建筑
watch(() => store.flyToTarget, (target) => {
  if (!scene || !target) return
  scene.flyTo(target, () => {
    store.flyToTarget = null
  })
})

// 模拟时间变化后，同步热力图（如果在开启状态）
watch(() => store.simulatedHour, () => {
  // 时间变化后房间状态已由 store 的 tickSimulation 更新
  // 如果热力图开着，需要刷新
  if (store.heatmapMode !== 'off' && scene) {
    // 触发热力图重新计算
    const mode = store.heatmapMode
    store.heatmapMode = 'off'
    setTimeout(() => { store.heatmapMode = mode }, 50)
  }
})

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

function bookFrom3D(roomId: string) {
  const ok = store.bookRoom(roomId, '14:00', '16:00')
  if (ok) {
    store.addMessage('agent', `已从 3D 场景完成预约！凭证号 BK${Date.now().toString().slice(-6)}`)
    // 3D 中房间颜色会自动通过 watch 同步
    closeInfoCard()
  }
}

function repairFrom3D(roomId: string) {
  const room = store.allRooms.find(r => r.id === roomId)
  if (!room) return
  const deviceType = room.equipment[0] || 'projector'
  const device = store.devices.find(d => d.roomId === roomId && d.type === deviceType)
  store.createTicket(device?.id || 'unknown', roomId, `${deviceType}故障`)
  store.addMessage('agent', `已从 3D 场景提交报修，工单号 TK${Date.now().toString().slice(-6)}`)
  closeInfoCard()
}

function toggleExpand(buildingId: string) {
  if (!scene) return
  scene.toggleBuildingExpand(buildingId)
  if (expandedBuildings.value.has(buildingId)) {
    expandedBuildings.value.delete(buildingId)
  } else {
    expandedBuildings.value.add(buildingId)
  }
}

function flyToBuilding(buildingId: string) {
  if (!scene) return
  scene.flyTo(buildingId, () => {
    // 飞行完成后自动展开
    if (!expandedBuildings.value.has(buildingId)) {
      toggleExpand(buildingId)
    }
  })
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
      class="fixed z-[9999] pointer-events-none px-3 py-2 rounded-xl text-white text-[11px] space-y-0.5 transition-opacity duration-100"
      style="background: rgba(14,58,103,0.9); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.2);"
      :style="{ left: hoverInfo.screenX + 12 + 'px', top: hoverInfo.screenY - 10 + 'px' }"
    >
      <div class="font-medium text-[12px]">{{ hoverInfo.buildingName }} · {{ hoverInfo.roomName }}</div>
      <div style="color: rgba(255,255,255,0.55);">{{ typeLabel(hoverInfo.type) }} · {{ hoverInfo.floor }}F · {{ hoverInfo.capacity }}人</div>
      <div class="flex items-center gap-1.5 mt-1">
        <span class="w-1.5 h-1.5 rounded-full"
          :style="{ background: hoverInfo.status === 'free' ? '#10b981' : hoverInfo.status === 'busy' ? '#94a3b8' : '#ef4444' }"></span>
        <span class="text-[10px]">{{ statusLabel(hoverInfo.status) }}</span>
        <span v-if="hoverInfo.canBook" class="text-[10px] px-1.5 py-0.5 rounded-full ml-1" style="background: rgba(37,99,235,0.3); color: #93bbfd;">可预约</span>
      </div>
    </div>
  </Teleport>

  <!-- 点击信息卡 —— 含 3D 操作按钮 -->
  <Teleport to="body">
    <div
      v-if="clickInfo"
      class="fixed z-[9999] w-64 rounded-2xl overflow-hidden"
      style="background: rgba(255,255,255,0.97); backdrop-filter: blur(16px); border: 1px solid rgba(148,163,184,0.15); box-shadow: 0 16px 48px rgba(0,0,0,0.12);"
      :style="{ left: Math.min(clickInfo.screenX + 16, winWidth - 280) + 'px', top: Math.min(clickInfo.screenY - 20, winHeight - 320) + 'px' }"
    >
      <!-- 头部 -->
      <div class="px-4 py-3 flex items-center justify-between" style="border-bottom: 1px solid rgba(148,163,184,0.1);">
        <div>
          <div class="text-[13px] font-semibold" style="color: #1e293b;">{{ clickInfo.roomName }}</div>
          <div style="color: #94a3b8;" class="text-[11px]">{{ clickInfo.buildingName }} · {{ clickInfo.floor }}F</div>
        </div>
        <button @click="closeInfoCard" class="w-6 h-6 rounded-lg flex items-center justify-center transition text-[#cbd5e1] hover:text-[#64748b] hover:bg-[#f1f5f9]">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 信息区 -->
      <div class="px-4 py-3 space-y-2.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
            :class="clickInfo.status === 'free' ? 'bg-emerald-50 text-emerald-600' : clickInfo.status === 'busy' ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-500'"
          >{{ statusLabel(clickInfo.status) }}</span>
          <span class="text-[11px] text-slate-400">{{ typeLabel(clickInfo.type) }}</span>
          <span class="text-[11px] text-slate-400">{{ clickInfo.capacity }}人</span>
        </div>

        <div class="flex flex-wrap gap-1">
          <span v-for="eq in clickInfo.equipment" :key="eq" class="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100">{{ eq }}</span>
        </div>

        <!-- 3D 直接操作按钮 -->
        <div class="flex gap-2 pt-1">
          <button
            v-if="clickInfo.canBook"
            @click="bookFrom3D(clickInfo.roomId)"
            class="flex-1 py-2 rounded-lg text-[12px] font-medium text-white transition hover:scale-[1.02] active:scale-[0.98]"
            style="background: linear-gradient(135deg, #2563eb, #1d4ed8);"
          >
            预约此教室
          </button>
          <button
            v-if="clickInfo.canRepair"
            @click="repairFrom3D(clickInfo.roomId)"
            class="flex-1 py-2 rounded-lg text-[12px] font-medium transition hover:scale-[1.02] active:scale-[0.98] bg-red-50 text-red-500 border border-red-100 hover:bg-red-100"
          >
            报修
          </button>
        </div>

        <!-- 展开楼层 -->
        <button
          @click="toggleExpand(clickInfo.roomId.split('-')[0])"
          class="w-full py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-600 transition flex items-center justify-center gap-1"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          {{ expandedBuildings.has(clickInfo.roomId.split('-')[0]) ? '收起楼层' : '展开楼层' }}
        </button>
      </div>
    </div>
  </Teleport>

  <!-- 状态图例 -->
  <div class="absolute bottom-5 left-5 flex items-center gap-3 px-3.5 py-2 rounded-xl z-10"
    style="background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(148,163,184,0.12); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
    <div v-for="s in statusLegend" :key="s.label" class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full" :style="{ background: s.color }"></span>
      <span class="text-[11px] text-slate-500">{{ s.label }}</span>
    </div>
  </div>

  <!-- 右上角 KPI -->
  <div class="absolute top-5 right-5 flex flex-col gap-2 z-10">
    <div class="px-4 py-2.5 rounded-xl text-right"
      style="background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(148,163,184,0.12); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <div class="text-[10px] text-slate-400">全校占用率</div>
      <div class="text-xl font-semibold font-mono text-slate-700">{{ store.occupancyRate }}%</div>
    </div>
    <div class="px-4 py-2.5 rounded-xl text-right"
      style="background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(148,163,184,0.12); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <div class="text-[10px] text-slate-400">可用房间</div>
      <div class="text-xl font-semibold font-mono text-emerald-500">{{ store.freeRooms.length }}</div>
    </div>
  </div>

  <!-- 建筑快捷导航 -->
  <div class="absolute top-5 left-5 flex flex-col gap-1.5 z-10">
    <div v-for="b in store.buildings" :key="b.id"
      class="px-3 py-2 rounded-xl cursor-pointer transition hover:scale-[1.02]"
      style="background: rgba(255,255,255,0.85); backdrop-filter: blur(8px); border: 1px solid rgba(148,163,184,0.12); box-shadow: 0 2px 8px rgba(0,0,0,0.04);"
      @click="flyToBuilding(b.id)"
    >
      <div class="text-[11px] font-medium text-slate-600">{{ b.name }}</div>
      <div class="text-[10px] text-slate-400">{{ b.floors.length }}层 · {{ b.floors.reduce((s, f) => s + f.rooms.length, 0) }}间</div>
    </div>
  </div>

  <!-- 3D 操作提示 -->
  <div class="absolute bottom-5 right-5 z-10">
    <div class="px-3 py-2 rounded-xl text-[10px] text-slate-400"
      style="background: rgba(255,255,255,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(148,163,184,0.1);">
      点击房间查看详情 · 拖拽旋转 · 滚轮缩放
    </div>
  </div>
</template>
