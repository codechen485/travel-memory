<template>
  <div class="journey-map">
    <div v-if="mapPoints.length > 0" ref="mapContainer" class="map-container"></div>

    <div v-else class="map-empty">
      <n-empty description="日记还没有位置坐标">
        <template #icon>
          <n-icon :component="MapOutline" :size="48" color="#A8C5A8" />
        </template>
        <template #extra>
          <span class="map-empty-tip">
            写日记时点击输入框右侧的定位按钮，记录坐标后即可在此查看旅行轨迹
          </span>
        </template>
      </n-empty>
    </div>

    <!-- 图例 -->
    <div v-if="mapPoints.length > 0" class="map-legend">
      <span class="legend-item">
        <span class="legend-dot"></span>
        日记位置（按日期连线）
      </span>
      <span class="legend-item">
        <span class="legend-photo"></span>
        照片拍摄点
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { NEmpty, NIcon } from 'naive-ui'
import { MapOutline } from '@vicons/ionicons5'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { JourneyDetail } from '@/api/journey'
import type { Diary } from '@/api/diary'

const props = defineProps<{
  journey: JourneyDetail
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null

/** 坐标归一化（后端 Decimal 可能序列化为字符串） */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

interface MapPoint {
  lat: number
  lng: number
  /** 日记坐标（轨迹线节点） */
  date: string
  title: string
  locationName: string | null
}

/** 有坐标的日记（按日期升序，用于绘制轨迹线） */
const mapPoints = computed<MapPoint[]>(() => {
  const diaries = props.journey.diaries ?? []
  return diaries
    .map((diary: Diary) => {
      const lat = toNumber(diary.latitude)
      const lng = toNumber(diary.longitude)
      if (lat === null || lng === null) return null
      return {
        lat,
        lng,
        date: diary.date,
        title: diary.title,
        locationName: diary.locationName,
      } satisfies MapPoint
    })
    .filter((item): item is MapPoint => item !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
})

/** 有坐标的照片（缩略图标记） */
const photoPoints = computed(() => {
  const diaries = props.journey.diaries ?? []
  return diaries.flatMap((diary: Diary) =>
    (diary.photos ?? [])
      .map((photo) => {
        const lat = toNumber(photo.latitude)
        const lng = toNumber(photo.longitude)
        if (lat === null || lng === null) return null
        return {
          lat,
          lng,
          thumbnailUrl: photo.thumbnailUrl || photo.originalUrl,
          originalUrl: photo.originalUrl,
          diaryTitle: diary.title,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  )
})

/** 日记位置圆形标记 */
function createDiaryIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: 'diary-marker-wrap',
    html: `<div class="diary-marker">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

/** 照片缩略图标记 */
function createPhotoIcon(thumbnailUrl: string): L.DivIcon {
  return L.divIcon({
    className: 'photo-marker-wrap',
    html: `<div class="photo-marker"><img src="${thumbnailUrl}" alt="照片" loading="lazy" /></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

onMounted(() => {
  if (mapPoints.value.length === 0 || !mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: [mapPoints.value[0]!.lat, mapPoints.value[0]!.lng],
    zoom: 12,
    scrollWheelZoom: true,
  })

  // OpenStreetMap 瓦片
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  // 轨迹线（按日期顺序连接日记坐标）
  const latlngs = mapPoints.value.map((point) => [point.lat, point.lng] as [number, number])
  if (latlngs.length >= 2) {
    L.polyline(latlngs, {
      color: '#5B8C5A',
      weight: 3,
      opacity: 0.75,
      dashArray: '8 6',
      lineJoin: 'round',
    }).addTo(map)
  }

  // 日记标记（带序号）
  mapPoints.value.forEach((point, index) => {
    const marker = L.marker([point.lat, point.lng], { icon: createDiaryIcon(index) }).addTo(map!)
    marker.bindPopup(
      `<div class="diary-popup">
        <div class="diary-popup-title">${point.title}</div>
        <div class="diary-popup-meta">${point.date}${point.locationName ? ' · ' + point.locationName : ''}</div>
      </div>`,
    )
  })

  // 照片标记（缩略图）
  photoPoints.value.forEach((point) => {
    const marker = L.marker([point.lat, point.lng], {
      icon: createPhotoIcon(point.thumbnailUrl),
    }).addTo(map!)
    marker.bindPopup(
      `<div class="photo-popup">
        <img src="${point.originalUrl}" alt="照片" loading="lazy" />
        <div class="photo-popup-caption">${point.diaryTitle}</div>
      </div>`,
    )
  })

  // 自适应视野
  const allPoints: [number, number][] = [
    ...latlngs,
    ...photoPoints.value.map((point) => [point.lat, point.lng] as [number, number]),
  ]
  if (allPoints.length === 1) {
    map.setView(allPoints[0]!, 13)
  } else {
    map.fitBounds(L.latLngBounds(allPoints).pad(0.2))
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.journey-map {
  position: relative;
}

.map-container {
  height: 520px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #eef2ec;
  z-index: 0;
}

.map-empty {
  padding: 60px 0;
}

.map-empty-tip {
  color: #8fb996;
  font-size: 13px;
  max-width: 360px;
  display: inline-block;
  line-height: 1.6;
}

.map-legend {
  display: flex;
  gap: 24px;
  padding: 12px 4px 0;
  color: #666;
  font-size: 13px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #5b8c5a;
  border: 2px solid white;
  box-shadow: 0 0 0 2px rgba(91, 140, 90, 0.3);
}

.legend-photo {
  width: 18px;
  height: 14px;
  border-radius: 3px;
  background-color: #e8c07a;
  border: 2px solid white;
  box-shadow: 0 0 0 2px rgba(232, 192, 122, 0.4);
}
</style>

<style>
/* Leaflet 标记全局样式（divIcon 渲染在地图容器外层作用域，需非 scoped） */
.diary-marker-wrap,
.photo-marker-wrap {
  background: none;
  border: none;
}

.diary-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #5b8c5a;
  color: white;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.photo-marker {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.15s;
}

.photo-marker:hover {
  transform: scale(1.1);
}

.photo-marker img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.diary-popup-title {
  font-size: 14px;
  font-weight: 600;
  color: #3d3d3d;
}

.diary-popup-meta {
  font-size: 12px;
  color: #8fb996;
  margin-top: 4px;
}

.photo-popup img {
  width: 220px;
  border-radius: 6px;
  display: block;
}

.photo-popup-caption {
  font-size: 12px;
  color: #666;
  margin-top: 6px;
  text-align: center;
}
</style>
