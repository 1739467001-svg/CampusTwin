import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type RoomType = 'meeting' | 'classroom' | 'venue' | 'lab'
export type RoomStatus = 'free' | 'busy' | 'repair'

export interface Room {
  id: string
  name: string
  type: RoomType
  floorId: string
  capacity: number
  equipment: string[]
  status: RoomStatus
  schedule: { start: string; end: string; by: string }[]
}

export interface Floor {
  id: string
  buildingId: string
  level: number
  rooms: Room[]
}

export interface Building {
  id: string
  name: string
  position: [number, number]
  floors: Floor[]
}

export interface Device {
  id: string
  roomId: string
  type: 'projector' | 'ac' | 'light' | 'mic'
  status: 'ok' | 'fault'
}

export interface Booking {
  id: string
  roomId: string
  user: string
  start: string
  end: string
  status: 'ok' | 'cancelled'
}

export interface Ticket {
  id: string
  deviceId: string
  roomId: string
  desc: string
  status: 'new' | 'doing' | 'done'
  assignee: string
}

export interface Energy {
  buildingId: string
  kwh: number
  ts: string
}

export interface Traffic {
  zoneId: string
  count: number
  ts: string
}

export interface User {
  id: string
  role: 'student' | 'teacher' | 'admin' | 'visitor'
  name: string
}

export type IntentType = 'book_room' | 'find_free_classroom' | 'repair' | 'navigate' | 'admin_overview' | 'unknown'

export interface Intent {
  intent: IntentType
  slots: { time?: string; equipment?: string[]; building?: string; room?: string; device?: string; target?: string }
  agent: '预约Agent' | '报修Agent' | '导航Agent' | '态势Agent' | '调度Agent'
  confidence: number
}

// 右栏面板类型
export type PanelType = 'booking' | 'repair' | 'navigate' | 'admin' | 'none'
export type ViewMode = 'student' | 'admin'
export type HeatmapMode = 'energy' | 'traffic' | 'off'

export const useCampusStore = defineStore('campus', () => {
  // === State ===
  const buildings = ref<Building[]>([])
  const devices = ref<Device[]>([])
  const bookings = ref<Booking[]>([])
  const tickets = ref<Ticket[]>([])
  const energies = ref<Energy[]>([])
  const traffics = ref<Traffic[]>([])
  const currentUser = ref<User>({ id: 'u1', role: 'student', name: '张同学' })
  const messages = ref<{ role: 'user' | 'agent'; content: string; steps?: string[] }[]>([
    { role: 'agent', content: '你好！我是 CampusTwin 调度助手。试试说「帮我订明天下午有投影的会议室」或「三号楼302投影坏了」。' }
  ])
  const activePanel = ref<PanelType>('none')
  const highlightedRoomIds = ref<string[]>([])
  const selectedBuildingId = ref<string | null>(null)
  const viewMode = ref<ViewMode>('student')
  const heatmapMode = ref<HeatmapMode>('off')
  const focusBuildingId = ref<string | null>(null)

  // === Getters ===
  const allRooms = computed(() => {
    const rooms: Room[] = []
    buildings.value.forEach(b => b.floors.forEach(f => rooms.push(...f.rooms)))
    return rooms
  })

  const freeRooms = computed(() => allRooms.value.filter(r => r.status === 'free'))

  const occupancyRate = computed(() => {
    const total = allRooms.value.length
    if (!total) return 0
    const busy = allRooms.value.filter(r => r.status === 'busy').length
    return Math.round((busy / total) * 100)
  })

  // 教室占用率
  const classroomOccupancyRate = computed(() => {
    const rooms = allRooms.value.filter(r => r.type === 'classroom')
    if (!rooms.length) return 0
    return Math.round((rooms.filter(r => r.status === 'busy').length / rooms.length) * 100)
  })

  // 会议室占用率
  const meetingOccupancyRate = computed(() => {
    const rooms = allRooms.value.filter(r => r.type === 'meeting')
    if (!rooms.length) return 0
    return Math.round((rooms.filter(r => r.status === 'busy').length / rooms.length) * 100)
  })

  // 今日总能耗
  const totalEnergy = computed(() => energies.value.reduce((s, e) => s + e.kwh, 0))

  // 当前在校人流
  const totalTraffic = computed(() => traffics.value.reduce((s, t) => s + t.count, 0))

  // 各楼占用率（给图表用）
  const buildingOccupancyData = computed(() => {
    return buildings.value.map(b => {
      const rooms = b.floors.flatMap(f => f.rooms)
      const busy = rooms.filter(r => r.status === 'busy').length
      const total = rooms.length
      return {
        buildingId: b.id,
        name: b.name,
        rate: total > 0 ? Math.round((busy / total) * 100) : 0,
        total,
        busy,
      }
    }).sort((a, b) => b.rate - a.rate)
  })

  // === Actions ===
  function initMockData() {
    // 3-5 栋楼，每栋 2-3 层
    const b1: Building = {
      id: 'b1', name: '综合教学楼', position: [0, 0],
      floors: [
        { id: 'b1-f1', buildingId: 'b1', level: 1, rooms: [
          { id: 'r101', name: '101教室', type: 'classroom', floorId: 'b1-f1', capacity: 60, equipment: ['投影','音响'], status: 'free', schedule: [] },
          { id: 'r102', name: '102会议室', type: 'meeting', floorId: 'b1-f1', capacity: 20, equipment: ['投影','白板'], status: 'free', schedule: [] },
        ]},
        { id: 'b1-f2', buildingId: 'b1', level: 2, rooms: [
          { id: 'r201', name: '201教室', type: 'classroom', floorId: 'b1-f2', capacity: 80, equipment: ['投影','音响','空调'], status: 'busy', schedule: [{ start:'08:00', end:'12:00', by:'王老师' }] },
          { id: 'r202', name: '202实验室', type: 'lab', floorId: 'b1-f2', capacity: 30, equipment: ['电脑','投影'], status: 'free', schedule: [] },
        ]},
      ]
    }
    const b2: Building = {
      id: 'b2', name: '图书馆', position: [60, 40],
      floors: [
        { id: 'b2-f1', buildingId: 'b2', level: 1, rooms: [
          { id: 'r301', name: '301自习室', type: 'classroom', floorId: 'b2-f1', capacity: 40, equipment: ['空调'], status: 'free', schedule: [] },
          { id: 'r302', name: '302研讨室', type: 'meeting', floorId: 'b2-f1', capacity: 10, equipment: ['投影','白板'], status: 'free', schedule: [] },
        ]},
        { id: 'b2-f2', buildingId: 'b2', level: 2, rooms: [
          { id: 'r303', name: '303电子阅览室', type: 'lab', floorId: 'b2-f2', capacity: 50, equipment: ['电脑','投影'], status: 'busy', schedule: [{ start:'14:00', end:'17:00', by:'李老师' }] },
        ]},
      ]
    }
    const b3: Building = {
      id: 'b3', name: '学生活动中心', position: [-50, 30],
      floors: [
        { id: 'b3-f1', buildingId: 'b3', level: 1, rooms: [
          { id: 'r401', name: '401多功能厅', type: 'venue', floorId: 'b3-f1', capacity: 200, equipment: ['投影','音响','灯光','舞台'], status: 'free', schedule: [] },
        ]},
        { id: 'b3-f2', buildingId: 'b3', level: 2, rooms: [
          { id: 'r402', name: '402会议室', type: 'meeting', floorId: 'b3-f2', capacity: 16, equipment: ['投影','白板','空调'], status: 'repair', schedule: [] },
        ]},
      ]
    }
    buildings.value = [b1, b2, b3]

    devices.value = [
      { id: 'd1', roomId: 'r101', type: 'projector', status: 'ok' },
      { id: 'd2', roomId: 'r102', type: 'projector', status: 'ok' },
      { id: 'd3', roomId: 'r201', type: 'ac', status: 'ok' },
      { id: 'd4', roomId: 'r202', type: 'projector', status: 'fault' },
      { id: 'd5', roomId: 'r401', type: 'light', status: 'ok' },
    ]

    bookings.value = [
      { id: 'bk1', roomId: 'r201', user: '王老师', start: '08:00', end: '12:00', status: 'ok' },
      { id: 'bk2', roomId: 'r303', user: '李老师', start: '14:00', end: '17:00', status: 'ok' },
    ]

    tickets.value = [
      { id: 'tk1', deviceId: 'd4', roomId: 'r202', desc: '投影仪无法开机', status: 'doing', assignee: '后勤-张工' },
    ]

    energies.value = [
      { buildingId: 'b1', kwh: 1240, ts: '2026-06-28T10:00:00' },
      { buildingId: 'b2', kwh: 890, ts: '2026-06-28T10:00:00' },
      { buildingId: 'b3', kwh: 560, ts: '2026-06-28T10:00:00' },
    ]

    traffics.value = [
      { zoneId: 'b1', count: 320, ts: '2026-06-28T10:00:00' },
      { zoneId: 'b2', count: 180, ts: '2026-06-28T10:00:00' },
      { zoneId: 'b3', count: 45, ts: '2026-06-28T10:00:00' },
    ]
  }

  function addMessage(role: 'user' | 'agent', content: string, steps?: string[]) {
    messages.value.push({ role, content, steps })
  }

  function setActivePanel(panel: PanelType) {
    activePanel.value = panel
  }

  function highlightRooms(ids: string[]) {
    highlightedRoomIds.value = ids
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function setHeatmapMode(mode: HeatmapMode) {
    heatmapMode.value = mode
  }

  function setFocusBuilding(buildingId: string | null) {
    focusBuildingId.value = buildingId
    // 3 秒后自动取消聚焦
    if (buildingId) {
      setTimeout(() => {
        if (focusBuildingId.value === buildingId) {
          focusBuildingId.value = null
        }
      }, 3000)
    }
  }

  function bookRoom(roomId: string, start: string, end: string) {
    const room = allRooms.value.find(r => r.id === roomId)
    if (!room) return false
    bookings.value.push({
      id: `bk_${Date.now()}`, roomId, user: currentUser.value.name, start, end, status: 'ok'
    })
    room.status = 'busy'
    room.schedule.push({ start, end, by: currentUser.value.name })
    return true
  }

  function createTicket(deviceId: string, roomId: string, desc: string) {
    tickets.value.push({
      id: `tk_${Date.now()}`, deviceId, roomId, desc, status: 'new', assignee: '待分配'
    })
    const room = allRooms.value.find(r => r.id === roomId)
    if (room) room.status = 'repair'
    return true
  }

  // 初始化
  initMockData()

  return {
    buildings, devices, bookings, tickets, energies, traffics,
    currentUser, messages, activePanel, highlightedRoomIds, selectedBuildingId,
    viewMode, heatmapMode, focusBuildingId,
    allRooms, freeRooms, occupancyRate, classroomOccupancyRate, meetingOccupancyRate,
    totalEnergy, totalTraffic, buildingOccupancyData,
    addMessage, setActivePanel, highlightRooms, setViewMode, setHeatmapMode, setFocusBuilding,
    bookRoom, createTicket, initMockData
  }
})
