<script setup>
import { computed, onMounted, ref } from 'vue'
import chinaGeoUrl from '../assets/china-provinces.json?url'

defineProps({ onBack: Function })

const chinaGeo = ref({ features: [] })
const metric = ref('population')
const selectedCity = ref('北京')
const selectedProvince = ref('北京市')
const layer = ref('heat')
const focusType = ref('city')
const zoom = ref(1)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)
const dragOrigin = ref({ x: 0, y: 0 })
const tooltip = ref(null)

const metrics = {
  population: { label: '人口', code: 'POP', unit: '万人', national: '141,217.5', change: '+0.18%', color: '#d8ff36' },
  gdp: { label: 'GDP', code: 'GDP', unit: '亿元', national: '1,217,321', change: '+5.40%', color: '#55d6ff' },
  tourism: { label: '旅游热度', code: 'TRV', unit: '指数', national: '86,420', change: '+12.6%', color: '#ffcf4a' },
  housing: { label: '房价', code: 'HOU', unit: '元/m²', national: '38,640', change: '-0.70%', color: '#ff694f' },
}

const cities = [
  ['北京','北京市',116.40,39.90,2189,43761,96,68200], ['上海','上海市',121.47,31.23,2487,47219,94,65400],
  ['深圳','广东省',114.06,22.55,1779,34606,91,71800], ['广州','广东省',113.26,23.13,1873,30356,89,46100],
  ['成都','四川省',104.07,30.57,2140,22075,92,22700], ['重庆','重庆市',106.55,29.56,3191,30146,88,15300],
  ['武汉','湖北省',114.31,30.59,1377,21106,85,20100], ['西安','陕西省',108.94,34.34,1308,12011,87,17200],
  ['杭州','浙江省',120.16,30.27,1252,21860,90,45900], ['南京','江苏省',118.80,32.06,955,17421,84,32700],
  ['青岛','山东省',120.38,36.07,1034,16719,86,18500], ['昆明','云南省',102.83,24.88,868,7864,82,13800],
  ['厦门','福建省',118.09,24.48,535,8589,88,41500], ['长沙','湖南省',112.94,28.23,1051,14332,83,12900],
  ['郑州','河南省',113.63,34.75,1301,13618,81,12700], ['沈阳','辽宁省',123.43,41.80,914,8122,76,11800],
  ['天津','天津市',117.20,39.13,1364,16737,74,26300], ['石家庄','河北省',114.51,38.04,1122,7534,68,13200],
  ['太原','山西省',112.55,37.87,544,5574,66,11200], ['呼和浩特','内蒙古自治区',111.75,40.84,356,3801,64,10400],
  ['长春','吉林省',125.32,43.82,909,7632,67,10100], ['哈尔滨','黑龙江省',126.64,45.76,939,5577,73,9800],
  ['合肥','安徽省',117.23,31.82,985,13507,78,19200], ['福州','福建省',119.30,26.08,850,12928,79,28500],
  ['南昌','江西省',115.86,28.68,656,7800,72,11800], ['济南','山东省',117.12,36.65,943,13528,75,17300],
  ['海口','海南省',110.20,20.04,300,2358,84,18200], ['贵阳','贵州省',106.63,26.65,640,5777,76,9400],
  ['拉萨','西藏自治区',91.14,29.65,87,887,82,11200], ['兰州','甘肃省',103.84,36.06,442,3487,71,9600],
  ['西宁','青海省',101.78,36.62,248,1801,65,10300], ['银川','宁夏回族自治区',106.23,38.49,289,2536,62,8700],
  ['乌鲁木齐','新疆维吾尔自治区',87.62,43.83,408,4168,77,9300], ['南宁','广西壮族自治区',108.37,22.82,894,5995,74,10800],
  ['台北','台湾省',121.57,25.04,250,6800,88,52000], ['香港','香港特别行政区',114.17,22.32,750,25500,93,118000],
  ['澳门','澳门特别行政区',113.54,22.20,68,2800,89,92000]
].map(([name,province,lon,lat,...values])=>({ name,province,lon,lat,values }))

const metricIndex = computed(() => Object.keys(metrics).indexOf(metric.value))
const current = computed(() => metrics[metric.value])
const activeCity = computed(() => cities.find(city => city.name === selectedCity.value) || cities[0])
const ranking = computed(() => [...cities].sort((a,b) => b.values[metricIndex.value] - a.values[metricIndex.value]).slice(0,5))
const maxValue = computed(() => Math.max(...cities.map(city => city.values[metricIndex.value])))
const cityRank = computed(() => [...cities].sort((a,b) => b.values[metricIndex.value] - a.values[metricIndex.value]).findIndex(city => city.name === activeCity.value.name) + 1)
const selectedProvinceData = computed(() => provinceFeatures.value.find(item => item.name === selectedProvince.value) || { name: selectedProvince.value, value: 0 })
const provinceCities = computed(() => cities.filter(city => city.province === selectedProvince.value))
const panelName = computed(() => focusType.value === 'province' ? selectedProvince.value.replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g,'') : activeCity.value.name)
const panelParent = computed(() => focusType.value === 'province' ? 'PROVINCE PROFILE' : activeCity.value.province)
const panelValue = computed(() => focusType.value === 'province' ? selectedProvinceData.value.value : activeCity.value.values[metricIndex.value])
const panelUnit = computed(() => focusType.value === 'province' ? '区域信号指数' : current.value.unit)
const provinceFeatures = computed(() => chinaGeo.value.features.map((feature,index) => ({
  name: feature.properties.name,
  path: geometryPath(feature.geometry),
  value: 28 + ((index * 19 + metricIndex.value * 23) % 68)
})))
const routes = computed(() => cities.filter(city => city.name !== '北京').map(city => ({
  name: city.name,
  path: routePath(project(116.40,39.90), project(city.lon,city.lat))
})))
const transform = computed(() => `translate(${offset.value.x} ${offset.value.y}) scale(${zoom.value})`)
const formatValue = value => new Intl.NumberFormat('zh-CN').format(value)

function project(lon, lat) {
  return { x: 35 + ((lon - 73) / 62) * 930, y: 30 + ((54 - lat) / 38) * 560 }
}
function polygonPath(rings) {
  return rings.map(ring => ring.map(([lon,lat],index) => {
    const p = project(lon,lat)
    return `${index ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ') + ' Z').join(' ')
}
function geometryPath(geometry) {
  return geometry.type === 'Polygon' ? polygonPath(geometry.coordinates) : geometry.coordinates.map(polygonPath).join(' ')
}
function routePath(from,to) {
  const cx = (from.x + to.x) / 2
  const cy = Math.min(from.y,to.y) - Math.abs(to.x-from.x) * .18 - 25
  return `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`
}
function selectMetric(key) {
  metric.value = key
  selectedCity.value = ranking.value[0].name
}
function provinceColor(value) {
  const alpha = .13 + value / 135
  return `rgba(216,255,54,${alpha.toFixed(2)})`
}
function showProvince(event, province) {
  selectedProvince.value = province.name
  tooltip.value = { x: event.offsetX, y: event.offsetY, name: province.name, value: province.value }
}
function selectProvince(province) {
  selectedProvince.value = province.name
  focusType.value = 'province'
}
function selectCity(city) {
  selectedCity.value = city.name
  selectedProvince.value = city.province
  focusType.value = 'city'
}function onWheel(event) {
  const next = Math.min(2.8, Math.max(1, zoom.value + (event.deltaY < 0 ? .18 : -.18)))
  zoom.value = next
  if (next === 1) offset.value = { x: 0, y: 0 }
}
function startDrag(event) {
  dragging.value = true
  dragOrigin.value = { x: event.clientX - offset.value.x, y: event.clientY - offset.value.y }
  event.currentTarget.setPointerCapture(event.pointerId)
}
function moveDrag(event) {
  if (!dragging.value || zoom.value === 1) return
  offset.value = { x: event.clientX - dragOrigin.value.x, y: event.clientY - dragOrigin.value.y }
}
function resetMap() { zoom.value = 1; offset.value = { x: 0, y: 0 }; tooltip.value = null }
onMounted(async () => {
  window.scrollTo({ top: 0, behavior: 'auto' })
  const response = await fetch(chinaGeoUrl)
  chinaGeo.value = await response.json()
})
</script>

<template>
<div class="city-lab" :style="{ '--metric': current.color }">
  <header class="lab-nav">
    <button class="lab-back" @click="onBack" aria-label="返回作品集">←</button>
    <a class="lab-logo" href="#lab-top">LUXI<b>XI</b><i>✳</i></a>
    <span>PROJECT 001 / URBAN INTELLIGENCE</span>
    <div class="lab-live"><i/> LIVE DATA <b>09:42:16</b></div>
  </header>

  <main id="lab-top" class="lab-shell">
    <section class="lab-hero">
      <div><p class="lab-kicker">NATIONAL CITY PULSE / 2025</p><h1>城市<br><em>脉冲</em>实验室</h1></div>
      <div class="lab-hero-copy"><b>338</b><span>CITIES ONLINE</span><p>捕捉人口、经济、旅行与居住成本的实时信号。</p></div>
      <div class="radar-mark"><i/><i/><i/><b>SCAN</b></div>
    </section>

    <section class="metric-console" aria-label="选择指标">
      <div class="console-label"><i/> SIGNAL<br>CHANNEL</div>
      <button v-for="(item,key,index) in metrics" :key="key" :class="{active:metric===key}" @click="selectMetric(key)">
        <small>0{{index+1}} / {{item.code}}</small><strong>{{item.label}}</strong><span>{{item.unit}}</span><i/>
      </button>
      <div class="console-total"><small>NATIONAL TOTAL</small><strong>{{current.national}}</strong><span>{{current.change}}</span></div>
    </section>

    <section class="lab-grid">
      <div class="geo-console">
        <header class="geo-head">
          <div><i/> CHINA / PROVINCE NETWORK</div>
          <div class="layer-switch">
            <button :class="{active:layer==='heat'}" @click="layer='heat'">热力</button>
            <button :class="{active:layer==='flow'}" @click="layer='flow'">流动</button>
          </div>
          <div class="map-tools">
            <button @click="zoom=Math.min(2.8,zoom+.2)" title="放大">+</button>
            <button @click="zoom=Math.max(1,zoom-.2)" title="缩小">−</button>
            <button @click="resetMap" title="复位">⌂</button>
          </div>
        </header>

        <div class="map-viewport" :class="{dragging}" @wheel.prevent="onWheel" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="dragging=false" @pointercancel="dragging=false" @mouseleave="tooltip=null">
          <div v-if="!provinceFeatures.length" class="map-loading"><i/> LOADING GEO NETWORK...</div><div class="scan-line"/>
          <svg viewBox="0 0 1000 620" role="img" aria-label="中国省级热力地图">
            <defs>
              <filter id="cityGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <radialGradient id="heatGlow"><stop offset="0" :stop-color="current.color" stop-opacity=".75"/><stop offset=".35" :stop-color="current.color" stop-opacity=".25"/><stop offset="1" :stop-color="current.color" stop-opacity="0"/></radialGradient>
            </defs>
            <g :transform="transform" class="map-world">
              <path v-for="province in provinceFeatures" :key="province.name" class="province" :class="{selected:selectedProvince===province.name}" :d="province.path" :style="{fill:provinceColor(province.value)}" @mouseenter="showProvince($event,province)" @mousemove="showProvince($event,province)" @click="selectProvince(province)"/>
              <g v-if="layer==='flow'" class="route-layer"><path v-for="route in routes" :key="route.name" :d="route.path"/><circle r="3"><animateMotion dur="2.8s" repeatCount="indefinite" :path="routes[2].path"/></circle><circle r="2"><animateMotion dur="3.4s" repeatCount="indefinite" :path="routes[7].path"/></circle></g>
              <g v-for="(city,index) in cities" :key="city.name" class="city-node" :class="{active:focusType==='city'&&selectedCity===city.name,minor:index>15}" :transform="`translate(${project(city.lon,city.lat).x} ${project(city.lon,city.lat).y})`" @pointerdown.stop @pointerup.stop @click.stop="selectCity(city)">
                <circle class="node-hit" r="18"/>
                <circle v-if="layer==='heat'" class="heat-disc" :r="24+city.values[metricIndex]/maxValue*34"/>
                <circle class="node-ring" r="8"/><circle class="node-core" r="3"/>
                <text x="12" y="4">{{city.name}}</text>
              </g>
            </g>
          </svg>
          <div v-if="tooltip" class="map-tooltip" :style="{left:tooltip.x+'px',top:tooltip.y+'px'}"><small>PROVINCE SIGNAL</small><strong>{{tooltip.name}}</strong><span>{{current.label}}指数 {{tooltip.value}}</span></div>
          <div class="map-hint">滚轮缩放 · 拖拽移动 · 点击城市锁定</div>
          <div class="map-scale"><span>LOW</span><i v-for="n in 8" :key="n" :style="{opacity:.12+n*.1}"/><span>HIGH</span></div>
        </div>
      </div>

      <aside class="intel-panel">
        <section class="city-intel">
          <header><span>{{focusType==='province'?'SELECTED REGION':'SELECTED NODE'}}</span><b>{{focusType==='province'?'AREA':'NO. '+String(cities.indexOf(activeCity)+1).padStart(2,'0')}}</b></header>
          <p>{{panelParent}}</p><h2>{{panelName}}</h2>
          <div class="intel-value"><strong>{{formatValue(panelValue)}}</strong><span>{{panelUnit}}</span></div>
          <div v-if="focusType==='province'" class="region-stats"><div><small>已标记城市</small><b>{{provinceCities.length}}</b></div><div><small>当前信号</small><b>{{selectedProvinceData.value>=70?'高活跃':'稳定'}}</b></div></div>
          <div class="signal-bars"><i v-for="n in 18" :key="n" :style="{height:(14+((n*13+panelValue)%42))+'px'}"/></div>
        </section>
        <section class="ai-insight"><header><span>AI SIGNAL REPORT</span><i>GENERATED</i></header><p v-if="focusType==='province'"><b>{{panelName}}</b> 当前 {{current.label}} 信号指数为 {{selectedProvinceData.value}}，区域内已接入 {{provinceCities.length}} 个城市节点。整体状态{{selectedProvinceData.value>=70?'活跃':'平稳'}}，可点击城市标点继续查看城市详情。</p><p v-else><b>{{activeCity.name}}</b> 当前在 {{current.label}} 信号中位于样本城市第 {{cityRank}} 位。区域动能保持活跃，建议继续观察接下来 30 天的变化。</p><div><span>置信度</span><strong>{{focusType==='province'?'89.7%':'92.4%'}}</strong></div></section>
        <section class="city-ranking"><header><span>LIVE RANKING</span><b>TOP 05</b></header><button v-for="(city,index) in ranking" :key="city.name" :class="{active:focusType==='city'&&selectedCity===city.name,minor:index>15}" @click="selectCity(city)"><b>0{{index+1}}</b><span>{{city.name}}</span><i><em :style="{width:city.values[metricIndex]/maxValue*100+'%'}"/></i><strong>{{formatValue(city.values[metricIndex])}}</strong></button></section>
      </aside>
    </section>
    <footer class="lab-footer"><span>DATA SOURCE / PUBLIC DEMO DATA</span><span>34 PROVINCES · 338 CITIES · 4 SIGNALS</span><span>LUXIXI LAB © 2026</span></footer>
  </main>
</div>
</template>