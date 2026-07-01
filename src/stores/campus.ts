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

  // 模拟时间系统 (0-23, 默认10点即上午)
  const simulatedHour = ref<number>(10)

  // 3D 场景飞行目标 (buildingId)
  const flyToTarget = ref<string | null>(null)

  // === U2: 社会价值 ===
  const todayCompleted = ref(127)  // 今日已办件数
  const avgTimeSeconds = ref(9)    // 平均处理秒数
  const accessibilityMode = ref(false)  // 无障碍/新生模式

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
    // ========== b1: 综合教学楼 ==========
    const b1: Building = {
      id: 'b1', name: '综合教学楼', position: [0, 0],
      floors: [
        { id: 'b1-f1', buildingId: 'b1', level: 1, rooms: [
          { id: 'r101', name: '101教室', type: 'classroom', floorId: 'b1-f1', capacity: 60, equipment: ['投影', '音响'], status: 'free', schedule: [] },
          { id: 'r102', name: '102教室', type: 'classroom', floorId: 'b1-f1', capacity: 50, equipment: ['投影'], status: 'free', schedule: [] },
          { id: 'r103', name: '103会议室', type: 'meeting', floorId: 'b1-f1', capacity: 20, equipment: ['投影', '白板'], status: 'free', schedule: [] },
          { id: 'r104', name: '104教室', type: 'classroom', floorId: 'b1-f1', capacity: 45, equipment: ['投影', '空调'], status: 'free', schedule: [] },
        ]},
        { id: 'b1-f2', buildingId: 'b1', level: 2, rooms: [
          { id: 'r201', name: '201教室', type: 'classroom', floorId: 'b1-f2', capacity: 80, equipment: ['投影', '音响', '空调'], status: 'busy', schedule: [{ start: '08:00', end: '12:00', by: '王老师' }] },
          { id: 'r202', name: '202实验室', type: 'lab', floorId: 'b1-f2', capacity: 30, equipment: ['电脑', '投影'], status: 'free', schedule: [] },
          { id: 'r203', name: '203教室', type: 'classroom', floorId: 'b1-f2', capacity: 70, equipment: ['投影', '音响'], status: 'free', schedule: [] },
        ]},
      ]
    }

    // ========== b2: 图书馆 ==========
    const b2: Building = {
      id: 'b2', name: '图书馆', position: [60, 40],
      floors: [
        { id: 'b2-f1', buildingId: 'b2', level: 1, rooms: [
          { id: 'r301', name: '301自习室', type: 'classroom', floorId: 'b2-f1', capacity: 40, equipment: ['空调'], status: 'free', schedule: [] },
          { id: 'r302', name: '302研讨室', type: 'meeting', floorId: 'b2-f1', capacity: 10, equipment: ['投影', '白板'], status: 'free', schedule: [] },
          { id: 'r303', name: '303自习室B', type: 'classroom', floorId: 'b2-f1', capacity: 35, equipment: ['空调'], status: 'free', schedule: [] },
          { id: 'r304', name: '304多媒体室', type: 'lab', floorId: 'b2-f1', capacity: 25, equipment: ['电脑', '投影'], status: 'free', schedule: [] },
        ]},
        { id: 'b2-f2', buildingId: 'b2', level: 2, rooms: [
          { id: 'r305', name: '305电子阅览室', type: 'lab', floorId: 'b2-f2', capacity: 50, equipment: ['电脑', '投影'], status: 'busy', schedule: [{ start: '14:00', end: '17:00', by: '李老师' }] },
          { id: 'r306', name: '306研讨室', type: 'meeting', floorId: 'b2-f2', capacity: 8, equipment: ['白板', '投影'], status: 'free', schedule: [] },
          { id: 'r307', name: '307特藏室', type: 'classroom', floorId: 'b2-f2', capacity: 15, equipment: ['空调'], status: 'free', schedule: [] },
        ]},
      ]
    }

    // ========== b3: 学生活动中心 ==========
    const b3: Building = {
      id: 'b3', name: '学生活动中心', position: [-50, 30],
      floors: [
        { id: 'b3-f1', buildingId: 'b3', level: 1, rooms: [
          { id: 'r401', name: '401多功能厅', type: 'venue', floorId: 'b3-f1', capacity: 200, equipment: ['投影', '音响', '灯光', '舞台'], status: 'free', schedule: [] },
          { id: 'r402', name: '402排练室', type: 'venue', floorId: 'b3-f1', capacity: 30, equipment: ['音响', '镜子'], status: 'free', schedule: [] },
          { id: 'r403', name: '403社团办公室', type: 'meeting', floorId: 'b3-f1', capacity: 12, equipment: ['白板'], status: 'free', schedule: [] },
        ]},
        { id: 'b3-f2', buildingId: 'b3', level: 2, rooms: [
          { id: 'r404', name: '404会议室', type: 'meeting', floorId: 'b3-f2', capacity: 16, equipment: ['投影', '白板', '空调'], status: 'repair', schedule: [] },
          { id: 'r405', name: '405学术报告厅', type: 'venue', floorId: 'b3-f2', capacity: 120, equipment: ['投影', '音响', '灯光', '空调'], status: 'free', schedule: [] },
          { id: 'r406', name: '406讨论室', type: 'meeting', floorId: 'b3-f2', capacity: 8, equipment: ['白板'], status: 'free', schedule: [] },
        ]},
      ]
    }

    // ========== b4: 信息楼 ==========
    const b4: Building = {
      id: 'b4', name: '信息楼', position: [-60, -20],
      floors: [
        { id: 'b4-f1', buildingId: 'b4', level: 1, rooms: [
          { id: 'r501', name: '501计算机网络实验室', type: 'lab', floorId: 'b4-f1', capacity: 40, equipment: ['电脑', '投影', '交换机'], status: 'free', schedule: [] },
          { id: 'r502', name: '502软件工程实验室', type: 'lab', floorId: 'b4-f1', capacity: 35, equipment: ['电脑', '投影'], status: 'free', schedule: [] },
          { id: 'r503', name: '503教室', type: 'classroom', floorId: 'b4-f1', capacity: 60, equipment: ['投影', '音响'], status: 'free', schedule: [] },
          { id: 'r504', name: '504人工智能实验室', type: 'lab', floorId: 'b4-f1', capacity: 30, equipment: ['电脑', 'GPU服务器', '投影'], status: 'free', schedule: [] },
        ]},
        { id: 'b4-f2', buildingId: 'b4', level: 2, rooms: [
          { id: 'r505', name: '505大数据实验室', type: 'lab', floorId: 'b4-f2', capacity: 25, equipment: ['电脑', '投影'], status: 'free', schedule: [] },
          { id: 'r506', name: '506物联网实验室', type: 'lab', floorId: 'b4-f2', capacity: 20, equipment: ['电脑', '传感器设备', '投影'], status: 'free', schedule: [] },
          { id: 'r507', name: '507嵌入式实验室', type: 'lab', floorId: 'b4-f2', capacity: 20, equipment: ['电脑', '示波器', '开发板'], status: 'free', schedule: [] },
        ]},
      ]
    }

    // ========== b5: 行政楼 ==========
    const b5: Building = {
      id: 'b5', name: '行政楼', position: [80, 0],
      floors: [
        { id: 'b5-f1', buildingId: 'b5', level: 1, rooms: [
          { id: 'r601', name: '601教务处办公室', type: 'meeting', floorId: 'b5-f1', capacity: 10, equipment: ['白板', '空调'], status: 'free', schedule: [] },
          { id: 'r602', name: '602大会议室', type: 'meeting', floorId: 'b5-f1', capacity: 40, equipment: ['投影', '音响', '白板', '空调'], status: 'free', schedule: [] },
          { id: 'r603', name: '603行政办公室', type: 'meeting', floorId: 'b5-f1', capacity: 8, equipment: ['空调'], status: 'free', schedule: [] },
          { id: 'r604', name: '604接待室', type: 'meeting', floorId: 'b5-f1', capacity: 12, equipment: ['沙发', '茶几', '空调'], status: 'free', schedule: [] },
        ]},
        { id: 'b5-f2', buildingId: 'b5', level: 2, rooms: [
          { id: 'r605', name: '605党委会议室', type: 'meeting', floorId: 'b5-f2', capacity: 30, equipment: ['投影', '音响', '空调'], status: 'free', schedule: [] },
          { id: 'r606', name: '606财务办公室', type: 'meeting', floorId: 'b5-f2', capacity: 6, equipment: ['电脑', '保险柜'], status: 'free', schedule: [] },
          { id: 'r607', name: '607档案室', type: 'classroom', floorId: 'b5-f2', capacity: 5, equipment: ['空调', '监控'], status: 'free', schedule: [] },
        ]},
        { id: 'b5-f3', buildingId: 'b5', level: 3, rooms: [
          { id: 'r608', name: '608校长办公室', type: 'meeting', floorId: 'b5-f3', capacity: 8, equipment: ['投影', '空调', '沙发'], status: 'free', schedule: [] },
          { id: 'r609', name: '609贵宾接待室', type: 'meeting', floorId: 'b5-f3', capacity: 15, equipment: ['音响', '空调', '投影'], status: 'free', schedule: [] },
          { id: 'r610', name: '610学术委员会办公室', type: 'meeting', floorId: 'b5-f3', capacity: 20, equipment: ['投影', '白板', '空调'], status: 'free', schedule: [] },
        ]},
      ]
    }

    buildings.value = [b1, b2, b3, b4, b5]

    devices.value = [
      { id: 'd1', roomId: 'r101', type: 'projector', status: 'ok' },
      { id: 'd2', roomId: 'r102', type: 'projector', status: 'ok' },
      { id: 'd3', roomId: 'r201', type: 'ac', status: 'ok' },
      { id: 'd4', roomId: 'r202', type: 'projector', status: 'fault' },
      { id: 'd5', roomId: 'r401', type: 'light', status: 'ok' },
      { id: 'd6', roomId: 'r501', type: 'projector', status: 'ok' },
      { id: 'd7', roomId: 'r504', type: 'ac', status: 'ok' },
      { id: 'd8', roomId: 'r602', type: 'mic', status: 'ok' },
      { id: 'd9', roomId: 'r602', type: 'projector', status: 'ok' },
      { id: 'd10', roomId: 'r608', type: 'ac', status: 'ok' },
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
      { buildingId: 'b4', kwh: 1100, ts: '2026-06-28T10:00:00' },
      { buildingId: 'b5', kwh: 720, ts: '2026-06-28T10:00:00' },
    ]

    traffics.value = [
      { zoneId: 'b1', count: 320, ts: '2026-06-28T10:00:00' },
      { zoneId: 'b2', count: 180, ts: '2026-06-28T10:00:00' },
      { zoneId: 'b3', count: 45, ts: '2026-06-28T10:00:00' },
      { zoneId: 'b4', count: 210, ts: '2026-06-28T10:00:00' },
      { zoneId: 'b5', count: 95, ts: '2026-06-28T10:00:00' },
    ]
  }

  /**
   * 模拟时间推进：将 simulatedHour 前进 1 小时（循环 0-23），
   * 并根据简单课程表模式更新房间状态：
   *   8-12 点：教室/实验室 busy
   *   12-14 点：部分 free（午休）
   *   14-16 点：教室/实验室 busy
   *   16-18 点：free
   *   18 点后：全 free
   *   0-8 点：全 free
   * 会议室和多功能厅按随机概率 busy，其余房间保持 repair 不变。
   */
  function tickSimulation() {
    // 推进模拟时间
    simulatedHour.value = (simulatedHour.value + 1) % 24
    const h = simulatedHour.value

    for (const building of buildings.value) {
      for (const floor of building.floors) {
        for (const room of floor.rooms) {
          // 维修中的房间保持不变
          if (room.status === 'repair') continue

          if (room.type === 'classroom' || room.type === 'lab') {
            if (h >= 8 && h < 12) {
              // 上午课程
              room.status = 'busy'
              room.schedule = [{ start: '08:00', end: '12:00', by: '自动排课' }]
            } else if (h >= 12 && h < 14) {
              // 午休
              room.status = 'free'
              room.schedule = []
            } else if (h >= 14 && h < 16) {
              // 下午课程
              room.status = 'busy'
              room.schedule = [{ start: '14:00', end: '16:00', by: '自动排课' }]
            } else if (h >= 16 && h < 18) {
              // 傍晚空闲
              room.status = 'free'
              room.schedule = []
            } else {
              // 夜间/凌晨全空闲
              room.status = 'free'
              room.schedule = []
            }
          } else if (room.type === 'meeting') {
            // 工作时间 8-17，会议室约 60% 概率 busy
            if (h >= 8 && h < 17) {
              room.status = Math.random() > 0.4 ? 'busy' : 'free'
              if (room.status === 'busy') {
                room.schedule = [{ start: `${String(h).padStart(2, '0')}:00`, end: `${String(h + 1).padStart(2, '0')}:00`, by: '预约用户' }]
              } else {
                room.schedule = []
              }
            } else {
              room.status = 'free'
              room.schedule = []
            }
          } else if (room.type === 'venue') {
            // 多功能厅/报告厅：白天偶尔使用
            if (h >= 9 && h < 17) {
              room.status = Math.random() > 0.7 ? 'busy' : 'free'
              if (room.status === 'busy') {
                room.schedule = [{ start: `${String(h).padStart(2, '0')}:00`, end: `${String(h + 2).padStart(2, '0')}:00`, by: '活动组织者' }]
              } else {
                room.schedule = []
              }
            } else {
              room.status = 'free'
              room.schedule = []
            }
          }
        }
      }
    }
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

  function setAccessibilityMode(enabled: boolean) {
    accessibilityMode.value = enabled
  }

  function incrementCompleted() {
    todayCompleted.value += 1
  }

  // 初始化（只调用一次，删除了原来重复的第二次调用）
  initMockData()

  return {
    buildings, devices, bookings, tickets, energies, traffics,
    currentUser, messages, activePanel, highlightedRoomIds, selectedBuildingId,
    viewMode, heatmapMode, focusBuildingId,
    simulatedHour, flyToTarget,
    todayCompleted, avgTimeSeconds, accessibilityMode,
    allRooms, freeRooms, occupancyRate, classroomOccupancyRate, meetingOccupancyRate,
    totalEnergy, totalTraffic, buildingOccupancyData,
    addMessage, setActivePanel, highlightRooms, setViewMode, setHeatmapMode, setFocusBuilding,
    setAccessibilityMode, incrementCompleted,
    bookRoom, createTicket, initMockData,
    tickSimulation,
  }
})
