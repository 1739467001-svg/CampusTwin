<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useCampusStore } from '../stores/campus'
import * as echarts from 'echarts'

const store = useCampusStore()
const emit = defineEmits<{ focusBuilding: [buildingId: string | null] }>()

const occupancyChartRef = ref<HTMLDivElement | null>(null)
const energyChartRef = ref<HTMLDivElement | null>(null)
const trafficChartRef = ref<HTMLDivElement | null>(null)

let occupancyChart: echarts.ECharts | null = null
let energyChart: echarts.ECharts | null = null
let trafficChart: echarts.ECharts | null = null

const brandColors = ['#0e3a67', '#2563eb', '#b8860b', '#059669', '#dc2626', '#d4a853']

const buildingOccupancy = computed(() => store.buildingOccupancyData)

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

const energyTrend = computed(() => {
  const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
  return store.buildings.map((b, idx) => ({
    name: b.name, buildingId: b.id,
    data: hours.map((_, hIdx) => {
      const base = store.energies.find(e => e.buildingId === b.id)?.kwh || 500
      return Math.round(base * (0.6 + Math.sin(hIdx * 0.8 + idx) * 0.3 + pseudoRandom(idx * 10 + hIdx) * 0.2))
    }), hours,
  }))
})

const trafficDistribution = computed(() => {
  return store.traffics.map(t => ({
    name: store.buildings.find(b => b.id === t.zoneId)?.name || t.zoneId,
    buildingId: t.zoneId, value: t.count,
  }))
})

function setHeatmap(mode: 'energy' | 'traffic' | 'off') {
  store.setHeatmapMode(mode)
}

function onBuildingClick(buildingId: string) {
  emit('focusBuilding', buildingId)
}

function initOccupancyChart() {
  if (!occupancyChartRef.value) return
  occupancyChart = echarts.init(occupancyChartRef.value)
  updateOccupancyChart()
  occupancyChart.on('click', (params: any) => {
    const d = buildingOccupancy.value[params.dataIndex]
    if (d) onBuildingClick(d.buildingId)
  })
}

function updateOccupancyChart() {
  if (!occupancyChart) return
  const data = buildingOccupancy.value || []
  if (!data.length) return
  occupancyChart.setOption({
    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value', max: 100,
      axisLabel: { fontSize: 10, color: '#94a3b8', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    yAxis: {
      type: 'category', data: data.map(d => d.name),
      axisLabel: { fontSize: 10, color: '#64748b' },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: data.map((d) => ({
        value: d.rate,
        itemStyle: {
          color: d.rate > 80 ? '#dc2626' : d.rate > 50 ? '#b8860b' : '#0e3a67',
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barWidth: 14,
      label: { show: true, position: 'right', fontSize: 10, color: '#64748b', formatter: '{c}%' },
    }],
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const d = data[params[0].dataIndex]
        return `<div style="font-size:12px">${d.name}<br/>占用 ${d.busy}/${d.total} 间 (${d.rate}%)</div>`
      },
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0', textStyle: { color: '#1e293b' },
    },
  })
}

function initEnergyChart() {
  if (!energyChartRef.value) return
  energyChart = echarts.init(energyChartRef.value)
  updateEnergyChart()
}

function updateEnergyChart() {
  if (!energyChart) return
  const trend = energyTrend.value || []
  if (!trend.length) return
  const series = trend.map((s, i) => ({
    name: s.name, type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
    data: s.data,
    lineStyle: { width: 2, color: brandColors[i % brandColors.length] },
    itemStyle: { color: brandColors[i % brandColors.length] },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: brandColors[i % brandColors.length] + '25' },
          { offset: 1, color: brandColors[i % brandColors.length] + '03' },
        ],
      },
    },
  }))
  energyChart.setOption({
    grid: { left: 8, right: 8, top: 24, bottom: 24, containLabel: true },
    legend: { data: trend.map(s => s.name), top: 0, textStyle: { fontSize: 10, color: '#64748b' }, itemWidth: 10, itemHeight: 6 },
    xAxis: { type: 'category', data: trend[0]?.hours || [], axisLabel: { fontSize: 10, color: '#94a3b8' }, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8' }, splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    series,
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0', textStyle: { color: '#1e293b' }, axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1' } } },
  })
}

function initTrafficChart() {
  if (!trafficChartRef.value) return
  trafficChart = echarts.init(trafficChartRef.value)
  updateTrafficChart()
  trafficChart.on('click', (params: any) => {
    const d = trafficDistribution.value[params.dataIndex]
    if (d) onBuildingClick(d.buildingId)
  })
}

function updateTrafficChart() {
  if (!trafficChart) return
  const data = trafficDistribution.value || []
  if (!data.length) return
  trafficChart.setOption({
    color: ['#0e3a67', '#2563eb', '#b8860b', '#059669', '#d4a853'],
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, fontSize: 10, color: '#64748b', formatter: '{b}\n{c}人 ({d}%)' },
      labelLine: { length: 8, length2: 6, lineStyle: { color: '#d1d5db' } },
      data,
      emphasis: { itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.1)' } },
    }],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0', textStyle: { color: '#1e293b' },
      formatter: '{b}: {c}人 ({d}%)',
    },
  })
}

onMounted(() => {
  nextTick(() => {
    initOccupancyChart()
    initEnergyChart()
    initTrafficChart()
  })
})

watch(buildingOccupancy, updateOccupancyChart, { deep: true })
watch(energyTrend, updateEnergyChart, { deep: true })
watch(trafficDistribution, updateTrafficChart, { deep: true })

const onResize = () => {
  occupancyChart?.resize()
  energyChart?.resize()
  trafficChart?.resize()
}
window.addEventListener('resize', onResize)

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  occupancyChart?.dispose()
  energyChart?.dispose()
  trafficChart?.dispose()
})
</script>

<template>
  <div class="space-y-4">
    <!-- KPI 卡 -->
    <div class="grid grid-cols-3 gap-2">
      <div v-for="(kpi, i) in [
        { label: '教室占用率', value: store.classroomOccupancyRate + '%', color: '#0e3a67', bg: 'rgba(14,58,103,0.05)' },
        { label: '会议室占用率', value: store.meetingOccupancyRate + '%', color: '#2563eb', bg: 'rgba(37,99,235,0.05)' },
        { label: '待处理工单', value: store.tickets.filter(t => t.status !== 'done').length, color: '#dc2626', bg: 'rgba(220,38,38,0.05)' },
        { label: '今日总能耗', value: store.totalEnergy + ' kWh', color: '#b8860b', bg: 'rgba(184,134,11,0.05)' },
        { label: '在校人流', value: store.totalTraffic + ' 人', color: '#059669', bg: 'rgba(5,150,105,0.05)' },
        { label: '全校占用率', value: store.occupancyRate + '%', color: '#475569', bg: 'rgba(71,85,105,0.05)' },
      ]" :key="i" class="p-2.5 rounded-xl transition hover:scale-[1.02] cursor-default" :style="`background: ${kpi.bg}; border: 1px solid ${kpi.color}15;`"
        @click="i < 3 ? emit('focusBuilding', null) : null"
      >
        <div class="text-[9px] mb-1" style="color: #94a3b8;">{{ kpi.label }}</div>
        <div class="text-base font-bold font-mono" :style="`color: ${kpi.color};`">{{ kpi.value }}</div>
      </div>
    </div>

    <!-- 热力开关 -->
    <div class="flex items-center gap-1.5 px-3 py-2 rounded-xl" style="background: #ffffff; border: 1px solid rgba(148,163,184,0.12);">
      <span class="text-[10px] mr-1" style="color: #94a3b8;">3D 热力层</span>
      <button v-for="m in ([{k:'off',l:'关闭'},{k:'energy',l:'能耗'},{k:'traffic',l:'人流'}] as const)" :key="m.k"
        @click="setHeatmap(m.k)"
        class="px-2.5 py-1 rounded-md text-[10px] font-medium transition"
        :style="store.heatmapMode === m.k ? `background: ${m.k === 'off' ? '#0e3a67' : m.k === 'energy' ? '#b8860b' : '#059669'}; color: #fff;` : 'background: #f1f5f9; color: #94a3b8;'"
      >{{ m.l }}</button>
    </div>

    <!-- 图表 -->
    <div>
      <div class="text-[11px] font-medium mb-2 flex items-center gap-1.5" style="color: #64748b;">
        <span class="w-1 h-1 rounded-full" style="background: #0e3a67;"></span>
        各楼占用率排行
        <span class="text-[9px] ml-auto" style="color: #cbd5e1;">点击聚焦</span>
      </div>
      <div ref="occupancyChartRef" class="w-full h-32"></div>
    </div>

    <div>
      <div class="text-[11px] font-medium mb-2 flex items-center gap-1.5" style="color: #64748b;">
        <span class="w-1 h-1 rounded-full" style="background: #b8860b;"></span>
        今日能耗趋势
      </div>
      <div ref="energyChartRef" class="w-full h-36"></div>
    </div>

    <div>
      <div class="text-[11px] font-medium mb-2 flex items-center gap-1.5" style="color: #64748b;">
        <span class="w-1 h-1 rounded-full" style="background: #2563eb;"></span>
        人流分布
        <span class="text-[9px] ml-auto" style="color: #cbd5e1;">点击聚焦</span>
      </div>
      <div ref="trafficChartRef" class="w-full h-40"></div>
    </div>
  </div>
</template>
