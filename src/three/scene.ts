import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Building, Room, RoomStatus } from '../stores/campus'

// 状态 → 颜色映射
const STATUS_COLORS: Record<RoomStatus, number> = {
  free: 0x10b981,   // 绿
  busy: 0x6b7280,   // 灰
  repair: 0xef4444,  // 红
}
const HIT_COLOR = 0x3b82f6 // 蓝 — Agent 命中

// 楼宇暖色系
const BUILDING_WARM_COLORS = [0xd4a853, 0xc4956a, 0xb8a07e, 0xcdb891]

export type RoomInfoCard = {
  roomId: string
  roomName: string
  buildingName: string
  floor: number
  type: string
  capacity: number
  equipment: string[]
  status: RoomStatus
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
  private buildingMeshes: Map<string, THREE.Group> = new Map()
  private roomMeshMap: Map<string, THREE.Mesh> = new Map()
  private roomBuildingMap: Map<string, { buildingId: string; buildingName: string; floor: number }> = new Map()
  private roomDataMap: Map<string, Room> = new Map()

  // 交互状态
  private hoveredMesh: THREE.Mesh | null = null
  private selectedRoomId: string | null = null
  private highlightedIds: Set<string> = new Set()

  // 热力层
  private heatMapData: Map<string, number> = new Map()
  private heatOverlayMeshes: Map<string, THREE.Mesh> = new Map()

  // 聚焦动画
  private focusTarget: THREE.Vector3 | null = null
  private focusCameraPos: THREE.Vector3 | null = null
  private focusProgress = 0
  private focusStartCamPos = new THREE.Vector3()
  private focusStartTarget = new THREE.Vector3()

  // 回调
  onRoomHover: ((info: RoomInfoCard | null) => void) | null = null
  onRoomClick: ((info: RoomInfoCard | null) => void) | null = null

  init(container: HTMLDivElement, buildings: Building[]) {
    const w = container.clientWidth
    const h = container.clientHeight

    // === Renderer ===
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    // === Scene ===
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a1628)
    this.scene.fog = new THREE.FogExp2(0x0a1628, 0.008)

    // === Camera ===
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500)
    this.camera.position.set(80, 60, 80)

    // === Controls ===
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.maxPolarAngle = Math.PI / 2.2
    this.controls.minDistance = 20
    this.controls.maxDistance = 200
    this.controls.target.set(10, 0, 10)

    // === 灯光 ===
    this.setupLights()

    // === 地面 + 环境 ===
    this.createGround()
    this.createRoads()
    this.createGreenery()

    // === 楼宇 ===
    this.buildCampus(buildings)

    // === Resize ===
    const onResize = () => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      this.camera.aspect = nw / nh
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    // === 鼠标事件 ===
    const canvas = this.renderer.domElement
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
    canvas.addEventListener('click', this.onMouseClick.bind(this))

    // === 动画循环 ===
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      this.updateFocusAnimation()
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  private setupLights() {
    // 环境光 — 深蓝基调
    const ambient = new THREE.AmbientLight(0x1a2a4a, 0.6)
    this.scene.add(ambient)

    // 主方向光 — 暖白色
    const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
    sun.position.set(40, 60, 30)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -80
    sun.shadow.camera.right = 80
    sun.shadow.camera.top = 80
    sun.shadow.camera.bottom = -80
    this.scene.add(sun)

    // 补光 — 蓝色
    const fill = new THREE.DirectionalLight(0x4488cc, 0.3)
    fill.position.set(-30, 20, -20)
    this.scene.add(fill)

    // 半球光
    const hemi = new THREE.HemisphereLight(0x2244aa, 0x332211, 0.4)
    this.scene.add(hemi)
  }

  private createGround() {
    // 大地面
    const groundGeo = new THREE.PlaneGeometry(300, 300)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d1f35,
      roughness: 0.9,
      metalness: 0.1,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.05
    ground.receiveShadow = true
    this.scene.add(ground)

    // 教学区亮色地面
    const campusGeo = new THREE.PlaneGeometry(140, 100)
    const campusMat = new THREE.MeshStandardMaterial({
      color: 0x142840,
      roughness: 0.85,
      metalness: 0.05,
    })
    const campus = new THREE.Mesh(campusGeo, campusMat)
    campus.rotation.x = -Math.PI / 2
    campus.position.set(10, -0.03, 15)
    campus.receiveShadow = true
    this.scene.add(campus)
  }

  private createRoads() {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1a3050,
      roughness: 0.7,
    })
    // 主干道（横向）
    const road1 = new THREE.Mesh(new THREE.PlaneGeometry(160, 3), roadMat)
    road1.rotation.x = -Math.PI / 2
    road1.position.set(10, 0, 15)
    this.scene.add(road1)
    // 纵向
    const road2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 100), roadMat)
    road2.rotation.x = -Math.PI / 2
    road2.position.set(10, 0, 15)
    this.scene.add(road2)
  }

  private createGreenery() {
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x1a5c3a, roughness: 0.9 })
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 })
    const treePositions = [
      [-20, -10], [-15, 50], [30, 55], [55, -5], [70, 50],
      [-30, 25], [45, 20], [-10, -20], [25, -15], [60, 25],
      [-25, 45], [40, 45], [75, 15], [-35, 5], [15, 60],
    ]
    treePositions.forEach(([x, z]) => {
      // 树干
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 2, 6),
        trunkMat
      )
      trunk.position.set(x, 1, z)
      trunk.castShadow = true
      this.scene.add(trunk)
      // 树冠
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.1, 1.5 + Math.random()), 6, 5),
        treeMat
      )
      crown.position.set(x, 3 + Math.random() * 0.5, z)
      crown.castShadow = true
      this.scene.add(crown)
    })
  }

  private buildCampus(buildings: Building[]) {
    const roomWidth = 8
    const roomDepth = 6
    const gap = 1
    const floorHeight = 5

    buildings.forEach((building, bIdx) => {
      const group = new THREE.Group()
      group.position.set(building.position[0], 0, building.position[1])

      const warmColor = BUILDING_WARM_COLORS[bIdx % BUILDING_WARM_COLORS.length]
      const totalFloors = building.floors.length

      // 统计最大行数用于基座尺寸
      let maxCols = 1
      let maxRows = 1

      building.floors.forEach((floor) => {
        const rooms = floor.rooms
        if (!rooms.length) return
        const cols = Math.min(rooms.length, 3)
        const rows = Math.ceil(rooms.length / cols)
        if (cols > maxCols) maxCols = cols
        if (rows > maxRows) maxRows = rows

        const baseY = (floor.level - 1) * floorHeight

        rooms.forEach((room, rIdx) => {
          const roomsPerRow = Math.min(rooms.length, 3)
          const col = rIdx % roomsPerRow
          const row = Math.floor(rIdx / roomsPerRow)
          const offsetX = (col - (roomsPerRow - 1) / 2) * (roomWidth + gap)
          const offsetZ = row * (roomDepth + gap)

          // 房间主体
          const roomGeo = new THREE.BoxGeometry(roomWidth, floorHeight, roomDepth)
          const statusColor = this.getRoomColor(room.status)
          const roomMat = new THREE.MeshStandardMaterial({
            color: statusColor,
            roughness: 0.5,
            metalness: 0.15,
            transparent: true,
            opacity: 0.85,
          })
          const roomMesh = new THREE.Mesh(roomGeo, roomMat)
          roomMesh.position.set(offsetX, baseY + floorHeight / 2, offsetZ)
          roomMesh.castShadow = true
          roomMesh.receiveShadow = true

          // 存储映射
          this.roomMeshMap.set(room.id, roomMesh)
          this.roomBuildingMap.set(room.id, {
            buildingId: building.id,
            buildingName: building.name,
            floor: floor.level,
          })
          this.roomDataMap.set(room.id, room)
          roomMesh.userData.roomId = room.id

          group.add(roomMesh)

          // 窗户发光效果
          this.addWindows(group, offsetX, baseY, roomWidth, floorHeight, roomDepth)
        })
      })

      // 楼宇基座
      const baseW = maxCols * (roomWidth + gap) + 2
      const baseD = maxRows * (roomDepth + gap) + 2
      const baseGeo = new THREE.BoxGeometry(baseW, 0.5, baseD)
      const baseMat = new THREE.MeshStandardMaterial({
        color: warmColor,
        roughness: 0.6,
        metalness: 0.1,
      })
      const base = new THREE.Mesh(baseGeo, baseMat)
      base.position.y = 0.25
      base.receiveShadow = true
      group.add(base)

      // 楼名标签 — 发光球
      const labelGeo = new THREE.SphereGeometry(0.8, 8, 8)
      const labelMat = new THREE.MeshStandardMaterial({
        color: warmColor,
        emissive: warmColor,
        emissiveIntensity: 0.6,
      })
      const label = new THREE.Mesh(labelGeo, labelMat)
      label.position.y = totalFloors * floorHeight + 2
      group.add(label)

      this.buildingMeshes.set(building.id, group)
      this.scene.add(group)
    })
  }

  private addWindows(group: THREE.Group, cx: number, baseY: number, w: number, h: number, d: number) {
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffe8a0,
      emissive: 0xffcc44,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
    })
    const winGeo = new THREE.PlaneGeometry(0.8, 0.6)

    // 前面窗户
    for (let i = -2; i <= 2; i++) {
      for (let j = 0; j < 2; j++) {
        const win = new THREE.Mesh(winGeo, windowMat)
        win.position.set(cx + i * 1.8, baseY + 1.5 + j * 2, d / 2 + 0.01)
        group.add(win)
      }
    }
  }

  private getRoomColor(status: RoomStatus): number {
    if (this.highlightedIds.size > 0 && this.roomDataMap) {
      // 检查所有 room 是否在 highlighted 中
      for (const [id, room] of this.roomDataMap) {
        if (this.highlightedIds.has(id)) continue
      }
    }
    return STATUS_COLORS[status] || 0x10b981
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
      const rid = this.hoveredMesh.userData.roomId
      const room = this.roomDataMap.get(rid)
      if (room) {
        const color = this.highlightedIds.has(rid) ? HIT_COLOR : STATUS_COLORS[room.status]
        ;(this.hoveredMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
      }
      this.hoveredMesh = null
    }

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      this.hoveredMesh = mesh
      ;(mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x222222)
      this.renderer.domElement.style.cursor = 'pointer'

      // 触发 hover 回调
      if (this.onRoomHover) {
        const roomId = mesh.userData.roomId
        const info = this.getRoomInfoCard(roomId)
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
      ;(mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x334455)

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

    // 计算屏幕坐标
    const mesh = this.roomMeshMap.get(roomId)
    if (!mesh) return null

    const worldPos = new THREE.Vector3()
    mesh.getWorldPosition(worldPos)
    worldPos.y += 3
    const screenPos = worldPos.clone().project(this.camera)
    const rect = this.renderer.domElement.getBoundingClientRect()
    const sx = (screenPos.x * 0.5 + 0.5) * rect.width
    const sy = (-screenPos.y * 0.5 + 0.5) * rect.height

    const typeLabels: Record<string, string> = {
      meeting: '会议室', classroom: '教室', venue: '场馆', lab: '实验室'
    }
    const statusLabels: Record<RoomStatus, string> = {
      free: '空闲', busy: '占用', repair: '报修'
    }

    return {
      roomId: room.id,
      roomName: room.name,
      buildingName: mapping.buildingName,
      floor: mapping.floor,
      type: typeLabels[room.type] || room.type,
      capacity: room.capacity,
      equipment: room.equipment,
      status: room.status,
      screenX: sx,
      screenY: sy,
    }
  }

  // === 聚焦楼宇 ===
  focusBuilding(buildingId: string) {
    const group = this.buildingMeshes.get(buildingId)
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

    this.focusStartCamPos.copy(this.camera.position)
    this.focusStartTarget.copy(this.controls.target)

    this.focusTarget = new THREE.Vector3(worldPos.x, maxY / 2, worldPos.z)
    this.focusCameraPos = new THREE.Vector3(
      worldPos.x + 30,
      maxY + 15,
      worldPos.z + 30
    )
    this.focusProgress = 0
  }

  private updateFocusAnimation() {
    if (!this.focusTarget || !this.focusCameraPos) return
    this.focusProgress += 0.02
    if (this.focusProgress >= 1) {
      this.focusProgress = 1
    }
    const t = this.easeInOutCubic(this.focusProgress)
    this.camera.position.lerpVectors(this.focusStartCamPos, this.focusCameraPos, t)
    this.controls.target.lerpVectors(this.focusStartTarget, this.focusTarget, t)
    if (this.focusProgress >= 1) {
      this.focusTarget = null
      this.focusCameraPos = null
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  // === 热力层 ===
  updateHeatMap(data: Map<string, number>) {
    this.heatMapData = data
    this.clearHeatOverlays()

    this.heatMapData.forEach((value, roomId) => {
      const roomMesh = this.roomMeshMap.get(roomId)
      if (!roomMesh) return

      const color = this.heatValueToColor(value)
      const params = (roomMesh.geometry as THREE.BoxGeometry).parameters

      const overlayGeo = new THREE.BoxGeometry(
        params.width + 0.2,
        params.height + 0.2,
        params.depth + 0.2
      )
      const overlayMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: Math.max(0.05, value * 0.45),
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const overlay = new THREE.Mesh(overlayGeo, overlayMat)
      overlay.position.copy(roomMesh.position)
      overlay.renderOrder = 1

      roomMesh.parent?.add(overlay)
      this.heatOverlayMeshes.set(roomId, overlay)
    })
  }

  private heatValueToColor(value: number): number {
    const clamped = Math.max(0, Math.min(1, value))
    if (clamped < 0.5) {
      const t = clamped / 0.5
      const r = Math.round(0x3b + (0xea - 0x3b) * t)
      const g = Math.round(0x82 + (0xb3 - 0x82) * t)
      const b = Math.round(0xf6 + (0x08 - 0xf6) * t)
      return (r << 16) | (g << 8) | b
    } else {
      const t = (clamped - 0.5) / 0.5
      const r = Math.round(0xea + (0xef - 0xea) * t)
      const g = Math.round(0xb3 + (0x44 - 0xb3) * t)
      const b = Math.round(0x08 + (0x44 - 0x08) * t)
      return (r << 16) | (g << 8) | b
    }
  }

  clearHeatMap() {
    this.heatMapData.clear()
    this.clearHeatOverlays()
  }

  private clearHeatOverlays() {
    this.heatOverlayMeshes.forEach((mesh) => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      mesh.parent?.remove(mesh)
    })
    this.heatOverlayMeshes.clear()
  }

  // === 高亮 API ===
  highlightRooms(roomIds: string[]) {
    this.highlightedIds = new Set(roomIds)

    // 重置所有颜色
    this.roomMeshMap.forEach((mesh, roomId) => {
      const room = this.roomDataMap.get(roomId)
      if (!room) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (this.highlightedIds.has(roomId)) {
        mat.color.setHex(HIT_COLOR)
        mat.emissive.setHex(0x112244)
        mat.opacity = 0.95
      } else {
        mat.color.setHex(STATUS_COLORS[room.status])
        mat.emissive.setHex(0x000000)
        mat.opacity = 0.85
      }
    })
  }

  // === 数据更新（房间状态变化后同步 3D） ===
  updateRoomStatus(roomId: string, status: RoomStatus) {
    const mesh = this.roomMeshMap.get(roomId)
    if (!mesh) return
    const mat = mesh.material as THREE.MeshStandardMaterial
    if (!this.highlightedIds.has(roomId)) {
      mat.color.setHex(STATUS_COLORS[status])
    }
  }

  // === 清理 ===
  dispose() {
    cancelAnimationFrame(this.animationId)
    this.clearHeatOverlays()
    this.renderer.dispose()
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose()
      }
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material as THREE.Material
        mat.dispose()
      }
    })
  }
}
