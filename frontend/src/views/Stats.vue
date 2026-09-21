<template>
  <div class="stats-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-content">
        <div class="nav-left">
          <n-button quaternary size="small" @click="router.push('/')">
            <template #icon>
              <n-icon :component="ArrowBackOutline" />
            </template>
            返回首页
          </n-button>
        </div>
        <div class="page-title">我的旅行足迹</div>
        <div class="nav-right"></div>
      </div>
    </nav>

    <main class="main-content">
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
import { useRouter } from 'vue-router'
import { NButton, NEmpty, NIcon, NSpin } from 'naive-ui'
import {
  ArrowBackOutline,
  CalendarOutline,
  CreateOutline,
  ImageOutline,
  MapOutline,
  DocumentTextOutline,
} from '@vicons/ionicons5'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getJourneys, getJourney, type Journey, type JourneyDetail } from '@/api/journey'
import { getMyCopywritings } from '@/api/copywriting'
import type { Mood } from '@/api/diary'
import { getMoodOption } from '@/utils/mood'
import { daysBetween } from '@/utils/format'

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const router = useRouter()

const loading = ref(false)
const journeys = ref<Journey[]>([])
const journeyDetails = ref<JourneyDetail[]>([])
const copywritingCount = ref(0)

const barChartEl = ref<HTMLElement | null>(null)
const pieChartEl = ref<HTMLElement | null>(null)
let barChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

interface OverviewItem {
  label: string
  value: number
  icon: Component
  color: string
}

const overview = computed<OverviewItem[]>(() => [
  { label: '旅程', value: journeys.value.length, icon: MapOutline, color: '#5B8C5A' },
  {
    label: '总天数',
    value: journeys.value.reduce((sum, j) => sum + daysBetween(j.startDate, j.endDate), 0),
    icon: CalendarOutline,
    color: '#8FB996',
  },
  {
    label: '照片',
    value: journeys.value.reduce((sum, j) => sum + (j._count?.photos ?? 0), 0),
    icon: ImageOutline,
    color: '#E8C07A',
  },
  {
    label: '日记',
    value: journeys.value.reduce((sum, j) => sum + (j._count?.diaries ?? 0), 0),
    icon: CreateOutline,
    color: '#C98C8C',
  },
  { label: '文案', value: copywritingCount.value, icon: DocumentTextOutline, color: '#7A9CC6' },
])

/** 每月旅程数（柱状图数据） */
const monthlyData = computed(() => {
  const counter = new Map<string, number>()
  for (const journey of journeys.value) {
    const month = journey.startDate.slice(0, 7) // yyyy-MM
    counter.set(month, (counter.get(month) ?? 0) + 1)
  }
  return [...counter.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, count]) => ({ month, count }))
})

/** 心情分布（饼图数据） */
const moodData = computed(() => {
  const counter = new Map<string, number>()
  for (const detail of journeyDetails.value) {
    for (const diary of detail.diaries ?? []) {
      if (!diary.mood) continue
      counter.set(diary.mood, (counter.get(diary.mood) ?? 0) + 1)
    }
  }
  return [...counter.entries()].map(([mood, count]) => ({
    mood,
    count,
    option: getMoodOption(mood as Mood),
  }))
})

/** 城市足迹 */
const cityData = computed(() => {
  const counter = new Map<string, number>()
  for (const journey of journeys.value) {
    for (const city of journey.destinations) {
      const name = city.trim()
      if (!name) continue
      counter.set(name, (counter.get(name) ?? 0) + 1)
    }
  }
  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

/** 最常用心情 */
const topMood = computed(() => {
  const top = [...moodData.value].sort((a, b) => b.count - a.count)[0]
  if (!top) return null
  return { mood: top.mood, count: top.count, option: getMoodOption(top.mood as Mood) }
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

function renderCharts() {
  // 柱状图：每月旅程数
  if (barChartEl.value && monthlyData.value.length > 0) {
    barChart = barChart ?? echarts.init(barChartEl.value)
    barChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 16, top: 24, bottom: 28 },
      xAxis: {
        type: 'category',
        data: monthlyData.value.map((item) => item.month),
        axisLabel: { color: '#8fb996' },
        axisLine: { lineStyle: { color: '#d4e2d4' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#8fb996' },
        splitLine: { lineStyle: { color: '#eef2ec' } },
      },
      series: [
        {
          type: 'bar',
          data: monthlyData.value.map((item) => item.count),
          barWidth: '42%',
          itemStyle: { color: '#5B8C5A', borderRadius: [6, 6, 0, 0] },
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
}

onMounted(async () => {
  loading.value = true
  try {
    const [journeysRes, copywritingsRes] = await Promise.all([
      getJourneys(),
      getMyCopywritings().catch(() => ({ data: [] as never[] })),
    ])
    journeys.value = journeysRes.data
    copywritingCount.value = (copywritingsRes.data as unknown[]).length

    // 心情分布需要日记数据：逐旅程拉取详情（MVP 数据量下可接受）
    const details = await Promise.all(
      journeys.value.map((journey) =>
        getJourney(journey.id)
          .then((res) => res.data)
          .catch(() => null),
      ),
    )
    journeyDetails.value = details.filter((item): item is JourneyDetail => item !== null)

    renderCharts()
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
  barChart = null
  pieChart = null
})
</script>

<style scoped>
.stats-container {
  min-height: 100vh;
  background-color: #f7f5f0;
}

.navbar {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0 40px;
}

.navbar-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  color: #3d3d3d;
  font-size: 15px;
  font-weight: 500;
}

.nav-right {
  width: 100px;
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
