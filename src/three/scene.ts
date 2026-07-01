import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Building, Room, RoomStatus } from '../stores/campus'

// === 颜色配置（浅色学术风）===
const COLORS = {
  bg: 0xeef2f7,           // 背景 — 浅灰蓝
  fog: 0xeef2f7,          // 雾
  ground: 0xdce3ec,       // 地面
  groundLight: 0xe4ebf3,  // 校园区地面
  road: 0xc8d4e0,         // 道路
  roadLine: 0xffffff,     // 道路标线
  buildingBase: 0xf0f2f5, // 建筑主体
  buildingEdge: 0xd0d8e0, // 建筑边缘/分层线
  window: 0xa8c4e0,       // 窗户玻璃色
  windowLit: 0xffe8a0,    // 亮灯窗户
  roof: 0xe8ecf0,         // 屋顶
  treeLeaf: 0x5a9e6e,     // 树叶
  treeTrunk: 0x8b7355,    // 树干
  labelBg: 0x0e3a67,      // 标签背景
  labelText: 0xffffff,    // 标签文字
  highlight: 0x3b82f6,    // 高亮/命中色
  status: {
    free: 0x10b981,
    busy: 0x94a3b8,
    repair: 0xef4444,
  } as Record<RoomStatus, number>,
  heat: {
    low: 0x3b82f6,
    mid: 0xf59e0b,
    high: 0xef4444,
  },
}

// 品牌色点缀
const ACCENT_COLORS = [0x0e3a67, 0x2563eb, 0xb8860b, 0x059669]

export type RoomInfoCard = {
  roomId: string
  roomName: string
  buildingId: string
  buildingName: string
  floor: number
  type: string
  capacity: number
  equipment: string[]
  status: RoomStatus
  screenX: number
  screenY: number
  canBook: boolean
  canRepair: boolean
}

export type BuildingInfo = {
  buildingId: string
  buildingName: string
  floorCount: number
  roomCount: number
  screenX: number
  screenY: number
}

export class CampusScene {
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private controls!: OrbitControls
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private animationId = 0

  // 数据 → 3D 映射
  private buildingRootMap = new Map<string, THREE.Group>()
  private floorGroupMap = new Map<string, THREE.Group>()
  private roomMeshMap = new Map<string, THREE.Mesh>()
  private roomBuildingMap = new Map<string, { buildingId: string; buildingName: string; floor: number }>()
  private roomDataMap = new Map<string, Room>()
  private buildingLabelMap = new Map<string, THREE.Sprite>()
  private heatLabelMap = new Map<string, THREE.Sprite>()
  private pathLine: THREE.Line | null = null
  private pathCurve: THREE.CatmullRomCurve3 | null = null
  private pathProgress = 0

  // 交互状态
  private hoveredMesh: THREE.Mesh | null = null
  private selectedRoomId: string | null = null
  private highlightedIds = new Set<string>()
  private expandedBuildings = new Set<string>()

  // 事件处理器引用（用于 dispose 清理）
  private onResizeHandler = () => { /* placeholder */ }
  private onMouseMoveHandler = this.onMouseMove.bind(this)
  private onMouseClickHandler = this.onMouseClick.bind(this)
  private onContextLostHandler = (e: Event) => {
    e.preventDefault()
    console.warn('WebGL context lost —  campus scene paused')
  }

  // 展开动画
  private expandAnimations = new Map<string, { progress: number; target: number }>()

  // 聚焦动画
  private focusState: {
    progress: number
    startCam: THREE.Vector3
    startTarget: THREE.Vector3
    endCam: THREE.Vector3
    endTarget: THREE.Vector3
    onComplete?: () => void
  } | null = null

  // 热力层
  private heatOverlayMeshes = new Map<string, THREE.Mesh>()

  // 回调
  onRoomHover: ((info: RoomInfoCard | null) => void) | null = null
  onRoomClick: ((info: RoomInfoCard | null) => void) | null = null
  onBuildingClick: ((info: BuildingInfo | null) => void) | null = null

  init(container: HTMLDivElement, buildings: Building[]) {
    // 容器尺寸容错：如果为 0，使用父元素尺寸或默认值
    let w = container.clientWidth
    let h = container.clientHeight
    if (w === 0 || h === 0) {
      const parent = container.parentElement
      w = parent ? parent.clientWidth : 800
      h = parent ? parent.clientHeight : 600
      // 强制容器有尺寸
      container.style.width = w + 'px'
      container.style.height = h + 'px'
    }

    // === Renderer ===
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)

    // === Scene ===
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(COLORS.bg)
    this.scene.fog = new THREE.Fog(COLORS.fog, 80, 250)

    // === Camera ===
    const aspect = w > 0 && h > 0 ? w / h : 1
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500)
    this.camera.position.set(70, 50, 70)

    // === Controls ===
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.minDistance = 15
    this.controls.maxDistance = 200
    this.controls.target.set(10, 5, 10)

    // === 灯光（明亮日光）===
    this.setupLights()

    // === 地面 ===
    this.createGround()
    this.createRoads()
    this.createGreenery()

    // === 楼宇 ===
    this.buildCampus(buildings)

    // === Resize ===
    this.onResizeHandler = () => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      if (nw === 0 || nh === 0) return
      this.camera.aspect = nw / nh
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', this.onResizeHandler)

    // === 鼠标事件 ===
    const canvas = this.renderer.domElement
    canvas.addEventListener('mousemove', this.onMouseMoveHandler)
    canvas.addEventListener('click', this.onMouseClickHandler)
    canvas.addEventListener('webglcontextlost', this.onContextLostHandler)

    // === 动画循环 ===
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      this.updateAnimations()
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  private setupLights() {
    // 环境光 — 明亮
    const ambient = new THREE.AmbientLight(0xffffff, 0.65)
    this.scene.add(ambient)

    // 主方向光 — 柔和日光
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.0)
    sun.position.set(50, 80, 40)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -100
    sun.shadow.camera.right = 100
    sun.shadow.camera.top = 100
    sun.shadow.camera.bottom = -100
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 300
    sun.shadow.bias = -0.0005
    this.scene.add(sun)

    // 补光 — 淡蓝
    const fill = new THREE.DirectionalLight(0xc8ddf0, 0.35)
    fill.position.set(-40, 30, -30)
    this.scene.add(fill)

    // 半球光
    const hemi = new THREE.HemisphereLight(0xeef5ff, 0xd4c8b8, 0.4)
    this.scene.add(hemi)
  }

  private createGround() {
    // 大地面
    const groundGeo = new THREE.PlaneGeometry(400, 400)
    const groundMat = new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      roughness: 0.95,
      metalness: 0.0,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.1
    ground.receiveShadow = true
    this.scene.add(ground)

    // 校园区亮色地面
    const campusGeo = new THREE.PlaneGeometry(160, 120)
    const campusMat = new THREE.MeshStandardMaterial({
      color: COLORS.groundLight,
      roughness: 0.9,
      metalness: 0.0,
    })
    const campus = new THREE.Mesh(campusGeo, campusMat)
    campus.rotation.x = -Math.PI / 2
    campus.position.set(10, -0.05, 15)
    campus.receiveShadow = true
    this.scene.add(campus)
  }

  private createRoads() {
    const roadMat = new THREE.MeshStandardMaterial({
      color: COLORS.road,
      roughness: 0.8,
      metalness: 0.05,
    })

    // 主干道（横向）
    const road1 = new THREE.Mesh(new THREE.PlaneGeometry(200, 5), roadMat)
    road1.rotation.x = -Math.PI / 2
    road1.position.set(10, 0.01, 15)
    road1.receiveShadow = true
    this.scene.add(road1)

    // 纵向
    const road2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 140), roadMat)
    road2.rotation.x = -Math.PI / 2
    road2.position.set(10, 0.01, 15)
    road2.receiveShadow = true
    this.scene.add(road2)

    // 道路标线（虚线）
    const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.roadLine, transparent: true, opacity: 0.6 })
    for (let i = -80; i <= 80; i += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), lineMat)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(i, 0.02, 15)
      this.scene.add(dash)
    }
  }

  private createGreenery() {
    const treePositions = [
      [-35, -15], [-25, 55], [35, 65], [65, -10], [80, 55],
      [-45, 30], [50, 25], [-15, -30], [30, -20], [70, 30],
      [-35, 50], [45, 50], [85, 20], [-50, 10], [20, 70],
      [-60, 40], [55, -5], [0, -40], [40, 40], [75, 40],
    ]

    treePositions.forEach(([x, z]) => {
      const group = new THREE.Group()
      group.position.set(x, 0, z)

      // 树干
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.5, 6)
      const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.treeTrunk, roughness: 0.9 })
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 1.25
      trunk.castShadow = true
      group.add(trunk)

      // 树冠（多层球体）
      const leafMat = new THREE.MeshStandardMaterial({ color: COLORS.treeLeaf, roughness: 0.85 })
      const crown1 = new THREE.Mesh(new THREE.SphereGeometry(2.0 + Math.random() * 0.5, 8, 6), leafMat)
      crown1.position.y = 3.5
      crown1.castShadow = true
      group.add(crown1)

      const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 0.3, 8, 6), leafMat)
      crown2.position.set((Math.random() - 0.5) * 0.8, 4.5, (Math.random() - 0.5) * 0.8)
      crown2.castShadow = true
      group.add(crown2)

      this.scene.add(group)
    })
  }

  // === 创建文字 Sprite ===
  private createTextSprite(text: string, options: {
    fontSize?: number
    bgColor?: string
    textColor?: string
    padding?: number
    borderRadius?: number
  } = {}): THREE.Sprite {
    const {
      fontSize = 28,
      bgColor = 'rgba(14,58,103,0.85)',
      textColor = '#ffffff',
      padding = 10,
      borderRadius = 6,
    } = options

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`

    const textMetrics = ctx.measureText(text)
    const w = Math.ceil(textMetrics.width + padding * 2)
    const h = Math.ceil(fontSize + padding * 2)
    canvas.width = w
    canvas.height = h

    // 背景
    ctx.fillStyle = bgColor
    this.roundRect(ctx, 0, 0, w, h, borderRadius)
    ctx.fill()

    // 文字
    ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(w / 15, h / 15, 1)
    return sprite
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  // === 构建校园 ===
  private buildCampus(buildings: Building[]) {
    const roomW = 7
    const roomD = 5.5
    const gap = 0.5
    const floorH = 4.5
    const floorGap = 0.3

    buildings.forEach((building, bIdx) => {
      const accent = ACCENT_COLORS[bIdx % ACCENT_COLORS.length]
      const buildingGroup = new THREE.Group()
      buildingGroup.position.set(building.position[0], 0, building.position[1])

      const maxRoomsPerFloor = Math.max(...building.floors.map(f => f.rooms.length), 1)
      const cols = Math.min(maxRoomsPerFloor, 3)
      const rows = Math.ceil(maxRoomsPerFloor / cols)

      const buildingWidth = cols * (roomW + gap) + 2
      const buildingDepth = rows * (roomD + gap) + 2
      const totalHeight = building.floors.length * (floorH + floorGap) + 1

      // === 建筑主体外壳 ===
      const shellGeo = new THREE.BoxGeometry(buildingWidth, totalHeight, buildingDepth)
      const shellMat = new THREE.MeshStandardMaterial({
        color: COLORS.buildingBase,
        roughness: 0.6,
        metalness: 0.05,
        transparent: true,
        opacity: 0.3,
      })
      const shell = new THREE.Mesh(shellGeo, shellMat)
      shell.position.y = totalHeight / 2
      buildingGroup.add(shell)

      // === 基座 ===
      const baseGeo = new THREE.BoxGeometry(buildingWidth + 1, 0.8, buildingDepth + 1)
      const baseMat = new THREE.MeshStandardMaterial({
        color: accent,
        roughness: 0.5,
        metalness: 0.1,
      })
      const base = new THREE.Mesh(baseGeo, baseMat)
      base.position.y = 0.4
      base.receiveShadow = true
      base.castShadow = true
      buildingGroup.add(base)

      // === 入口门廊 ===
      const doorGeo = new THREE.BoxGeometry(3, 2.5, 0.3)
      const doorMat = new THREE.MeshStandardMaterial({
        color: 0x2a3f5c,
        roughness: 0.4,
        metalness: 0.2,
      })
      const door = new THREE.Mesh(doorGeo, doorMat)
      door.position.set(0, 1.65, buildingDepth / 2 + 0.15)
      buildingGroup.add(door)

      // === 楼层 ===
      building.floors.forEach((floor, fIdx) => {
        const floorGroup = new THREE.Group()
        const baseY = fIdx * (floorH + floorGap) + 1
        floorGroup.position.y = baseY
        floorGroup.userData = { buildingId: building.id, floorId: floor.id, originalY: baseY }

        // 楼层底板
        const slabGeo = new THREE.BoxGeometry(buildingWidth, 0.15, buildingDepth)
        const slabMat = new THREE.MeshStandardMaterial({
          color: COLORS.buildingEdge,
          roughness: 0.7,
        })
        const slab = new THREE.Mesh(slabGeo, slabMat)
        slab.position.y = 0
        slab.receiveShadow = true
        floorGroup.add(slab)

        // 房间
        floor.rooms.forEach((room, rIdx) => {
          const c = rIdx % cols
          const r = Math.floor(rIdx / cols)
          const offsetX = (c - (cols - 1) / 2) * (roomW + gap)
          const offsetZ = (r - (rows - 1) / 2) * (roomD + gap)

          // 房间主体
          const roomGeo = new THREE.BoxGeometry(roomW, floorH - 0.3, roomD)
          const statusColor = COLORS.status[room.status]
          const roomMat = new THREE.MeshStandardMaterial({
            color: statusColor,
            roughness: 0.4,
            metalness: 0.1,
            transparent: true,
            opacity: 0.88,
          })
          const roomMesh = new THREE.Mesh(roomGeo, roomMat)
          roomMesh.position.set(offsetX, floorH / 2, offsetZ)
          roomMesh.castShadow = true
          roomMesh.receiveShadow = true
          roomMesh.userData.roomId = room.id

          this.roomMeshMap.set(room.id, roomMesh)
          this.roomBuildingMap.set(room.id, {
            buildingId: building.id,
            buildingName: building.name,
            floor: floor.level,
          })
          this.roomDataMap.set(room.id, room)

          floorGroup.add(roomMesh)

          // 窗户
          this.addWindows(floorGroup, offsetX, floorH / 2, offsetZ, roomW, floorH - 0.3, roomD, room.status === 'busy')
        })

        this.floorGroupMap.set(floor.id, floorGroup)
        buildingGroup.add(floorGroup)
      })

      // === 楼名标签 ===
      const label = this.createTextSprite(building.name, {
        fontSize: 32,
        bgColor: `rgba(${this.hexToRgb(accent)}, 0.9)`,
        padding: 12,
      })
      label.position.set(0, totalHeight + 2.5, 0)
      buildingGroup.add(label)
      this.buildingLabelMap.set(building.id, label)

      // === 楼层数指示 ===
      const floorLabel = this.createTextSprite(`${building.floors.length}F`, {
        fontSize: 20,
        bgColor: 'rgba(100,116,139,0.7)',
        textColor: '#ffffff',
        padding: 6,
      })
      floorLabel.position.set(buildingWidth / 2 + 1, totalHeight / 2, 0)
      buildingGroup.add(floorLabel)

      this.buildingRootMap.set(building.id, buildingGroup)
      this.scene.add(buildingGroup)
    })
  }

  private hexToRgb(hex: number): string {
    const r = (hex >> 16) & 0xff
    const g = (hex >> 8) & 0xff
    const b = hex & 0xff
    return `${r},${g},${b}`
  }

  private addWindows(group: THREE.Group, cx: number, cy: number, cz: number, w: number, _h: number, d: number, isLit: boolean) {
    const winColor = isLit ? COLORS.windowLit : COLORS.window
    const winMat = new THREE.MeshStandardMaterial({
      color: winColor,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7,
    })
    const winGeo = new THREE.PlaneGeometry(1.0, 0.8)

    // 前面
    for (let i = -2; i <= 2; i++) {
      for (let j = 0; j < 2; j++) {
        const win = new THREE.Mesh(winGeo, winMat)
        win.position.set(cx + i * 1.6, cy - 0.5 + j * 1.8, cz + d / 2 + 0.02)
        group.add(win)
      }
    }

    // 后面
    for (let i = -2; i <= 2; i++) {
      for (let j = 0; j < 2; j++) {
        const win = new THREE.Mesh(winGeo, winMat)
        win.rotation.y = Math.PI
        win.position.set(cx + i * 1.6, cy - 0.5 + j * 1.8, cz - d / 2 - 0.02)
        group.add(win)
      }
    }

    // 侧面
    for (let i = -1; i <= 1; i++) {
      for (let j = 0; j < 2; j++) {
        const winL = new THREE.Mesh(winGeo, winMat)
        winL.rotation.y = -Math.PI / 2
        winL.position.set(cx - w / 2 - 0.02, cy - 0.5 + j * 1.8, cz + i * 1.4)
        group.add(winL)

        const winR = new THREE.Mesh(winGeo, winMat)
        winR.rotation.y = Math.PI / 2
        winR.position.set(cx + w / 2 + 0.02, cy - 0.5 + j * 1.8, cz + i * 1.4)
        group.add(winR)
      }
    }
  }

  // === 拾取 ===
  private onMouseMove(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const meshes = Array.from(this.roomMeshMap.values())
    const intersects = this.raycaster.intersectObjects(meshes)

    // 清除旧 hover
    if (this.hoveredMesh) {
      const mat = this.hoveredMesh.material as THREE.MeshStandardMaterial
      mat.emissive.setHex(0x000000)
      this.hoveredMesh = null
    }

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      this.hoveredMesh = mesh
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.emissive.setHex(0x333333)
      this.renderer.domElement.style.cursor = 'pointer'

      if (this.onRoomHover) {
        const info = this.getRoomInfoCard(mesh.userData.roomId)
        if (info) this.onRoomHover(info)
      }
    } else {
      this.renderer.domElement.style.cursor = 'grab'
      if (this.onRoomHover) this.onRoomHover(null)
    }
  }

  private onMouseClick(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const meshes = Array.from(this.roomMeshMap.values())
    const intersects = this.raycaster.intersectObjects(meshes)

    // 取消旧选中
    if (this.selectedRoomId) {
      const oldMesh = this.roomMeshMap.get(this.selectedRoomId)
      if (oldMesh) {
        (oldMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
      }
    }

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      const roomId = mesh.userData.roomId
      this.selectedRoomId = roomId
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.emissive.setHex(0x445566)

      if (this.onRoomClick) {
        const info = this.getRoomInfoCard(roomId)
        if (info) this.onRoomClick(info)
      }
    } else {
      this.selectedRoomId = null
      if (this.onRoomClick) this.onRoomClick(null)
    }
  }

  private getRoomInfoCard(roomId: string): RoomInfoCard | null {
    const room = this.roomDataMap.get(roomId)
    const mapping = this.roomBuildingMap.get(roomId)
    if (!room || !mapping) return null

    const mesh = this.roomMeshMap.get(roomId)
    if (!mesh) return null

    const worldPos = new THREE.Vector3()
    mesh.getWorldPosition(worldPos)
    worldPos.y += 4
    const screenPos = worldPos.clone().project(this.camera)
    const rect = this.renderer.domElement.getBoundingClientRect()
    const sx = (screenPos.x * 0.5 + 0.5) * rect.width
    const sy = (-screenPos.y * 0.5 + 0.5) * rect.height

    const typeLabels: Record<string, string> = {
      meeting: '会议室', classroom: '教室', venue: '场馆', lab: '实验室'
    }

    return {
      roomId: room.id,
      roomName: room.name,
      buildingId: mapping.buildingId,
      buildingName: mapping.buildingName,
      floor: mapping.floor,
      type: typeLabels[room.type] || room.type,
      capacity: room.capacity,
      equipment: room.equipment,
      status: room.status,
      screenX: sx,
      screenY: sy,
      canBook: room.status === 'free',
      canRepair: room.status !== 'repair',
    }
  }

  // === 建筑展开/收起 ===
  toggleBuildingExpand(buildingId: string) {
    const building = this.buildingRootMap.get(buildingId)
    if (!building) return

    const isExpanded = this.expandedBuildings.has(buildingId)
    if (isExpanded) {
      this.expandedBuildings.delete(buildingId)
      this.collapseBuilding(buildingId)
    } else {
      this.expandedBuildings.add(buildingId)
      this.expandBuilding(buildingId)
    }
  }

  private expandBuilding(buildingId: string) {
    const building = this.buildingRootMap.get(buildingId)
    if (!building) return

    building.traverse((child) => {
      if (child.userData?.floorId && child.userData?.originalY !== undefined) {
        const floorIdx = parseInt(child.userData.floorId.split('-f')[1]) - 1
        const targetY = child.userData.originalY + floorIdx * 3
        this.expandAnimations.set(child.userData.floorId, {
          progress: 0,
          target: targetY,
        })
      }
    })

    // 聚焦建筑
    this.focusBuilding(buildingId)
  }

  private collapseBuilding(buildingId: string) {
    const building = this.buildingRootMap.get(buildingId)
    if (!building) return

    building.traverse((child) => {
      if (child.userData?.floorId && child.userData?.originalY !== undefined) {
        this.expandAnimations.set(child.userData.floorId, {
          progress: 0,
          target: child.userData.originalY,
        })
      }
    })
  }

  // === 聚焦建筑/房间 ===
  focusBuilding(buildingId: string) {
    const group = this.buildingRootMap.get(buildingId)
    if (!group) return

    const worldPos = new THREE.Vector3()
    group.getWorldPosition(worldPos)

    let maxY = 0
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const box = new THREE.Box3().setFromObject(child)
        if (box.max.y > maxY) maxY = box.max.y
      }
    })

    this.startFocusAnimation(
      new THREE.Vector3(worldPos.x + 35, maxY + 20, worldPos.z + 35),
      new THREE.Vector3(worldPos.x, maxY / 2, worldPos.z)
    )
  }

  focusRoom(roomId: string, onComplete?: () => void) {
    const mesh = this.roomMeshMap.get(roomId)
    if (!mesh) return

    const worldPos = new THREE.Vector3()
    mesh.getWorldPosition(worldPos)

    this.startFocusAnimation(
      new THREE.Vector3(worldPos.x + 20, worldPos.y + 15, worldPos.z + 20),
      new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z),
      onComplete
    )
  }

  private startFocusAnimation(endCam: THREE.Vector3, endTarget: THREE.Vector3, onComplete?: () => void) {
    this.focusState = {
      progress: 0,
      startCam: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endCam,
      endTarget,
      onComplete,
    }
  }

  // === 路径飞行（从当前位置到目标）===
  flyTo(targetBuildingId: string, onComplete?: () => void) {
    const group = this.buildingRootMap.get(targetBuildingId)
    if (!group) return

    const worldPos = new THREE.Vector3()
    group.getWorldPosition(worldPos)

    // 创建曲线路径
    const start = this.camera.position.clone()
    const end = new THREE.Vector3(worldPos.x + 30, 40, worldPos.z + 30)
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      Math.max(start.y, end.y) + 30,
      (start.z + end.z) / 2
    )

    this.pathCurve = new THREE.CatmullRomCurve3([start, mid, end])
    this.pathProgress = 0

    // 绘制路径线
    this.clearPathLine()
    const points = this.pathCurve.getPoints(50)
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    })
    this.pathLine = new THREE.Line(lineGeo, lineMat)
    this.scene.add(this.pathLine)

    // 动画完成后的回调
    const checkComplete = () => {
      if (this.pathProgress >= 1) {
        this.clearPathLine()
        if (onComplete) onComplete()
      } else {
        requestAnimationFrame(checkComplete)
      }
    }
    requestAnimationFrame(checkComplete)
  }

  private clearPathLine() {
    if (this.pathLine) {
      this.scene.remove(this.pathLine)
      this.pathLine.geometry.dispose()
      ;(this.pathLine.material as THREE.Material).dispose()
      this.pathLine = null
    }
    this.pathCurve = null
    this.pathProgress = 0
  }

  // === 动画更新 ===
  private updateAnimations() {
    // 聚焦动画
    if (this.focusState) {
      this.focusState.progress += 0.025
      if (this.focusState.progress >= 1) {
        this.focusState.progress = 1
      }
      const t = this.easeInOutCubic(this.focusState.progress)
      this.camera.position.lerpVectors(this.focusState.startCam, this.focusState.endCam, t)
      this.controls.target.lerpVectors(this.focusState.startTarget, this.focusState.endTarget, t)

      if (this.focusState.progress >= 1) {
        if (this.focusState.onComplete) this.focusState.onComplete()
        this.focusState = null
      }
    }

    // 楼层展开动画
    this.expandAnimations.forEach((anim, floorId) => {
      anim.progress += 0.04
      if (anim.progress >= 1) anim.progress = 1

      const floorGroup = this.floorGroupMap.get(floorId)
      if (floorGroup) {
        this.easeInOutCubic(anim.progress)
        const currentY = floorGroup.position.y
        const targetY = anim.target
        floorGroup.position.y = currentY + (targetY - currentY) * 0.1

        // 接近目标时停止
        if (Math.abs(floorGroup.position.y - targetY) < 0.05) {
          floorGroup.position.y = targetY
          if (anim.progress >= 1) {
            this.expandAnimations.delete(floorId)
          }
        }
      }
    })

    // 路径飞行
    if (this.pathCurve && this.pathProgress < 1) {
      this.pathProgress += 0.008
      if (this.pathProgress > 1) this.pathProgress = 1
      const pos = this.pathCurve.getPointAt(this.pathProgress)
      const lookAt = this.pathCurve.getPointAt(Math.min(this.pathProgress + 0.01, 1))
      this.camera.position.copy(pos)
      this.controls.target.copy(lookAt)

      // 淡出路径线
      if (this.pathLine) {
        const mat = this.pathLine.material as THREE.LineBasicMaterial
        mat.opacity = 0.6 * (1 - this.pathProgress)
      }
    }

    // 更新标签朝向
    this.buildingLabelMap.forEach((label) => {
      label.lookAt(this.camera.position)
    })
    this.heatLabelMap.forEach((label) => {
      label.lookAt(this.camera.position)
    })
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  // === 热力层 + 数值标签 ===
  updateHeatMap(data: Map<string, number>) {
    this.clearHeatMap()

    data.forEach((value, roomId) => {
      const roomMesh = this.roomMeshMap.get(roomId)
      if (!roomMesh) return

      const color = this.heatValueToColor(value)
      const params = (roomMesh.geometry as THREE.BoxGeometry).parameters

      // 热力叠加层
      const overlayGeo = new THREE.BoxGeometry(
        params.width + 0.3,
        params.height + 0.3,
        params.depth + 0.3
      )
      const overlayMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: Math.max(0.08, value * 0.4),
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const overlay = new THREE.Mesh(overlayGeo, overlayMat)
      overlay.position.copy(roomMesh.position)
      overlay.renderOrder = 1
      roomMesh.parent?.add(overlay)
      this.heatOverlayMeshes.set(roomId, overlay)

      // 数值标签
      const percent = Math.round(value * 100)
      const label = this.createTextSprite(`${percent}%`, {
        fontSize: 18,
        bgColor: `rgba(${this.heatColorToRgba(color, 0.85)})`,
        textColor: '#ffffff',
        padding: 6,
        borderRadius: 4,
      })
      label.position.set(
        roomMesh.position.x,
        roomMesh.position.y + params.height / 2 + 1.5,
        roomMesh.position.z
      )
      roomMesh.parent?.add(label)
      this.heatLabelMap.set(roomId, label)
    })
  }

  private heatValueToColor(value: number): number {
    const clamped = Math.max(0, Math.min(1, value))
    if (clamped < 0.5) {
      const t = clamped / 0.5
      const r = Math.round(0x3b + (0xf5 - 0x3b) * t)
      const g = Math.round(0x82 + (0x9e - 0x82) * t)
      const b = Math.round(0xf6 + (0x0b - 0xf6) * t)
      return (r << 16) | (g << 8) | b
    } else {
      const t = (clamped - 0.5) / 0.5
      const r = Math.round(0xf5 + (0xef - 0xf5) * t)
      const g = Math.round(0x9e + (0x44 - 0x9e) * t)
      const b = Math.round(0x0b + (0x44 - 0x0b) * t)
      return (r << 16) | (g << 8) | b
    }
  }

  private heatColorToRgba(hex: number, alpha: number): string {
    const r = (hex >> 16) & 0xff
    const g = (hex >> 8) & 0xff
    const b = hex & 0xff
    return `${r},${g},${b},${alpha}`
  }

  clearHeatMap() {
    this.heatOverlayMeshes.forEach((mesh) => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      mesh.parent?.remove(mesh)
    })
    this.heatOverlayMeshes.clear()

    this.heatLabelMap.forEach((label) => {
      label.parent?.remove(label)
      const mat = label.material as THREE.SpriteMaterial
      mat.map?.dispose()
      mat.dispose()
    })
    this.heatLabelMap.clear()
  }

  // === 高亮 API ===
  highlightRooms(roomIds: string[]) {
    this.highlightedIds = new Set(roomIds)

    this.roomMeshMap.forEach((mesh, roomId) => {
      const room = this.roomDataMap.get(roomId)
      if (!room) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (this.highlightedIds.has(roomId)) {
        mat.color.setHex(COLORS.highlight)
        mat.emissive.setHex(0x112244)
        mat.opacity = 0.95
      } else {
        mat.color.setHex(COLORS.status[room.status])
        mat.emissive.setHex(0x000000)
        mat.opacity = 0.88
      }
    })
  }

  // === 数据更新 ===
  updateRoomStatus(roomId: string, status: RoomStatus) {
    const mesh = this.roomMeshMap.get(roomId)
    if (!mesh) return
    const mat = mesh.material as THREE.MeshStandardMaterial
    if (!this.highlightedIds.has(roomId)) {
      mat.color.setHex(COLORS.status[status])
    }
    // 更新数据
    const room = this.roomDataMap.get(roomId)
    if (room) room.status = status
  }

  // === 清理 ===
  dispose() {
    cancelAnimationFrame(this.animationId)
    this.clearHeatMap()
    this.clearPathLine()
    window.removeEventListener('resize', this.onResizeHandler)
    const canvas = this.renderer.domElement
    canvas.removeEventListener('mousemove', this.onMouseMoveHandler)
    canvas.removeEventListener('click', this.onMouseClickHandler)
    canvas.removeEventListener('webglcontextlost', this.onContextLostHandler)
    this.renderer.dispose()
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose())
        } else if (mat) {
          mat.dispose()
        }
      }
    })
  }
}
