<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ArrowLeft, Activity, Plus, Minus, LocateFixed, Download, Search, X, Maximize, Minimize, ArrowUpRight, MapPin, Layers } from 'lucide-vue-next'
import geography from '../assets/china-provinces.json'
import regionIndex from '../assets/city-regions.json'
import { provinceProfiles } from './cityHeatmap/provinceProfiles'
defineProps({ onBack: Function })
const metrics = [
  { label:'常住人口', unit:'万人', code:'POPULATION', color:'#83dfbd' },
  { label:'经济规模', unit:'亿元', code:'ECONOMY', color:'#e8bd7c' },
  { label:'旅游热度', unit:'指数', code:'TOURISM', color:'#ee9aaa' },
  { label:'住房价格', unit:'元/m²', code:'HOUSING', color:'#a9bfff' },
]
// Retain the original demonstration observations; no live or official feed is implied.
const cities = [
  ['北京','北京市',116.40,39.90,2189,43761,96,68200],['上海','上海市',121.47,31.23,2487,47219,94,65400],
  ['深圳','广东省',114.06,22.55,1779,34606,91,71800],['广州','广东省',113.26,23.13,1873,30356,89,46100],
  ['成都','四川省',104.07,30.57,2140,22075,92,22700],['重庆','重庆市',106.55,29.56,3191,30146,88,15300],
  ['武汉','湖北省',114.31,30.59,1377,21106,85,20100],['西安','陕西省',108.94,34.34,1308,12011,87,17200],
  ['杭州','浙江省',120.16,30.27,1252,21860,90,45900],['南京','江苏省',118.80,32.06,955,17421,84,32700],
  ['青岛','山东省',120.38,36.07,1034,16719,86,18500],['昆明','云南省',102.83,24.88,868,7864,82,13800],
  ['厦门','福建省',118.09,24.48,535,8589,88,41500],['长沙','湖南省',112.94,28.23,1051,14332,83,12900],
  ['郑州','河南省',113.63,34.75,1301,13618,81,12700],['沈阳','辽宁省',123.43,41.80,914,8122,76,11800],
  ['天津','天津市',117.20,39.13,1364,16737,74,26300],['石家庄','河北省',114.51,38.04,1122,7534,68,13200],
  ['太原','山西省',112.55,37.87,544,5574,66,11200],['呼和浩特','内蒙古自治区',111.75,40.84,356,3801,64,10400],
  ['长春','吉林省',125.32,43.82,909,7632,67,10100],['哈尔滨','黑龙江省',126.64,45.76,939,5577,73,9800],
  ['合肥','安徽省',117.23,31.82,985,13507,78,19200],['福州','福建省',119.30,26.08,850,12928,79,28500],
  ['南昌','江西省',115.86,28.68,656,7800,72,11800],['济南','山东省',117.12,36.65,943,13528,75,17300],
  ['海口','海南省',110.20,20.04,300,2358,84,18200],['贵阳','贵州省',106.63,26.65,640,5777,76,9400],
  ['拉萨','西藏自治区',91.14,29.65,87,887,82,11200],['兰州','甘肃省',103.84,36.06,442,3487,71,9600],
  ['西宁','青海省',101.78,36.62,248,1801,65,10300],['银川','宁夏回族自治区',106.23,38.49,289,2536,62,8700],
  ['乌鲁木齐','新疆维吾尔自治区',87.62,43.83,408,4168,77,9300],['南宁','广西壮族自治区',108.37,22.82,894,5995,74,10800],
  ['台北','台湾省',121.57,25.04,250,6800,88,52000],['香港','香港特别行政区',114.17,22.32,750,25500,93,118000],
  ['澳门','澳门特别行政区',113.54,22.20,68,2800,89,92000],
].map(([name,province,lon,lat,...values]) => ({id:name,name,province,lon,lat,values}))
const detailNodes = regionIndex.flatMap(region => region.children.map(child => {
  const sample = cities.find(city => city.province === region.name && city.name + '市' === child.name)
  return sample ? {...sample, code:child.code, level:child.level} : {
    id:String(child.code), code:child.code, name:child.name, province:region.name,
    lon:child.center[0], lat:child.center[1], values:null, level:child.level,
  }
}))
const allNodes = [...cities.filter(city => !detailNodes.some(node => node.id === city.id)), ...detailNodes]
const metric = ref(0), selected = ref('上海'), compare = ref('北京'), query = ref(''), region = ref('')
const focus = ref('city'), selectedRegion = ref('上海市')
const layer = ref('heat'), labels = ref(true), zoom = ref(1), offset = ref({x:0,y:0})
const root = ref(null), surface = ref(null), full = ref(false), notice = ref('')
const boundaries = ref({}), loadingRegions = ref([]), failedRegions = ref([])
const mapWidth = ref(1000), mapHeight = ref(620)
const pointers = new Map(), pending = new Set()
let drag = null, pinch = null, moved = false, timer, loadTimer, observer, disposed = false
const current = computed(() => metrics[metric.value])
const active = computed(() => allNodes.find(c => c.id === selected.value))
const comparison = computed(() => cities.find(c => c.name === compare.value))
const regions = regionIndex.map(r => r.name)
const activeRegion = computed(() => regionIndex.find(r => r.name === selectedRegion.value))
const regionInfo = computed(() => provinceProfiles[selectedRegion.value])
const regionalNodes = computed(() => detailNodes.filter(c => c.province === selectedRegion.value))
const regionSamples = computed(() => cities.filter(c => c.province === selectedRegion.value))
const subdivisionsLabel = computed(() => ['北京市','天津市','上海市','重庆市','香港特别行政区','澳门特别行政区'].includes(selectedRegion.value) ? '区县 / 地区' : '城市 / 州 / 直辖县')
const visible = computed(() => cities.filter(c => (!region.value || c.province===region.value) && (c.name+c.province).includes(query.value.trim())))
const matches = computed(() => allNodes.filter(c => (!region.value || c.province===region.value) && (c.name+c.province).includes(query.value.trim())))
const ranking = computed(() => [...visible.value].sort((a,b) => b.values[metric.value]-a.values[metric.value]))
const max = computed(() => Math.max(...cities.map(c => c.values[metric.value])))
const rank = computed(() => [...cities].sort((a,b) => b.values[metric.value]-a.values[metric.value]).findIndex(c=>c.id===selected.value)+1)
const average = computed(() => visible.value.length ? visible.value.reduce((sum,c)=>sum+c.values[metric.value],0)/visible.value.length : 0)
const buckets = computed(() => Array.from({length:5},(_,i)=>({label:i*20+'–'+(i+1)*20+'%', count:visible.value.filter(c=>Math.min(4,Math.floor(c.values[metric.value]/max.value*5))===i).length})))
const comparisonRows = computed(() => [active.value,comparison.value].filter((c,i)=>c?.values && (!i || c.id!==selected.value)))
const fmt = value => new Intl.NumberFormat('zh-CN',{maximumFractionDigits:1}).format(value)
const point = (lon,lat) => ({x:35+(lon-73)/62*930,y:30+(54-lat)/38*560})
const ringPath = rings => rings.map(ring=>ring.map(([lon,lat],i)=>{const p=point(lon,lat); return (i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)}).join(' ')+'Z').join(' ')
const geometryPath = geometry => geometry.type==='Polygon'?ringPath(geometry.coordinates):geometry.coordinates.map(ringPath).join(' ')
function mainBounds(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  // Fit the largest land polygon so distant islands do not shrink the mainland.
  const area = ring => Math.abs(ring.reduce((sum,p,i) => {const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1]},0))
  const ring = [...polygons].sort((a,b)=>area(b[0])-area(a[0]))[0][0]
  const points = ring.map(([lon,lat])=>point(lon,lat))
  return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))}
}
const provinces = geography.features.map(f=>({name:f.properties.name,code:f.properties.adcode,path:geometryPath(f.geometry),bounds:mainBounds(f.geometry)}))
const viewBounds = computed(() => ({minX:500+(-500-offset.value.x)/zoom.value,maxX:500+(500-offset.value.x)/zoom.value,minY:310+(-310-offset.value.y)/zoom.value,maxY:310+(310-offset.value.y)/zoom.value}))
const inView = (p,pad=0) => p.x>=viewBounds.value.minX-pad && p.x<=viewBounds.value.maxX+pad && p.y>=viewBounds.value.minY-pad && p.y<=viewBounds.value.maxY+pad
const mapNodes = computed(() => matches.value.filter(c => {
  const important = provinceProfiles[c.province]?.[0] === c.name
  return (zoom.value>=2.4 || important || query.value.trim()) && inView(point(c.lon,c.lat),5/zoom.value)
}))
const detailRegions = computed(() => zoom.value<2.4 ? [] : provinces.filter(p => p.name && (!region.value || p.name===region.value) && p.bounds.maxX>=viewBounds.value.minX && p.bounds.minX<=viewBounds.value.maxX && p.bounds.maxY>=viewBounds.value.minY && p.bounds.minY<=viewBounds.value.maxY).map(p=>p.code))
const cityBoundaries = computed(() => detailRegions.value.flatMap(code=>boundaries.value[code] || []))
const markerScale = computed(() => Math.max(1000/mapWidth.value,620/mapHeight.value)/zoom.value)
const labelIds = computed(() => {
  if(!labels.value) return new Set([selected.value])
  const occupied=[],result=new Set(),scale=markerScale.value
  const candidates=[...mapNodes.value].sort((a,b)=>Number(b.id===selected.value)-Number(a.id===selected.value)||Number(provinceProfiles[b.province]?.[0]===b.name)-Number(provinceProfiles[a.province]?.[0]===a.name))
  for(const city of candidates){
    const p=point(city.lon,city.lat),box={x:p.x+7*scale,y:p.y-13*scale,w:(city.name.length*11+6)*scale,h:16*scale}
    if(city.id===selected.value || !occupied.some(b=>box.x<b.x+b.w && box.x+box.w>b.x && box.y<b.y+b.h && box.y+box.h>b.y)){
      occupied.push(box);result.add(city.id)
    }
  }
  return result
})
async function loadBoundary(code) {
  const meta=regionIndex.find(r=>r.code===code)
  if(!meta || meta.status!=='available' || boundaries.value[code] || pending.has(code)) return
  pending.add(code); loadingRegions.value=[...pending]
  try {
    const response=await fetch('/assets/city-heatmap/regions/'+code+'.json')
    if(!response.ok) throw new Error('Boundary unavailable')
    const data=await response.json()
    const paths=data.features.map(f=>({code:f.properties.code,name:f.properties.name,path:geometryPath(f.geometry)}))
    if(!disposed){ boundaries.value={...boundaries.value,[code]:paths};failedRegions.value=failedRegions.value.filter(c=>c!==code) }
  } catch {if(!disposed && !failedRegions.value.includes(code)) failedRegions.value.push(code)}
  finally {pending.delete(code);if(!disposed) loadingRegions.value=[...pending]}
}
watch(detailRegions, codes=>{clearTimeout(loadTimer);loadTimer=setTimeout(()=>codes.filter(code=>!failedRegions.value.includes(code)).forEach(loadBoundary),120)})
function retryBoundaries(){const codes=[...failedRegions.value];failedRegions.value=[];codes.forEach(loadBoundary)}
function resetMap(){zoom.value=1;offset.value={x:0,y:0}}
function zoomAt(next,anchor={x:500,y:310}){
  const old=zoom.value;next=Math.max(1,Math.min(24,next))
  offset.value={x:anchor.x-500-(anchor.x-500-offset.value.x)*next/old,y:anchor.y-310-(anchor.y-310-offset.value.y)*next/old}
  zoom.value=next;if(next===1) resetMap()
}
function eventPoint(event){
  const svg=surface.value.querySelector('svg'), matrix=svg.getScreenCTM()
  return matrix ? new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()) : {x:500,y:310}
}
function changeZoom(direction){zoomAt(zoom.value*(direction>0?1.35:1/1.35))}
function onWheel(event){zoomAt(zoom.value*Math.exp(-Math.max(-150,Math.min(150,event.deltaY))*.002),eventPoint(event))}
function startDrag(event){
  if(event.pointerType!=='touch' && event.button!==0)return
  pointers.set(event.pointerId,eventPoint(event));moved=false
  if(pointers.size===2){
    const [a,b]=[...pointers.values()]
    pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:zoom.value,anchor:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
    drag=null;moved=true
  } else {const p=eventPoint(event);drag={x:p.x,y:p.y,ox:offset.value.x,oy:offset.value.y}}
}
function moveDrag(event){
  if(!pointers.has(event.pointerId)) return
  const p=eventPoint(event);pointers.set(event.pointerId,p)
  if(pinch && pointers.size===2){
    const [a,b]=[...pointers.values()]
    zoomAt(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance),pinch.anchor)
    moved=true;return
  }
  if(!drag)return
  const dx=p.x-drag.x,dy=p.y-drag.y
  if(Math.abs(dx)+Math.abs(dy)>5){moved=true;if(!surface.value.hasPointerCapture(event.pointerId))surface.value.setPointerCapture(event.pointerId)}
  if(zoom.value>1)offset.value={x:drag.ox+dx,y:drag.oy+dy}
}
function endDrag(event){pointers.delete(event.pointerId);drag=null;pinch=null}
function focusProvince(name,fit=true){
  selectedRegion.value=name;focus.value='province';region.value=name;query.value=''
  const province=provinces.find(p=>p.name===name)
  if(fit && province){
    const b=province.bounds,z=Math.max(2.8,Math.min(24,Math.min(760/(b.maxX-b.minX),420/(b.maxY-b.minY))))
    zoom.value=z;offset.value={x:(500-(b.minX+b.maxX)/2)*z,y:(310-(b.minY+b.maxY)/2)*z}
  }
}
function pickProvince(province,keyboard=false){
  if((moved && !keyboard) || !province.name)return
  if(focus.value==='province' && selectedRegion.value===province.name){
    selectedRegion.value='';focus.value='city';clearFilters()
  } else focusProvince(province.name,false)
}
function pick(city,locate=false){
  if(moved && !locate)return
  selected.value=city.id;selectedRegion.value=city.province;focus.value='city'
  if(locate){const p=point(city.lon,city.lat);zoom.value=Math.max(4,zoom.value);offset.value={x:(500-p.x)*zoom.value,y:(310-p.y)*zoom.value}}
}
function clearFilters(){query.value='';region.value=''}
function regionChanged(){if(region.value)focusProvince(region.value);else{resetMap();focus.value='city'}}
function showNotice(text){notice.value=text;clearTimeout(timer);timer=setTimeout(()=>notice.value='',3000)}
async function fullscreen(){try{if(document.fullscreenElement) await document.exitFullscreen();else await root.value.requestFullscreen()}catch{showNotice('当前浏览器不支持全屏')}}
function syncFullscreen(){full.value=Boolean(document.fullscreenElement)}
function exportData(){
  const rows=[['城市','地区',...metrics.map(m=>m.label+'('+m.unit+')')],...ranking.value.map(c=>[c.name,c.province,...c.values])]
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}))
  const link=document.createElement('a');link.href=url;link.download='城市热力脉冲实验室-演示样本.csv';link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000);showNotice('已导出 '+visible.value.length+' 个城市样本')
}
onMounted(()=>{
  window.addEventListener('pointerup',endDrag);document.addEventListener('fullscreenchange',syncFullscreen)
  observer=new ResizeObserver(([entry])=>{mapWidth.value=entry.contentRect.width;mapHeight.value=entry.contentRect.height})
  observer.observe(surface.value)
})
onUnmounted(()=>{disposed=true;observer?.disconnect();clearTimeout(loadTimer);window.removeEventListener('pointerup',endDrag);document.removeEventListener('fullscreenchange',syncFullscreen);clearTimeout(timer)})
</script>

<template>
<main ref="root" class="urban-pulse" :style="{'--accent':current.color}">
  <header class="pulse-header">
    <button class="icon-button" title="返回作品集" aria-label="返回作品集" @click="onBack"><ArrowLeft :size="18"/></button>
    <div class="brand"><Activity :size="28"/><div><h1>城市热力脉冲实验室</h1><span>URBAN PULSE / GEOSPATIAL OBSERVATORY</span></div></div>
    <div class="demo-badge"><i/> DEMO DATA <span>静态演示样本</span></div>
    <button class="icon-button" title="导出样本 CSV" aria-label="导出样本 CSV" @click="exportData"><Download :size="17"/></button>
    <button class="icon-button fullscreen-button" :title="full?'退出全屏':'进入全屏'" :aria-label="full?'退出全屏':'进入全屏'" @click="fullscreen"><component :is="full?Minimize:Maximize" :size="17"/></button>
  </header>
  <div class="workspace">
    <div class="overview"><span><i/> 全国城市观察</span><span>CHINA / {{cities.length}} SAMPLES / 04 DIMENSIONS</span></div>
    <div class="metric-tabs" aria-label="数据指标">
      <button v-for="(item,i) in metrics" :key="item.code" :aria-pressed="metric===i" :class="{selected:metric===i}" @click="metric=i">
        <span class="metric-top"><small>0{{i+1}} / {{item.code}}</small><ArrowUpRight :size="15"/></span>
        <span class="metric-name">{{item.label}}<small>{{item.unit}}</small></span>
        <span class="meter"><i v-for="n in 24" :key="n" :style="{background:item.color,opacity:n<[19,22,16,12][i]?1:.15}"/></span>
      </button>
    </div>
    <div class="analysis">
      <section class="geo">
        <header class="section-header"><div><small>01 / SPATIAL DISTRIBUTION</small><h2>{{current.label}}空间分布</h2></div><span>{{mapNodes.length}} 个可见节点 / {{visible.length}} 个指标样本</span></header>
        <div class="filters">
          <label class="search"><Search :size="15"/><input v-model="query" placeholder="搜索城市 / 地区" aria-label="搜索城市或地区"/><button v-if="query" title="清空搜索" aria-label="清空搜索" @click="query=''"><X :size="14"/></button></label>
          <select v-model="region" aria-label="地区筛选" @change="regionChanged"><option value="">全部地区</option><option v-for="item in regions" :key="item">{{item}}</option></select>
          <div class="layers"><button :class="{selected:layer==='heat'}" :aria-pressed="layer==='heat'" @click="layer='heat'">热力</button><button :class="{selected:layer==='bubble'}" :aria-pressed="layer==='bubble'" @click="layer='bubble'">气泡</button></div>
        </div>
        <div v-if="query.trim()" class="search-results"><button v-for="city in matches.slice(0,12)" :key="city.id" @click="pick(city,true)"><MapPin :size="13"/>{{city.name}}<small>{{city.province}}</small></button><span v-if="!matches.length">没有匹配的城市或地区</span></div>
        <div class="map-context"><button @click="clearFilters();resetMap();focus='city'">全国</button><span v-if="region">/</span><button v-if="region" @click="focusProvince(region)">{{region}}</button><small>{{zoom>=2.4?'城市 / 区县层':'省会节点层'}}</small></div>
        <div ref="surface" class="map" @wheel.prevent="onWheel" @dblclick.prevent="zoomAt(zoom*1.6,eventPoint($event))" @pointerdown="startDrag" @pointermove="moveDrag" @pointercancel="endDrag">
          <div class="map-caption"><span>{{region || '中华人民共和国'}}</span><small>{{zoom>=2.4?'LOCAL GEOGRAPHY':'CHINA'}} / {{current.code}}</small></div>
          <svg viewBox="0 0 1000 620" aria-label="全国城市样本分布地图">
            <defs><radialGradient id="pulse-density"><stop offset="0" stop-color="#fff7b1" stop-opacity=".9"/><stop offset=".2" :stop-color="current.color" stop-opacity=".7"/><stop offset=".55" :stop-color="current.color" stop-opacity=".2"/><stop offset="1" :stop-color="current.color" stop-opacity="0"/></radialGradient></defs>
            <g :transform="'translate('+(500+offset.x)+' '+(310+offset.y)+') scale('+zoom+') translate(-500 -310)'">
              <path v-for="province in provinces" :key="province.name" :d="province.path" class="land" :class="{focused:!!province.name && province.name===selectedRegion}" :role="province.name?'button':undefined" :tabindex="province.name?0:undefined" :aria-label="province.name?'查看'+province.name+'详情':undefined" :aria-pressed="province.name?focus==='province' && selectedRegion===province.name:undefined" @click.stop="pickProvince(province)" @dblclick.stop.prevent @keydown.enter.prevent="pickProvince(province,true)" @keydown.space.prevent="pickProvince(province,true)"><title>{{province.name}}</title></path>
              <g class="city-boundaries"><path v-for="area in cityBoundaries" :key="area.code" :d="area.path"/></g>
              <g v-if="layer==='heat'" class="density"><circle v-for="city in mapNodes.filter(c=>c.values)" :key="city.id" :cx="point(city.lon,city.lat).x" :cy="point(city.lon,city.lat).y" :r="(14+Math.sqrt(city.values[metric]/max)*30)*markerScale" fill="url(#pulse-density)"/></g>
              <g v-for="city in mapNodes" :key="city.id" class="node" :class="{chosen:focus==='city' && selected===city.id,geographic:!city.values}" :transform="'translate('+point(city.lon,city.lat).x+' '+point(city.lon,city.lat).y+') scale('+markerScale+')'" role="button" tabindex="0" :aria-label="city.name+' '+(city.values?current.label+' '+fmt(city.values[metric])+current.unit:'地理节点，暂无指标样本')" @click.stop="pick(city)" @keydown.enter.prevent="pick(city,true)" @keydown.space.prevent="pick(city,true)">
                <title>{{city.name}} · {{city.values?fmt(city.values[metric])+' '+current.unit:'暂无指标样本'}}</title>
                <circle v-if="layer==='bubble' && city.values" class="bubble" :r="4+Math.sqrt(city.values[metric]/max)*16"/>
                <circle class="hit" r="10"/><circle class="core" r="2.5"/><circle v-if="focus==='city' && selected===city.id" class="selection-ring" r="8"/>
                <text v-if="labelIds.has(city.id)" x="7" y="-7">{{city.name}}</text>
              </g>
            </g>
          </svg>
          <div v-if="!matches.length" class="empty"><Search :size="24"/><p>没有匹配的城市样本</p><button @click="clearFilters">重置筛选</button></div>
          <div v-if="loadingRegions.length" class="boundary-status" role="status">市级边界加载中</div><div v-else-if="failedRegions.some(code=>detailRegions.includes(code))" class="boundary-status"><button @click="retryBoundaries">边界加载失败，重试</button></div>
          <div class="map-tools" @pointerdown.stop @dblclick.stop><button class="icon-button" title="放大" aria-label="放大" :disabled="zoom>=24" @click="changeZoom(.25)"><Plus :size="17"/></button><button class="icon-button" title="缩小" aria-label="缩小" :disabled="zoom<=1" @click="changeZoom(-.25)"><Minus :size="17"/></button><button class="icon-button" title="复位地图" aria-label="复位地图" @click="resetMap"><LocateFixed :size="17"/></button></div>
          <div class="map-bottom" @pointerdown.stop><label><input v-model="labels" type="checkbox"/>城市标注</label><div class="legend"><span>低</span><i/><span>高</span><span class="geo-key">○ 无指标</span></div><span>{{zoom.toFixed(2)}}×</span></div>
        </div>
        <div class="map-stats"><div><small>当前样本均值</small><strong>{{fmt(average)}} <span>{{current.unit}}</span></strong></div><div><small>当前样本最高</small><strong>{{ranking[0]?.name || '—'}} <span>{{ranking[0]?fmt(ranking[0].values[metric]):'—'}}</span></strong></div><div><small>样本覆盖地区</small><strong>{{new Set(visible.map(c=>c.province)).size}} <span>/ {{regions.length}}</span></strong></div></div>
      </section>
      <aside class="profile">
        <template v-if="focus==='province'">
          <header class="profile-header"><small>02 / PROVINCE PROFILE</small><MapPin :size="16"/></header>
          <div class="province-title"><h2>{{selectedRegion}}</h2><span>{{regionInfo[1]}}</span></div>
          <p class="province-summary">{{regionInfo[2]}}</p>
          <div class="province-traits"><span v-for="trait in regionInfo[3].split(' / ')" :key="trait">{{trait}}</span></div>
          <dl class="province-facts"><div><dt>{{['北京市','天津市','上海市','重庆市','香港特别行政区','澳门特别行政区'].includes(selectedRegion)?'中心节点':'省会 / 首府'}}</dt><dd>{{regionInfo[0]}}</dd></div><div><dt>已收录{{subdivisionsLabel}}</dt><dd>{{regionalNodes.length || '暂无'}}</dd></div><div><dt>已收录指标样本</dt><dd>{{regionSamples.length}} 个城市</dd></div></dl>
          <div class="province-list-heading"><h3>{{subdivisionsLabel}}</h3><span>地理档案</span></div>
          <div class="province-cities"><button v-for="city in regionalNodes" :key="city.id" @click="pick(city,true)"><span>{{city.name}}</span><small>{{city.values?fmt(city.values[metric])+' '+current.unit:'暂无指标'}}</small><ArrowUpRight :size="13"/></button></div>
          <p v-if="!regionalNodes.length" class="no-geo">当前地理数据源未提供该地区的下级边界。保留省级地图与已有城市样本。</p>
          <div v-if="!regionalNodes.length" class="province-cities"><button v-for="city in regionSamples" :key="city.id" @click="pick(city,true)"><span>{{city.name}}</span><ArrowUpRight :size="13"/></button></div>
          <p class="province-source">地理数据：DataV.GeoAtlas 快照 · 2026-09-15<br>收录数量不代表最新行政区划；指标样本不代表全省统计。</p>
        </template>
        <template v-else>
        <button class="profile-back" @click="focusProvince(active.province)"><ArrowLeft :size="13"/>{{active.province}}档案</button>

        <header class="profile-header"><small>02 / CITY PROFILE</small><MapPin :size="16"/></header>
        <div class="city-title"><h2>{{active.name}}</h2><span v-if="active.values">样本排名 <b>{{String(rank).padStart(2,'0')}}</b></span><span v-else>地理节点</span></div>
        <p class="coordinates">{{active.province}}<span>{{active.lon.toFixed(2)}}° E / {{active.lat.toFixed(2)}}° N</span></p>
        <template v-if="active.values">
        <div class="city-value"><strong>{{fmt(active.values[metric])}}</strong><span>{{current.unit}}</span></div>
        <div class="value-caption"><span>{{current.label}}</span><span>静态演示样本</span></div>
        <div class="compare-heading"><h3>城市对照</h3><select v-model="compare" aria-label="选择对比城市"><option value="">不对比</option><option v-for="city in cities" :key="city.name" :value="city.name">{{city.name}}</option></select></div>
        <div class="compare-bars"><div v-for="city in comparisonRows" :key="city.name"><div><span>{{city.name}}</span><b>{{fmt(city.values[metric])}}</b></div><i><em :style="{width:city.values[metric]/max*100+'%'}"/></i></div></div>
        <div class="profile-metrics"><div v-for="(item,i) in metrics" :key="item.code"><span><i :style="{background:item.color}"/>{{item.label}}</span><b>{{fmt(active.values[i])}}<small>{{item.unit}}</small></b></div></div>
        <div class="insight"><Activity :size="16"/><p>{{active.name}}的{{current.label}}位于全部 {{cities.length}} 个样本城市中的第 <b>{{rank}}</b> 位。<template v-if="comparison && comparison.name!==active.name">较{{comparison.name}}{{active.values[metric]>=comparison.values[metric]?'高':'低'}} <b>{{fmt(Math.abs(active.values[metric]/comparison.values[metric]-1)*100)}}%</b>。</template></p></div>
        </template>
        <div v-else class="no-sample"><Activity :size="24"/><h3>暂无指标样本</h3><p>{{active.name}}已收录地理位置与所属地区，人口、经济、旅游和房价数据尚未接入。</p><div><small>所属地区</small><strong>{{active.province}}</strong></div><div><small>地理层级</small><strong>{{active.level==='district'?'区县 / 地区':'城市 / 地区'}}</strong></div></div>
        </template>
      </aside>
    </div>
    <div class="bottom">
      <section class="ranking"><header class="section-header"><div><small>03 / LEADING CITIES</small><h2>城市信号排行</h2></div><span>TOP 06 / {{current.unit}}</span></header><div class="rank-grid"><button v-for="(city,i) in ranking.slice(0,6)" :key="city.name" :class="{selected:focus==='city' && selected===city.id}" @click="pick(city,true)"><span class="rank-index">0{{i+1}}</span><div><span>{{city.name}}<b>{{fmt(city.values[metric])}}</b></span><i><em :style="{width:city.values[metric]/max*100+'%'}"/></i></div><ArrowUpRight :size="14"/></button><p v-if="!ranking.length">暂无匹配样本</p></div></section>
      <section class="distribution"><header class="section-header"><div><small>04 / SAMPLE SPECTRUM</small><h2>样本强度分布</h2></div><Layers :size="17"/></header><div class="histogram"><div v-for="(bucket,i) in buckets" :key="bucket.label"><span>{{bucket.count}}</span><i :style="{height:Math.max(2,bucket.count/Math.max(1,...buckets.map(b=>b.count))*60)+'px',opacity:.35+i*.16}"/><small>{{bucket.label}}</small></div></div><p>按全国样本最大值归一化 / {{visible.length}} 个城市</p></section>
    </div>
    <footer class="pulse-footer"><span><i/> 数据口径：静态演示样本，非实时统计，不用于决策</span><span>LUXIXI LAB / EXPERIMENT 001</span></footer>
  </div>
  <div v-if="notice" class="toast" role="status">{{notice}}</div>
</main>
</template>

<style scoped>
.urban-pulse{--accent:#83dfbd;--edge:#343e37;--muted:#96a38f;background:#171c18;color:#edf0e7;min-height:100vh;font:13px 'Segoe UI','Microsoft YaHei',sans-serif;color-scheme:dark}.urban-pulse *{box-sizing:border-box;letter-spacing:0}.urban-pulse section{padding:0;border:0}.urban-pulse button,.urban-pulse input,.urban-pulse select{font:inherit}.urban-pulse button{cursor:pointer}.urban-pulse button:focus-visible,.urban-pulse select:focus-visible,.urban-pulse input:focus-visible,.node:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.urban-pulse button:disabled{opacity:.3;cursor:default}.pulse-header{height:84px;display:flex;align-items:center;gap:14px;padding:0 32px;border-bottom:1px solid var(--edge);background:#1b231d}.icon-button{width:34px;height:34px;display:grid;place-items:center;padding:0;background:transparent;border:1px solid var(--edge);color:#bdc8b9;border-radius:4px;flex-shrink:0}.icon-button:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}.brand{display:flex;align-items:center;gap:13px}.brand>svg{color:var(--accent)}.brand h1{font-size:22px;line-height:1.4;margin:0 0 3px;font-weight:600}.brand span{font:9px monospace;color:#93a18a}.demo-badge{margin-left:auto;display:flex;align-items:center;gap:8px;font:10px monospace;color:#dfbd7c}.demo-badge span{color:var(--muted);font-size:11px;margin-left:10px}.demo-badge i,.overview i,.pulse-footer i{width:5px;height:5px;background:var(--accent);border-radius:50%;display:inline-block}.workspace{max-width:1680px;margin:auto;padding:24px 32px 0}.overview{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:11px;margin-bottom:19px}.overview>span:first-child{display:flex;gap:9px;align-items:center;color:#d9e2ce}.overview>span:last-child{font:10px monospace}.metric-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--edge);border-bottom:1px solid var(--edge);margin-bottom:24px}.metric-tabs>button{background:#20271f;border:0;border-right:1px solid var(--edge);padding:16px 22px;text-align:left;color:var(--muted);position:relative}.metric-tabs>button:last-child{border-right:0}.metric-tabs>button.selected{background:#2b3528;color:#f0f5e6}.metric-tabs>button.selected:after{position:absolute;content:'';left:0;right:0;bottom:-1px;height:2px;background:var(--accent)}.metric-top{display:flex;justify-content:space-between;align-items:center}.metric-top small{font:9px monospace}.metric-tabs .selected .metric-top{color:var(--accent)}.metric-name{display:flex;align-items:baseline;gap:12px;font-size:19px;font-weight:600;margin-top:12px}.metric-name small{font-size:10px;font-weight:400;color:var(--muted)}.meter{display:flex;gap:4px;margin-top:15px;height:4px}.meter i{flex:1;max-width:10px}.analysis{display:grid;grid-template-columns:minmax(0,1fr) 320px;border-top:1px solid var(--edge);border-bottom:1px solid var(--edge)}.urban-pulse .geo{min-width:0;padding:20px 22px 0 0}.section-header{display:flex;justify-content:space-between;align-items:center;color:var(--muted)}.section-header small,.profile-header small{font:9px monospace;color:var(--muted)}.urban-pulse h2{font:600 17px/1.4 'Microsoft YaHei',sans-serif;margin:7px 0 0}.section-header>span{font:10px monospace;color:var(--accent)}.filters{display:flex;gap:10px;align-items:center;margin:18px 0 14px}.search{display:flex;align-items:center;gap:8px;background:#222c21;border:1px solid var(--edge);padding:0 10px;height:34px;max-width:270px;flex:1;min-width:100px;color:var(--muted);border-radius:4px}.search input{width:100%;min-width:0;border:0;background:transparent;color:#e5eed8;font-size:11px}.search input::placeholder{color:#95a289}.search button{display:grid;place-items:center;border:0;padding:0;background:none;color:var(--muted)}.urban-pulse select{border:1px solid var(--edge);background:#222c21;color:#bcc7aa;border-radius:4px;height:34px;padding:0 8px;max-width:160px;font-size:11px}.layers{display:flex;margin-left:auto;border:1px solid var(--edge);border-radius:4px;padding:3px;background:#141c13}.layers button{background:none;color:var(--muted);border:0;padding:4px 13px;font-size:11px;border-radius:2px}.layers button.selected{color:#edf7dc;background:#3a4b30}.map{position:relative;background-color:#142015;background-image:linear-gradient(#bdd5aa08 1px,transparent 1px),linear-gradient(90deg,#bdd5aa08 1px,transparent 1px);background-size:45px 45px;aspect-ratio:1000/580;overflow:hidden;touch-action:none;border:1px solid #34472f}.map>svg{width:100%;height:100%;display:block}.land{fill:#2b402a;stroke:#788d61;stroke-width:.6;vector-effect:non-scaling-stroke}.land.focused{fill:#405732;stroke:#c8d2a4;stroke-width:1}.density{pointer-events:none}.node{cursor:pointer}.node text{fill:#c8d1b4;font:11px 'Microsoft YaHei',sans-serif;paint-order:stroke;stroke:#192515;stroke-width:3px;pointer-events:none}.node.chosen text{fill:#fff4cc;font-weight:bold;font-size:14px}.hit{fill:transparent}.core{fill:#e5ebba;pointer-events:none}.selection-ring{fill:none;stroke:#fff0b0;stroke-width:1.5;pointer-events:none}.bubble{fill:var(--accent);fill-opacity:.25;stroke:var(--accent);stroke-width:1;pointer-events:none}.map-caption{position:absolute;top:20px;left:18px;pointer-events:none}.map-caption span{display:block;color:#c3ccae;font-size:12px}.map-caption small{display:block;color:#81916c;font:8px monospace;margin-top:7px}.map-tools{position:absolute;right:12px;top:16px;display:flex;flex-direction:column;gap:5px}.map-tools button{background:#202c1a}.map-bottom{position:absolute;bottom:12px;left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;font:10px monospace;color:#a8b497}.map-bottom label{display:flex;gap:6px;align-items:center;font-size:10px}.map-bottom input{accent-color:var(--accent);margin:0}.legend{display:flex;gap:8px;align-items:center}.legend i{width:90px;height:5px;background:linear-gradient(90deg,#30452b,var(--accent),#fff7b1)}.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#142015dd;color:#dbe4c8;z-index:5}.empty button{color:var(--accent);background:#2a3d22;border:1px solid #627551;padding:7px 14px;border-radius:4px}.map-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:18px 0;gap:18px}.map-stats>div{border-right:1px solid var(--edge)}.map-stats>div:last-child{border:0}.map-stats small{display:block;color:var(--muted);font-size:10px;margin-bottom:7px}.map-stats strong{font:500 20px monospace}.map-stats strong span{font:10px 'Microsoft YaHei',sans-serif;color:var(--muted)}.profile{border-left:1px solid var(--edge);padding:22px;background:#20291f}.profile-header{display:flex;justify-content:space-between;align-items:center;color:var(--accent)}.city-title{display:flex;align-items:center;justify-content:space-between;margin-top:23px;gap:8px}.city-title h2{font-size:34px;margin:0;overflow-wrap:anywhere}.city-title>span{font-size:10px;color:var(--muted);white-space:nowrap}.city-title b{color:var(--accent);font:24px monospace;display:inline-block;margin-left:6px}.coordinates{color:#a4af94;font-size:10px;line-height:1.8;margin:9px 0 23px}.coordinates>span{display:block;font:9px monospace;color:#8c9b7b;margin-top:4px}.city-value{display:flex;gap:8px;align-items:baseline}.city-value strong{font:500 36px/1.3 monospace;color:var(--accent)}.city-value>span{color:var(--muted);font-size:11px}.value-caption{display:flex;justify-content:space-between;color:#acb69a;font-size:11px;margin:5px 0 24px}.value-caption>span:last-child{font-size:9px;color:#8d9a7b}.compare-heading{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--edge);padding-top:17px}.urban-pulse h3{font-size:12px;font-weight:500;margin:0}.compare-heading select{height:28px;max-width:120px}.compare-bars{display:grid;gap:14px;margin-top:16px}.compare-bars>div>div{display:flex;justify-content:space-between;font-size:10px;color:#c6ceb3;margin-bottom:6px}.compare-bars b{font:10px monospace}.compare-bars i,.rank-grid i{display:block;height:4px;background:#3a462c}.compare-bars em,.rank-grid em{height:100%;background:var(--accent);display:block;transition:width .35s}.compare-bars>div:nth-child(2) em{background:#c3acda}.profile-metrics{border-top:1px solid var(--edge);margin-top:23px;padding-top:9px}.profile-metrics>div{display:flex;justify-content:space-between;gap:10px;padding:9px 0;font-size:10px}.profile-metrics>div>span{color:#b4bda0;display:flex;align-items:center;gap:7px}.profile-metrics i{width:4px;height:4px}.profile-metrics b{font:11px monospace}.profile-metrics small{font:9px 'Microsoft YaHei',sans-serif;color:#9eaa88;margin-left:6px}.insight{display:flex;align-items:flex-start;gap:8px;border-top:1px solid var(--edge);margin-top:12px;padding-top:14px;color:#a8b294}.insight svg{flex-shrink:0;color:var(--accent);margin-top:3px}.insight p{font-size:10px;line-height:1.9;margin:0}.insight b{color:#e7ecd5;font-weight:500}.bottom{display:grid;grid-template-columns:minmax(0,1fr) 320px;border-bottom:1px solid var(--edge)}.urban-pulse .ranking{padding:22px 22px 22px 0}.bottom h2{font-size:15px}.bottom .section-header>span{font-size:9px;color:var(--muted)}.rank-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 24px;margin-top:20px}.rank-grid button{display:flex;align-items:center;gap:10px;color:#c0c9af;background:none;border:0;padding:5px 0;text-align:left;min-width:0}.rank-grid button.selected,.rank-grid button:hover{color:var(--accent)}.rank-index{font:10px monospace;color:#91a17d}.rank-grid button>div{flex:1;min-width:0}.rank-grid button>div>span{display:flex;justify-content:space-between;gap:5px;font-size:11px;margin-bottom:9px}.rank-grid b{font:10px monospace}.rank-grid svg{color:#8a9b76;flex-shrink:0}.rank-grid i{height:3px}.urban-pulse .distribution{padding:22px;border-left:1px solid var(--edge)}.histogram{display:flex;gap:12px;align-items:end;margin-top:16px;height:98px}.histogram>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:end;height:100%;gap:5px}.histogram span{font:10px monospace;color:#c4ccb3}.histogram i{width:100%;max-width:34px;background:var(--accent);transition:height .3s}.histogram small{white-space:nowrap;font:8px monospace;color:#99aa85}.distribution p{font-size:9px;color:#97a780;margin:12px 0 0}.pulse-footer{display:flex;justify-content:space-between;gap:12px;padding:19px 0 22px;border:0;font-size:9px;color:#9cab88}.pulse-footer i{background:#d8b477;margin-right:6px}.pulse-footer>span:last-child{font:9px monospace}.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#d6e3bd;color:#24321c;border:1px solid #efffd9;border-radius:4px;padding:12px 22px;z-index:30;max-width:90%}.urban-pulse:fullscreen{overflow-y:auto}
@media(min-width:1500px){.analysis,.bottom{grid-template-columns:minmax(0,1fr) 350px}.map{aspect-ratio:1000/510}.profile{padding:26px}.city-title{margin-top:32px}.profile-metrics{margin-top:30px}}
@media(max-width:1050px){.pulse-header{padding:0 20px}.workspace{padding:20px 20px 0}.demo-badge span{display:none}.analysis,.bottom{grid-template-columns:minmax(0,1fr) 280px}.metric-tabs>button{padding:15px}.filters{flex-wrap:wrap}.search{max-width:none}.layers{margin-left:auto}.map{aspect-ratio:1.3}.map-stats{gap:10px}.map-stats strong{font-size:16px}.rank-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}.city-value strong{font-size:31px}}
@media(max-width:760px){.pulse-header{height:82px;padding:16px;gap:9px}.brand{gap:8px;flex:1}.brand h1{font-size:18px}.brand span{font-size:7px}.brand>svg,.demo-badge,.fullscreen-button{display:none}.workspace{padding:18px 16px 0}.overview>span:last-child{font-size:8px}.metric-tabs{grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:18px}.metric-tabs>button{border-bottom:1px solid var(--edge);padding:14px}.metric-tabs>button:nth-child(2n){border-right:0}.metric-name{font-size:17px}.metric-top small{font-size:8px}.analysis,.bottom{grid-template-columns:1fr}.urban-pulse .geo{padding:18px 0 0}.filters{gap:8px}.filters select{max-width:130px}.map{aspect-ratio:1.12}.map-caption{left:12px;top:14px}.map-caption span{font-size:10px}.map-caption small{font-size:7px}.map-bottom{left:10px;right:10px;font-size:8px}.map-bottom label{font-size:9px}.legend i{width:60px}.map-tools{right:8px;top:10px}.map-tools .icon-button{width:28px;height:28px}.map-stats{gap:8px}.map-stats strong{font-size:17px;display:block}.map-stats strong span{display:block;margin-top:3px;font-size:9px}.map-stats small{font-size:9px}.profile{border-left:0;border-top:1px solid var(--edge);padding:20px}.city-title{margin-top:17px}.city-title h2{font-size:28px}.coordinates>span{display:inline-block;margin-left:10px}.city-value strong{font-size:34px}.profile-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 18px}.profile-metrics>div{display:block}.profile-metrics b{display:block;margin-top:7px}.urban-pulse .ranking{padding-right:0}.urban-pulse .distribution{border-left:0;border-top:1px solid var(--edge);padding:22px 0}.pulse-footer{flex-direction:column;line-height:1.7}.pulse-footer>span:last-child{font-size:8px}}
.urban-pulse .map{width:100%;height:auto;margin-top:0}
.urban-pulse .land:focus,.urban-pulse .node:focus{outline:none}
.urban-pulse .node:focus-visible .core{stroke:#fff5bd;stroke-width:3}
@media(prefers-reduced-motion:reduce){.urban-pulse *{transition:none!important}}
.land[role=button]{cursor:pointer}.land[role=button]:hover{fill:#3e5434;stroke:#d5ddb8}.land:focus-visible{outline:none;stroke:#fff4ba;stroke-width:2}.city-boundaries{pointer-events:none}.city-boundaries path{fill:none;stroke:#a6bea0;stroke-opacity:.65;stroke-width:.8;vector-effect:non-scaling-stroke}.node.geographic .core{fill:#182c20;stroke:#d0ddd0;stroke-width:1.1}.node text{font-size:11px}.node.chosen text{font-size:12px}.map-context{display:flex;align-items:center;gap:10px;margin-bottom:10px;color:#92a68d}.map-context button{border:0;background:none;padding:3px 0;color:#d2e2c6;font-size:11px}.map-context small{margin-left:auto;font-size:10px}.search-results{display:flex;flex-wrap:wrap;gap:5px 14px;padding:8px 0 14px}.search-results button{display:flex;gap:5px;align-items:center;border:0;background:none;color:var(--accent);font-size:12px}.search-results small{color:var(--muted);font-size:10px}.boundary-status{position:absolute;bottom:40px;left:14px;font-size:11px;background:#1d2c20;padding:6px 9px;border-radius:3px;color:#dce9d1}.boundary-status button{border:0;background:none;color:#e6c99a;font-size:11px}.geo-key{margin-left:10px;color:#aabda5}.province-title{margin-top:24px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.province-title h2{font-size:26px;line-height:1.4;overflow-wrap:anywhere}.province-title>span{color:var(--accent);font-size:11px}.province-summary{font-size:13px;line-height:1.9;color:#c2cdb5;margin:18px 0 15px}.province-traits{display:flex;flex-wrap:wrap;gap:8px 14px;font-size:11px;color:var(--accent)}.province-traits span{border-bottom:1px solid #506747;padding-bottom:5px}.province-facts{margin:22px 0;border-top:1px solid var(--edge);padding-top:12px}.province-facts>div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;font-size:11px}.province-facts dt{color:var(--muted)}.province-facts dd{margin:0;text-align:right}.province-list-heading{display:flex;justify-content:space-between;align-items:center;margin:20px 0 10px}.province-list-heading>span{font-size:10px;color:var(--muted)}.province-cities{max-height:240px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#5b7651 #1c271d}.province-cities button{display:flex;align-items:center;gap:9px;width:100%;padding:11px 3px;border:0;border-bottom:1px solid #34462d;background:none;color:#dce7d1;text-align:left;font-size:12px}.province-cities button:hover{color:var(--accent);background:#2b3826}.province-cities small{font-size:10px;color:var(--muted);margin-left:auto}.province-cities svg{margin-left:auto;flex-shrink:0}.province-cities small+svg{margin-left:0}.province-source,.no-geo{font-size:10px;color:#a1b18f;line-height:1.8;margin:18px 0 0}.profile-back{display:flex;align-items:center;gap:6px;border:0;background:none;color:var(--accent);font-size:11px!important;padding:0 0 20px}.no-sample{padding:25px 0;border-top:1px solid var(--edge);margin-top:24px;color:#b8c9ad}.no-sample>svg{color:var(--accent);margin-bottom:14px}.no-sample p{font-size:12px;line-height:1.9}.no-sample>div{display:flex;justify-content:space-between;margin-top:18px;gap:10px}.no-sample strong{font-size:12px;font-weight:400}.no-sample small{font-size:11px;color:var(--muted)}.map{cursor:grab}.map:active{cursor:grabbing}
@media(max-width:760px){.filters .search{flex-basis:100%;max-width:none}.section-header>span{font-size:9px;max-width:110px;text-align:right;line-height:1.6}.geo-key{display:none}.province-title h2{font-size:24px}.province-cities{max-height:280px}.province-summary{font-size:13px}.map-context small{font-size:9px}}
</style>
