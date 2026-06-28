<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useCampusStore } from '../stores/campus'
import * as echarts from 'echarts'

const store = useCampusStore()

// 3 个图表容器
const occupancyChartRef = ref<HTMLDivElement | null>(null)
const energyChartRef = ref<HTMLDivElement | null>(null)
const trafficChartRef = ref<HTMLDivElement | null>(null)

let occupancyChart: echarts.ECharts | null = null
let energyChart: echarts.ECharts | null = null
let trafficChart: echarts.ECharts | null = null

const brandColors = ['#0e3a67', '#1e6fdb', '#9c7720', '#10b981', '#ef4444', '#d4a853']

// === 数据计算 ===
const buildingOccupancy = computed(() => {
  return store.buildings.map(b => {
    const rooms = b.floors.flatMap(f => f.rooms)
    const busy = rooms.filter(r => r.status === 'busy').length
    const total = rooms.length
    return {
      name: b.name,
      rate: total > 0 ? Math.round((busy / total) * 100) : 0,
      total,
      busy,
    }
  }).sort((a, b) => b.rate - a.rate)
})

const energyTrend = computed(() => {
  // 模拟 7 天能耗趋势
  const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
  return store.buildings.map((b, idx) => ({
    name: b.name,
    data: hours.map((_, hIdx) => {
      const base = store.energies.find(e => e.buildingId === b.id)?.kwh || 500
      return Math.round(base * (0.6 + Math.sin(hIdx * 0.8 + idx) * 0.3 + Math.random() * 0.2))
    }),
    hours,
  }))
})

const trafficDistribution = computed(() => {
  return store.traffics.map(t => ({
    name: store.buildings.find(b => b.id === t.zoneId)?.name || t.zoneId,
    value: t.count,
  }))
})

// === 图表配置 ===
function initOccupancyChart() {
  if (!occupancyChartRef.value) return
  occupancyChart = echarts.init(occupancyChartRef.value)
  updateOccupancyChart()
}

function updateOccupancyChart() {
  if (!occupancyChart) return
  const data = buildingOccupancy.value
  occupancyChart.setOption({
    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { fontSize: 10, color: '#9ca3af', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { fontSize: 10, color: '#6b7280' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({
        value: d.rate,
        itemStyle: {
          color: d.rate > 80 ? '#ef4444' : d.rate > 50 ? '#9c7720' : '#0e3a67',
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barWidth: 14,
      label: {
        show: true,
        position: 'right',
        fontSize: 10,
        color: '#6b7280',
        formatter: '{c}%',
      },
    }],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const d = data[params[0].dataIndex]
        return `<div style="font-size:12px">${d.name}<br/>占用 ${d.busy}/${d.total} 间 (${d.rate}%)</div>`
      },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#1f2937' },
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
  const series = energyTrend.value.map((s, i) => ({
    name: s.name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 4,
    data: s.data,
    lineStyle: { width: 2, color: brandColors[i % brandColors.length] },
    itemStyle: { color: brandColors[i % brandColors.length] },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: brandColors[i % brandColors.length] + '30' },
          { offset: 1, color: brandColors[i % brandColors.length] + '05' },
        ],
      },
    },
  }))

  energyChart.setOption({
    grid: { left: 8, right: 8, top: 24, bottom: 24, containLabel: true },
    legend: {
      data: energyTrend.value.map(s => s.name),
      top: 0,
      textStyle: { fontSize: 10, color: '#6b7280' },
      itemWidth: 10,
      itemHeight: 6,
    },
    xAxis: {
      type: 'category',
      data: energyTrend.value[0]?.hours || [],
      axisLabel: { fontSize: 10, color: '#9ca3af' },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#1f2937' },
      axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1' } },
    },
  })
}

function initTrafficChart() {
  if (!trafficChartRef.value) return
  trafficChart = echarts.init(trafficChartRef.value)
  updateTrafficChart()
}

function updateTrafficChart() {
  if (!trafficChart) return
  const data = trafficDistribution.value
  trafficChart.setOption({
    color: ['#0e3a67', '#1e6fdb', '#9c7720', '#10b981', '#d4a853'],
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        fontSize: 10,
        color: '#6b7280',
        formatter: '{b}\n{c}人 ({d}%)',
      },
      labelLine: { length: 8, length2: 6, lineStyle: { color: '#d1d5db' } },
      data,
      emphasis: {
        itemStyle: {
          shadowBlur: 8,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0,0,0,0.15)',
        },
      },
    }],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#1f2937' },
      formatter: '{b}: {c}人 ({d}%)',
    },
  })
}

// === 初始化 & 监听 ===
onMounted(() => {
  initOccupancyChart()
  initEnergyChart()
  initTrafficChart()
})

watch(buildingOccupancy, updateOccupancyChart, { deep: true })
watch(energyTrend, updateEnergyChart, { deep: true })
watch(trafficDistribution, updateTrafficChart, { deep: true })

// Resize
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
    <div class="grid grid-cols-2 gap-2">
      <div class="p-3 rounded-xl bg-[#0e3a67]/5 border border-[#0e3a67]/10">
        <div class="text-[10px] text-text-secondary">全校占用率</div>
        <div class="text-xl font-bold text-brand-navy mt-0.5">{{ store.occupancyRate }}%</div>
      </div>
      <div class="p-3 rounded-xl bg-[#9c7720]/5 border border-[#9c7720]/10">
        <div class="text-[10px] text-text-secondary">今日能耗</div>
        <div class="text-xl font-bold text-brand-gold mt-0.5">{{ store.energies.reduce((s, e) => s + e.kwh, 0) }} <span class="text-xs font-normal">kWh</span></div>
      </div>
      <div class="p-3 rounded-xl bg-[#10b981]/5 border border-[#10b981]/10">
        <div class="text-[10px] text-text-secondary">实时人流</div>
        <div class="text-xl font-bold text-status-free mt-0.5">{{ store.traffics.reduce((s, t) => s + t.count, 0) }}</div>
      </div>
      <div class="p-3 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/10">
        <div class="text-[10px] text-text-secondary">待处理工单</div>
        <div class="text-xl font-bold text-status-repair mt-0.5">{{ store.tickets.filter(t => t.status !== 'done').length }}</div>
      </div>
    </div>

    <!-- 占用率排行 -->
    <div>
      <div class="text-xs text-text-secondary font-medium mb-1.5 flex items-center gap-1.5">
        <span class="w-1 h-1 rounded-full bg-brand-navy"></span>
        占用率排行
      </div>
      <div ref="occupancyChartRef" class="w-full h-36"></div>
    </div>

    <!-- 能耗趋势 -->
    <div>
      <div class="text-xs text-text-secondary font-medium mb-1.5 flex items-center gap-1.5">
        <span class="w-1 h-1 rounded-full bg-brand-gold"></span>
        今日能耗趋势
      </div>
      <div ref="energyChartRef" class="w-full h-40"></div>
    </div>

    <!-- 人流分布 -->
    <div>
      <div class="text-xs text-text-secondary font-medium mb-1.5 flex items-center gap-1.5">
        <span class="w-1 h-1 rounded-full bg-brand-blue"></span>
        人流分布
      </div>
      <div ref="trafficChartRef" class="w-full h-44"></div>
    </div>
  </div>
</template>
