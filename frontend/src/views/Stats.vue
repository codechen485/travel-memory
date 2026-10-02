<template>
  <div class="stats-container">
    <!-- 导航栏（全局组件） -->
    <AppNavbar />

    <main class="main-content">
      <div class="page-header">
        <h2>我的旅行足迹</h2>
        <p>把走过的路，画成自己的地图</p>
      </div>

      <n-spin :show="loading">
        <!-- 概览统计 -->
        <div class="overview-cards">
          <div v-for="item in overview" :key="item.label" class="overview-card">
            <n-icon :component="item.icon" :size="30" :color="item.color" />
            <div>
              <div class="overview-value">{{ item.value }}</div>
              <div class="overview-label">{{ item.label }}</div>
            </div>
          </div>
        </div>

        <!-- 足迹地图 -->
        <div class="chart-card map-card">
          <h3 class="chart-title">
            足迹地图
            <span v-if="footprint.provinces.length" class="map-count">
              点亮 {{ footprint.provinces.length }} 省 · {{ footprint.cities.length }} 城
            </span>
          </h3>
          <div class="map-chart-wrap">
            <div ref="mapChartEl" class="map-chart-box"></div>
            <n-empty
              v-if="!loading && !mapFailed && footprint.cities.length === 0"
              class="map-overlay"
              description="还没有可识别的目的地"
            >
              <template #extra>
                <span class="map-tip">建旅程时填写目的地城市（如「南京」「大理」），即可点亮足迹地图</span>
              </template>
            </n-empty>
            <div v-if="mapFailed" class="map-overlay map-fallback">
              地图底图加载失败，请检查网络后刷新重试
            </div>
          </div>
          <div v-if="footprint.unmatched.length" class="map-unmatched">
            未识别的目的地：{{ footprint.unmatched.slice(0, 8).join('、')
            }}<template v-if="footprint.unmatched.length > 8"> 等 {{ footprint.unmatched.length }} 处</template>
          </div>
        </div>

        <!-- 图表区 -->
        <div class="charts-grid">
          <div class="chart-card">
            <h3 class="chart-title">每月旅程数</h3>
            <div ref="barChartEl" class="chart-box"></div>
            <n-empty
              v-if="!loading && monthlyData.length === 0"
              description="还没有旅程数据"
              class="chart-empty"
            />
          </div>

          <div class="chart-card">
            <h3 class="chart-title">心情分布</h3>
            <div ref="pieChartEl" class="chart-box"></div>
            <n-empty
              v-if="!loading && moodData.length === 0"
              description="写日记时选择心情，即可看到分布"
              class="chart-empty"
            />
          </div>
        </div>

        <!-- 城市足迹 -->
        <div class="chart-card">
          <h3 class="chart-title">去过的地方（{{ cityData.length }}）</h3>
          <div v-if="cityData.length > 0" class="city-cloud">
            <span
              v-for="city in cityData"
              :key="city.name"
              class="city-tag"
              :style="cityTagStyle(city.count)"
            >
              {{ city.name }}
              <em v-if="city.count > 1">×{{ city.count }}</em>
            </span>
          </div>
          <n-empty v-else-if="!loading" description="还没有去过任何地方" class="chart-empty" />
        </div>

        <!-- 最常用心情 -->
        <div v-if="topMood" class="mood-banner">
          <n-icon :component="topMood.option?.icon" :size="20" :color="topMood.option?.color" />
          旅行中最常出现的心情是「{{ topMood.option?.label }}」
        </div>
      </n-spin>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import { NEmpty, NIcon, NSpin } from 'naive-ui'
import {
  CalendarOutline,
  CreateOutline,
  ImageOutline,
  MapOutline,
  DocumentTextOutline,
} from '@vicons/ionicons5'
import * as echarts from 'echarts/core'
import { BarChart, PieChart, ScatterChart, LinesChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GeoComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getMyStats, type MyStats } from '@/api/stats'
import { getJourneys, type Journey } from '@/api/journey'
import { resolvePlace } from '@/utils/china-places'
import type { Mood } from '@/api/diary'
import { getMoodOption } from '@/utils/mood'
import AppNavbar from '@/components/AppNavbar.vue'

echarts.use([
  BarChart,
  PieChart,
  ScatterChart,
  LinesChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GeoComponent,
  CanvasRenderer,
])

const loading = ref(false)
const stats = ref<MyStats | null>(null)

const barChartEl = ref<HTMLElement | null>(null)
const pieChartEl = ref<HTMLElement | null>(null)
const mapChartEl = ref<HTMLElement | null>(null)
let barChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
let mapChart: echarts.ECharts | null = null

/** 全部旅程（足迹地图数据源：目的地 + 起始日期） */
const journeyList = ref<Journey[]>([])
/** 中国地图底图加载失败标记 */
const mapFailed = ref(false)
/** 中国地图是否已注册（只 fetch 一次） */
let chinaMapRegistered = false

interface OverviewItem {
  label: string
  value: number
  icon: Component
  color: string
}

const overview = computed<OverviewItem[]>(() => {
  const o = stats.value?.overview
  return [
    { label: '旅程', value: o?.journeys ?? 0, icon: MapOutline, color: '#5B8C5A' },
    { label: '总天数', value: o?.totalDays ?? 0, icon: CalendarOutline, color: '#8FB996' },
    { label: '照片', value: o?.photos ?? 0, icon: ImageOutline, color: '#E8C07A' },
    { label: '日记', value: o?.diaries ?? 0, icon: CreateOutline, color: '#C98C8C' },
    { label: '文案', value: o?.copywritings ?? 0, icon: DocumentTextOutline, color: '#7A9CC6' },
  ]
})

/** 每月旅程数（后端已按月分组升序） */
const monthlyData = computed(() => stats.value?.monthlyJourneys ?? [])

/** 近 6 个月月份键（无数据补 0），避免单月孤柱撑满整轴显得突兀 */
const monthlySeries = computed(() => {
  const counts = new Map(monthlyData.value.map((item) => [item.month, item.count]))
  const now = new Date()
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return { months, values: months.map((m) => counts.get(m) ?? 0) }
})

/** 心情分布（饼图数据） */
const moodData = computed(() =>
  (stats.value?.moodDistribution ?? []).map((item) => ({
    mood: item.mood,
    count: item.count,
    option: getMoodOption(item.mood as Mood),
  })),
)

/** 城市足迹（后端已按次数降序） */
const cityData = computed(() => stats.value?.cities ?? [])

/** 最常用心情 */
const topMood = computed(() => {
  const mood = stats.value?.favoriteMood
  if (!mood) return null
  const item = (stats.value?.moodDistribution ?? []).find((m) => m.mood === mood)
  return { mood, count: item?.count ?? 0, option: getMoodOption(mood as Mood) }
})

/** 城市标签样式（去过的次数越多颜色越深） */
function cityTagStyle(count: number) {
  const alphas = ['0.08', '0.14', '0.2', '0.28']
  const alpha = alphas[Math.min(count, alphas.length) - 1] ?? '0.28'
  return {
    backgroundColor: `rgba(91, 140, 90, ${alpha})`,
    color: count >= 3 ? '#3D6B3D' : '#5B8C5A',
  }
}

/** 省份点亮底色（去得越多越深） */
function provinceColor(count: number): string {
  const shades = ['#dce9d4', '#c6dcbc', '#aed0a4', '#8fb996', '#74a87c', '#5b8c5a']
  return shades[Math.min(count, shades.length) - 1] ?? '#5b8c5a'
}

/** 足迹地图数据：按旅程时间顺序解析目的地 → 城市光点 + 省份点亮 + 轨迹连线 */
const footprint = computed(() => {
  const journeys = [...journeyList.value].sort((a, b) =>
    a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0,
  )
  const cityMap = new Map<string, { cityName: string; lng: number; lat: number; count: number }>()
  const provinceMap = new Map<string, number>()
  const track: [number, number][] = []
  const unmatched: string[] = []
  for (const j of journeys) {
    for (const dest of j.destinations ?? []) {
      const r = resolvePlace(dest)
      if (!r) {
        const t = (dest ?? '').trim()
        if (t && !unmatched.includes(t)) unmatched.push(t)
        continue
      }
      const cur = cityMap.get(r.cityName)
      if (cur) cur.count += 1
      else cityMap.set(r.cityName, { cityName: r.cityName, lng: r.lng, lat: r.lat, count: 1 })
      provinceMap.set(r.province, (provinceMap.get(r.province) ?? 0) + 1)
      track.push([r.lng, r.lat])
    }
  }
  // 相邻不同点连成轨迹线
  const lines: { coords: [[number, number], [number, number]] }[] = []
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1]!
    const b = track[i]!
    if (a[0] === b[0] && a[1] === b[1]) continue
    lines.push({ coords: [a, b] })
  }
  return {
    cities: [...cityMap.values()],
    provinces: [...provinceMap.entries()].map(([name, count]) => ({ name, count })),
    lines,
    unmatched,
  }
})

/** 加载并注册中国地图底图（阿里 DataV，免 key、支持 CORS，仅一次） */
async function ensureChinaMap(): Promise<boolean> {
  if (chinaMapRegistered) return true
  try {
    const res = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    if (!res.ok) return false
    const geoJson = await res.json()
    echarts.registerMap('china', geoJson)
    chinaMapRegistered = true
    return true
  } catch (error) {
    console.error('加载中国地图底图失败:', error)
    return false
  }
}

/** 渲染足迹地图：省级点亮（geo.regions）+ 城市光点（effectScatter）+ 轨迹连线（lines） */
async function renderFootprintMap() {
  if (footprint.value.cities.length === 0) return
  const ok = await ensureChinaMap()
  if (!ok) {
    mapFailed.value = true
    return
  }
  if (!mapChartEl.value) return
  mapChart = mapChart ?? echarts.init(mapChartEl.value)
  const fp = footprint.value
  mapChart.setOption({
    tooltip: { trigger: 'item' },
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.15,
      center: [104.8, 35.6],
      itemStyle: { areaColor: '#f1eee5', borderColor: '#dcd6c6', borderWidth: 0.6 },
      emphasis: { itemStyle: { areaColor: '#e6efdd' }, label: { show: false } },
      select: { itemStyle: { areaColor: '#e6efdd' }, label: { show: false } },
      regions: fp.provinces.map((p) => ({
        name: p.name,
        itemStyle: { areaColor: provinceColor(p.count) },
      })),
    },
    series: [
      {
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 2,
        effect: {
          show: true,
          period: 5,
          trailLength: 0.4,
          symbol: 'arrow',
          symbolSize: 5,
          color: '#ffffff',
        },
        lineStyle: { color: '#5B8C5A', width: 1.4, opacity: 0.5, curveness: 0.25 },
        data: fp.lines,
      },
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        symbolSize: (val: number[]) => Math.min(7 + (val[2] ?? 1) * 2, 16),
        itemStyle: { color: '#5B8C5A', shadowBlur: 8, shadowColor: 'rgba(91,140,90,0.7)' },
        label: { show: true, position: 'right', formatter: '{b}', color: '#5b8c5a', fontSize: 11 },
        data: fp.cities.map((c) => ({ name: c.cityName, value: [c.lng, c.lat, c.count] })),
        tooltip: { formatter: (p: { name: string; value: number[] }) => `${p.name}：去过 ${p.value[2]} 次` },
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

function renderCharts() {
  // 柱状图：每月旅程数
  if (barChartEl.value && monthlyData.value.length > 0) {
    barChart = barChart ?? echarts.init(barChartEl.value)
    barChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 16, top: 24, bottom: 28 },
      xAxis: {
        type: 'category',
        data: monthlySeries.value.months,
        axisLabel: { color: '#8fb996' },
        axisLine: { lineStyle: { color: '#d4e2d4' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        // 留头部空间，避免单柱顶满全高
        max: (v: { max: number }) => Math.max(2, Math.ceil(v.max * 1.2)),
        axisLabel: { color: '#8fb996' },
        splitLine: { lineStyle: { color: '#eef2ec' } },
      },
      series: [
        {
          type: 'bar',
          data: monthlySeries.value.values,
          barWidth: '46%',
          barMaxWidth: 40,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#8FB996' },
                { offset: 1, color: '#5B8C5A' },
              ],
            },
          },
        },
      ],
    })
  }

  // 饼图：心情分布
  if (pieChartEl.value && moodData.value.length > 0) {
    pieChart = pieChart ?? echarts.init(pieChartEl.value)
    pieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}：{c} 篇（{d}%）' },
      legend: { bottom: 0, textStyle: { color: '#8fb996', fontSize: 12 } },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          label: { show: false },
          data: moodData.value
            .filter((item) => item.option)
            .map((item) => ({
              name: item.option!.label,
              value: item.count,
              itemStyle: { color: item.option!.color },
            })),
        },
      ],
    })
  }
}

function handleResize() {
  barChart?.resize()
  pieChart?.resize()
  mapChart?.resize()
}

onMounted(async () => {
  loading.value = true
  try {
    const [statsRes, journeysRes] = await Promise.all([getMyStats(), getJourneys()])
    stats.value = statsRes.data
    journeyList.value = journeysRes.data ?? []

    renderCharts()
    await renderFootprintMap()
    window.addEventListener('resize', handleResize)
  } catch (error) {
    console.error('获取统计数据失败:', error)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  barChart?.dispose()
  pieChart?.dispose()
  mapChart?.dispose()
  barChart = null
  pieChart = null
  mapChart = null
})
</script>

<style scoped>
.stats-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

.page-header {
  margin-bottom: 28px;
}

.page-header h2 {
  font-size: 32px;
  color: #3d3d3d;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.page-header p {
  color: #8fb996;
  margin: 0;
  font-size: 15px;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 40px 60px;
}

/* 概览 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}

.overview-card {
  background-color: white;
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 16px rgba(91, 140, 90, 0.07);
}

.overview-value {
  font-size: 28px;
  font-weight: 600;
  color: #3d3d3d;
  line-height: 1.2;
}

.overview-label {
  font-size: 13px;
  color: #8fb996;
}

/* 图表 */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 900px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background-color: white;
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: 0 4px 16px rgba(91, 140, 90, 0.07);
  /* 空态遮罩（.chart-empty absolute）的定位父级，避免多个空态相对视口重叠 */
  position: relative;
}

.chart-title {
  font-size: 16px;
  color: #3d3d3d;
  margin: 0 0 16px 0;
  font-weight: 600;
}

.chart-box {
  height: 300px;
  position: relative;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 足迹地图 */
.map-card {
  margin-bottom: 20px;
}

.map-count {
  margin-left: 8px;
  font-size: 13px;
  font-weight: 400;
  color: #8fb996;
}

.map-chart-wrap {
  position: relative;
  height: 480px;
}

.map-chart-box {
  width: 100%;
  height: 100%;
}

.map-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.map-tip {
  color: #8fb996;
  font-size: 13px;
  max-width: 340px;
  text-align: center;
  line-height: 1.6;
}

.map-fallback {
  color: #c98c8c;
  font-size: 14px;
}

.map-unmatched {
  margin-top: 12px;
  color: #b0a894;
  font-size: 12px;
  line-height: 1.6;
}

/* 城市标签云 */
.city-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.city-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 15px;
  transition: transform 0.15s;
}

.city-tag:hover {
  transform: translateY(-2px);
}

.city-tag em {
  font-style: normal;
  font-size: 12px;
  opacity: 0.75;
}

/* 最常用心情横幅 */
.mood-banner {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: rgba(91, 140, 90, 0.07);
  border-radius: 14px;
  padding: 18px;
  color: #5b8c5a;
  font-size: 15px;
}
</style>
