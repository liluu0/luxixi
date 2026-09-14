<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { ArrowLeft, ArrowRight, Activity, Box, Brain, Check, ChevronRight, Crosshair, Download, Eye, Focus, Heart, Info, Layers3, LoaderCircle, Maximize, Minus, Pause, Play, Plus, RotateCcw, ScanLine, Search, Settings2, Sparkles, UserRound, X } from 'lucide-vue-next'
import { buildIndex, DATA_ROOT, LANDMARKS, PRESETS, searchIndex, SYSTEMS } from './anatomy/anatomyData'

const props = defineProps({ onBack: Function })
const host = ref(null), atlas = shallowRef(null), catalog = shallowRef(null)
const loading = ref(true), progress = ref(0), error = ref(''), hover = shallowRef(null)
const visible = ref([...PRESETS[0].systems]), preset = ref('body'), tab = ref('layers')
const selection = shallowRef(null), isolated = ref(false), explode = ref(0)
const mode = ref('solid'), clip = ref(false), clipPosition = ref(0), scan = ref(true), rotate = ref(false)
const query = ref(''), searchOpen = ref(false), infoOpen = ref(false), view = ref('quarter'), tour = ref(-1)
const toast = ref('')
let scene, request, generation = 0, disposed = false, toastTimer
const selectedIds = computed(() => selection.value?.elements || [])
const counts = computed(() => {
  const result = {}
  for (const part of atlas.value?.parts || []) result[part.system] = (result[part.system] || 0) + 1
  return result
})
const visibleCount = computed(() => {
  const ids = new Set(selectedIds.value)
  return atlas.value?.parts.filter(part => isolated.value ? ids.has(part.id) : visible.value.includes(part.system) || ids.has(part.id)).length || 0
})
const results = computed(() => catalog.value ? searchIndex(catalog.value, query.value) : [])
const selectionSystems = computed(() => {
  const systems = new Set(selectedIds.value.map(id => catalog.value?.parts.get(id)?.system))
  return SYSTEMS.filter(system => systems.has(system.id))
})
const selectionNote = computed(() => selection.value?.note || (selection.value ? '此结构的名称、所属系统与三维几何来自 BodyParts3D / FMA 解剖图谱。' : ''))
const common = computed(() => LANDMARKS.slice(0, 6).map(item => catalog.value?.byId.get(item.id)).filter(Boolean))
const stageName = computed(() => isolated.value && selection.value ? selection.value.label : PRESETS.find(item => item.id === preset.value)?.name || '自定义组合')
const guide = ['FMA46565', 'FMA50801', 'FMA7088', 'FMA7309', 'FMA7197', 'FMA13478']
const state = () => ({ visible: [...visible.value], selected: [...selectedIds.value], isolated: isolated.value, explode: explode.value / 100, mode: mode.value, clip: clip.value, clipPosition: clipPosition.value, scan: scan.value, rotate: rotate.value })
watch([visible, selection, isolated, explode, mode, clip, clipPosition, scan, rotate], () => scene?.update(state()), { flush: 'post' })

function setPreset(item) {
  visible.value = [...item.systems]
  preset.value = item.id
  selection.value = null
  isolated.value = false
  tour.value = -1
  nextTick(() => { scene?.update(state()); scene?.fit(view.value) })
}
function toggleSystem(id) {
  visible.value = visible.value.includes(id) ? visible.value.filter(value => value !== id) : [...visible.value, id]
  preset.value = ''
  isolated.value = false
  selection.value = null
  tour.value = -1
}
function choose(item, focus = true) {
  if (!item || loading.value) return
  selection.value = item
  isolated.value = focus
  rotate.value = false
  searchOpen.value = false
  query.value = ''
  tab.value = 'inspect'
  nextTick(() => {
    scene?.update(state())
    if (focus) scene?.fit('quarter', true)
  })
}
function onPick(part) {
  const concept = catalog.value?.byId.get(part.conceptId)
  choose({ id: part.conceptId, label: concept?.label || part.name, name: part.name, elements: [part.id], note: concept?.note || '' }, false)
}
function clearSelection() {
  selection.value = null
  isolated.value = false
  tour.value = -1
}
function setView(value) {
  view.value = value
  rotate.value = false
  scene?.fit(value, isolated.value)
}
function reset() {
  mode.value = 'solid'; clip.value = false; clipPosition.value = 0
  explode.value = 0; rotate.value = false; view.value = 'quarter'; scan.value = true
  setPreset(PRESETS[0])
}
function returnToBody() {
  reset()
  tab.value = 'layers'
  searchOpen.value = false
  query.value = ''
}
function nextTour() {
  tour.value = (tour.value + 1) % guide.length
  const item = catalog.value?.byId.get(guide[tour.value])
  choose(item)
}
function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2500)
}
function capture() { scene?.capture(); notify('当前模型视图已导出') }
async function initialize() {
  const run = ++generation
  request?.abort()
  scene?.dispose()
  scene = null
  request = new AbortController()
  loading.value = true; error.value = ''; progress.value = 0
  try {
    const [response, module] = await Promise.all([
      fetch(DATA_ROOT + 'atlas.json', { signal: request.signal }),
      import('./anatomy/createAnatomyScene'),
    ])
    if (!response.ok) throw new Error('图谱索引加载失败，请重试。')
    const data = await response.json()
    if (disposed || run !== generation) return
    atlas.value = data
    catalog.value = buildIndex(data)
    scene = module.createAnatomyScene(host.value, data, {
      onProgress: value => { if (run === generation) progress.value = value },
      onReady: () => { if (run === generation) { loading.value = false; progress.value = 100 } },
      onError: message => { if (run === generation) { error.value = message; loading.value = false } },
      onSelect: onPick,
      onHover: value => { hover.value = value },
    })
    scene.update(state())
  } catch (cause) {
    if (!disposed && run === generation) { error.value = cause.message || '三维模型无法载入。'; loading.value = false }
  }
}
onMounted(initialize)
onUnmounted(() => { disposed = true; generation++; request?.abort(); scene?.dispose(); clearTimeout(toastTimer) })
</script>

<template>
  <div class="anatomy-lab" @keydown.esc="searchOpen = false; infoOpen = false">
    <header class="lab-nav">
      <button class="nav-back" type="button" @click="props.onBack"><ArrowLeft :size="16" /><span>作品集</span></button>
      <div class="lab-brand"><Activity :size="19" /><b>ANATOMY<span> / </span>EXPLORER</b><small>003</small></div>
      <div class="nav-status"><i :class="{ busy: loading, failed: error }" />{{ error ? '载入异常' : loading ? '图谱载入中' : '图谱已就绪' }}</div>
      <button class="icon-button" title="数据来源与许可" aria-label="数据来源与许可" @click="infoOpen = true"><Info :size="17" /></button>
    </header>
    <main class="anatomy-workspace">
      <header class="workspace-title">
        <div><div class="eyebrow-text"><span>BODY / 003</span><i /> DIGITAL ANATOMY ATLAS</div><h1>人体结构<span>分解可视化</span></h1></div>
        <div class="title-index"><span>REFERENCE MODEL</span><b>BodyParts3D <em>4.0</em></b></div>
      </header>

      <div class="model-stage" :aria-busy="loading">
        <div ref="host" class="scene-host" />
        <div class="stage-top">
          <div><i class="signal-square" />{{ stageName }}<small>{{ mode === 'solid' ? 'SOLID' : mode === 'xray' ? 'X-RAY' : 'WIREFRAME' }}</small></div>
          <span>{{ loading ? progress + '%' : visibleCount.toLocaleString() + ' / ' + (atlas?.parts.length || 0).toLocaleString() }} <b>STRUCTURES</b></span>
        </div>
        <div v-if="hover && !loading" class="part-tooltip" :style="{ left: hover.x + 'px', top: hover.y + 'px' }">{{ hover.name }}</div>

        <div v-if="loading || error" class="load-state" role="status">
          <template v-if="error"><Box :size="30" /><h2>模型未能载入</h2><p>{{ error }}</p><button class="primary-button" @click="initialize"><RotateCcw :size="14" />重新载入</button></template>
          <template v-else><LoaderCircle class="spin" :size="29" /><h2>正在构建解剖图谱</h2><div class="load-progress"><span :style="{ width: progress + '%' }" /></div><small>{{ progress }}% · BodyParts3D 4.0</small></template>
        </div>

        <div v-if="!loading && !error && !visibleCount" class="empty-state"><Layers3 :size="26" /><p>暂无可见结构</p><button @click="setPreset(PRESETS[0])">恢复全身视图</button></div>
        <div v-if="!loading && !error" class="landmark-rail">
          <button title="恢复全身" aria-label="恢复全身" :aria-pressed="preset === 'body' && !selection && !explode && !clip" @click="returnToBody"><UserRound :size="17" /><span>全身</span></button>
          <button title="定位心脏" aria-label="定位心脏" @click="choose(catalog.byId.get('FMA7088'))"><Heart :size="17" /><span>心脏</span></button>
          <button title="定位大脑" aria-label="定位大脑" @click="choose(catalog.byId.get('FMA50801'))"><Brain :size="17" /><span>大脑</span></button>
          <button title="结构导览" aria-label="结构导览" @click="nextTour"><Sparkles :size="17" /><span>导览</span></button>
        </div>
        <div class="stage-toolbar">
          <div class="view-switch" aria-label="视角">
            <button v-for="item in [{ id: 'quarter', label: '立体' }, { id: 'front', label: '正面' }, { id: 'side', label: '侧面' }, { id: 'back', label: '背面' }]" :key="item.id" :class="{ active: view === item.id }" :aria-pressed="view === item.id" :disabled="loading || !!error" @click="setView(item.id)">{{ item.label }}</button>
          </div>
          <div class="toolbar-icons">
            <button class="icon-button" :disabled="loading" title="缩小" aria-label="缩小" @click="scene?.zoom(1.16)"><Minus :size="17" /></button>
            <button class="icon-button" :disabled="loading" title="放大" aria-label="放大" @click="scene?.zoom(.86)"><Plus :size="17" /></button>
            <span class="divider" />
            <button class="icon-button" :disabled="loading" :class="{ active: rotate }" :title="rotate ? '暂停旋转' : '自动旋转'" :aria-label="rotate ? '暂停旋转' : '自动旋转'" :aria-pressed="rotate" @click="rotate = !rotate"><Pause v-if="rotate" :size="16" /><Play v-else :size="16" /></button>
            <button class="icon-button" :disabled="loading" title="重置视图" aria-label="重置视图" @click="reset"><RotateCcw :size="16" /></button>
            <button class="icon-button" :disabled="loading || !!error" title="导出模型截图" aria-label="导出模型截图" @click="capture"><Download :size="16" /></button>
          </div>
        </div>
        <div class="stage-foot"><span>BP3D / ADULT MALE</span><span>教育参考模型</span></div>
        <div v-if="toast" class="toast" role="status"><Check :size="14" />{{ toast }}</div>
      </div>

      <aside class="control-deck">
        <div class="deck-heading"><span><Settings2 :size="16" />结构控制台</span><small>ATLAS / 4.0</small></div>
        <div class="search-area">
          <form class="search-field" @submit.prevent="choose(results[0])">
            <Search :size="16" /><input v-model="query" aria-label="搜索解剖结构" placeholder="搜索结构 / FMA" autocomplete="off" @focus="searchOpen = true" @input="searchOpen = true" />
            <button v-if="query" class="icon-button" type="button" title="清除搜索" aria-label="清除搜索" @click="query = ''"><X :size="14" /></button>
          </form>
          <div v-if="searchOpen && catalog" class="search-results">
            <div class="results-heading"><span>{{ query ? '匹配结构' : '常用结构' }}</span><button title="关闭搜索结果" aria-label="关闭搜索结果" @click="searchOpen = false"><X :size="13" /></button></div>
            <button v-for="item in results" :key="item.id" class="result-row" :disabled="loading" @click="choose(item)"><span>{{ item.label }}<small>{{ item.name }}</small></span><ChevronRight :size="14" /></button>
            <p v-if="!results.length">未找到匹配结构</p>
          </div>
        </div>
        <div class="deck-tabs" role="tablist" aria-label="控制台视图">
          <button v-for="item in [{ id: 'layers', label: '图层', icon: Layers3 }, { id: 'inspect', label: '结构', icon: Crosshair }, { id: 'render', label: '渲染', icon: ScanLine }]" :key="item.id" :id="'tab-' + item.id" role="tab" :aria-selected="tab === item.id" :aria-controls="'panel-' + item.id" :class="{ active: tab === item.id }" @click="tab = item.id; searchOpen = false"><component :is="item.icon" :size="14" />{{ item.label }}</button>
        </div>
        <div class="deck-content">
          <div v-if="tab === 'layers'" id="panel-layers" role="tabpanel" aria-labelledby="tab-layers">
            <div class="section-caption"><span>系统组合</span><b>{{ visible.length.toString().padStart(2, '0') }} / 15</b></div>
            <div class="presets">
              <button v-for="item in PRESETS" :key="item.id" :class="{ active: preset === item.id && !isolated }" :disabled="loading" @click="setPreset(item)">{{ item.name }}</button>
            </div>
            <div class="system-list">
              <button v-for="system in SYSTEMS" :key="system.id" class="system-row" :aria-pressed="visible.includes(system.id)" :class="{ selected: visible.includes(system.id) }" :disabled="loading" @click="toggleSystem(system.id)">
                <i :style="{ backgroundColor: system.color }" /><span>{{ system.name }}</span><small>{{ counts[system.id] || 0 }}</small><Eye v-if="visible.includes(system.id)" :size="13" /><span v-else class="hidden-dot" />
              </button>
            </div>
          </div>

          <div v-if="tab === 'inspect'" id="panel-inspect" role="tabpanel" aria-labelledby="tab-inspect">
            <template v-if="selection">
              <div class="section-caption"><span>当前结构</span><button class="plain-icon" title="清除选择" aria-label="清除选择" @click="clearSelection"><X :size="14" /></button></div>
              <div class="structure-identity"><span>{{ selection.id }}</span><h2>{{ selection.label }}</h2><small>{{ selection.name }}</small></div>
              <div class="system-tags"><span v-for="system in selectionSystems" :key="system.id"><i :style="{ background: system.color }" />{{ system.name }}</span></div>
              <p class="structure-note">{{ selectionNote }}</p>
              <dl class="structure-stats"><div><dt>独立网格</dt><dd>{{ selectedIds.length }}</dd></div><div><dt>数据版本</dt><dd>BP3D 4.0</dd></div></dl>
              <div class="inspection-actions"><button class="primary-button" :aria-pressed="isolated" @click="isolated = !isolated"><Focus :size="15" />{{ isolated ? '恢复周围结构' : '隔离此结构' }}</button><button class="secondary-button" title="聚焦结构" aria-label="聚焦结构" @click="scene?.fit('quarter', true)"><Maximize :size="16" /></button></div>
            </template>
            <template v-else><div class="section-caption">结构索引</div><div class="inspect-empty"><Crosshair :size="25" /><h2>探索身体的细节</h2><small>{{ atlas?.concepts.length.toLocaleString() || '3,432' }} 个解剖概念</small></div><button v-for="item in common" :key="item.id" class="result-row" :disabled="loading" @click="choose(item)"><span>{{ item.label }}<small>{{ item.id }}</small></span><ArrowRight :size="14" /></button></template>
            <button class="guide-button" :disabled="loading" @click="nextTour"><Sparkles :size="15" /><span>{{ tour < 0 ? '开始结构导览' : '下一处结构' }}</span><small>{{ tour < 0 ? '06' : tour + 1 + ' / 6' }}</small><ArrowRight :size="14" /></button>
          </div>

          <div v-if="tab === 'render'" id="panel-render" role="tabpanel" aria-labelledby="tab-render">
            <div class="section-caption">显示材质</div>
            <div class="render-options"><button v-for="item in [{ id: 'solid', label: '实体', desc: 'SOLID' }, { id: 'xray', label: '透视', desc: 'X-RAY' }, { id: 'wireframe', label: '线框', desc: 'MESH' }]" :key="item.id" :class="{ active: mode === item.id }" :aria-pressed="mode === item.id" @click="mode = item.id"><Box :size="20" /><b>{{ item.label }}</b><small>{{ item.desc }}</small></button></div>
            <label class="toggle-row"><span><ScanLine :size="16" />扫描平面</span><input v-model="scan" type="checkbox" /></label>
            <label class="toggle-row"><span><Layers3 :size="16" />矢状剖切</span><input v-model="clip" type="checkbox" /></label>
            <div v-if="clip" class="slice-control"><label for="clip-position">剖切位置 <b>{{ Math.round(clipPosition * 100) }}%</b></label><input id="clip-position" v-model.number="clipPosition" type="range" min="-1" max="1" step=".01" /></div>
            <label class="toggle-row"><span><RotateCcw :size="16" />自动旋转</span><input v-model="rotate" type="checkbox" /></label>
            <div class="render-data"><div class="section-caption">图谱信息</div><p><span>数据集</span><b>BodyParts3D 4.0</b></p><p><span>结构网格</span><b>{{ atlas?.parts.length.toLocaleString() || '2,234' }}</b></p><p><span>三角面</span><b>{{ atlas?.triangles.toLocaleString() || '2,288,268' }}</b></p><p><span>渲染引擎</span><b>Three.js / WebGL 2</b></p></div>
          </div>
        </div>

        <div class="decomposition">
          <label for="explode"><span><Layers3 :size="15" />结构分解</span><b>{{ explode }}<small>%</small></b></label>
          <input id="explode" v-model.number="explode" :disabled="loading || !!error" type="range" min="0" max="100" step="1" />
          <div><span>组合</span><button :disabled="loading" @click="explode = explode ? 0 : 75">{{ explode ? '复原结构' : '展开结构' }}<ArrowRight :size="13" /></button><span>分解</span></div>
        </div>
        <div class="deck-footer"><i /><span>BODY PARTS / OPEN DATA</span><button title="查看数据来源" aria-label="查看数据来源" @click="infoOpen = true"><Info :size="14" /></button></div>
      </aside>
    </main>

    <div v-if="infoOpen" class="source-backdrop" @click.self="infoOpen = false">
      <div class="source-dialog" role="dialog" aria-modal="true" aria-labelledby="source-title">
        <button class="icon-button source-close" title="关闭" aria-label="关闭数据来源" @click="infoOpen = false"><X :size="18" /></button><div class="eyebrow-text">DATA / PROVENANCE</div><h2 id="source-title">让结构有据可查</h2>
        <p>人体几何来自 BodyParts3D 4.0 成人男性参考图谱，包含 {{ atlas?.parts.length || '2,234' }} 个独立网格。中文快捷词用于定位常见器官，其余结构保留原始英文名称。</p>
        <p>BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.</p>
        <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer">BodyParts3D 官方数据<ArrowRight :size="14" /></a>
        <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">Human Atlas · 浏览器几何打包<ArrowRight :size="14" /></a>
        <a href="/assets/anatomy/ATTRIBUTION.md" target="_blank" rel="noreferrer">署名与数据处理说明<ArrowRight :size="14" /></a>
        <small>参考图谱不代表个体差异，不用于临床诊断。搜索与导览由本地图谱索引驱动。</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anatomy-lab{--surface:#0b1115;--panel:#10191d;--line:#29353a;--muted:#839295;--text:#e8f1ed;--mint:#82e8cf;--yellow:#e1eb9b;--rose:#dc8883;background:var(--surface);color:var(--text);height:100dvh;overflow:hidden;font:12px/1.5 "Microsoft YaHei","PingFang SC",sans-serif;letter-spacing:0;color-scheme:dark}
.anatomy-lab *{box-sizing:border-box;letter-spacing:0}
.anatomy-lab button,.anatomy-lab input{font:inherit}
.anatomy-lab button{cursor:pointer;color:inherit;transition:background .18s,color .18s;border-radius:3px}
.anatomy-lab button:disabled{cursor:wait;opacity:.4}
.anatomy-lab button:focus-visible,.anatomy-lab input:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
.anatomy-lab input[type=range]{width:100%;height:15px;margin:10px 0;accent-color:var(--mint);cursor:pointer}
.lab-nav{height:54px;padding:0 26px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:18px}
.nav-back{display:flex;align-items:center;gap:8px;background:none;border:0;font-size:11px!important;color:#abbab8!important}
.lab-brand{display:flex;align-items:center;gap:11px;color:var(--mint);margin-left:15px;font-family:Consolas,monospace}
.lab-brand b{font-size:11px;color:#d9e7e2}.lab-brand b span{color:#556d6e}.lab-brand small{font-size:9px;color:#8d9f9d;border-left:1px solid #385051;padding-left:12px}
.nav-status{margin-left:auto;display:flex;align-items:center;gap:8px;color:#9dafab;font-size:10px}.nav-status i,.deck-footer>i{width:5px;height:5px;background:var(--mint);border-radius:50%}.nav-status i.busy{background:var(--yellow)}.nav-status i.failed{background:var(--rose)}
.icon-button{width:32px;height:32px;display:inline-grid;place-items:center;background:none;border:0;color:#9aafad!important;flex-shrink:0}.icon-button:hover,.icon-button.active{color:var(--mint)!important;background:#1c302f}
.anatomy-workspace{height:calc(100dvh - 54px);padding:0 22px 14px;max-width:1920px;margin:auto;display:grid;grid-template-columns:minmax(0,1fr) 334px;grid-template-rows:106px minmax(0,1fr);grid-template-areas:"title deck" "model deck";gap:0 26px}
.workspace-title{grid-area:title;display:flex;justify-content:space-between;align-items:center;gap:15px;min-width:0}
.eyebrow-text{display:flex;align-items:center;gap:10px;font:9px/1.4 Consolas,monospace;color:#758f90}.eyebrow-text span{color:var(--mint)}.eyebrow-text i{width:17px;height:1px;background:#527977}
.workspace-title h1{font-size:32px;line-height:1.3;font-weight:600;letter-spacing:0;margin:9px 0 0;color:#edf4ef}.workspace-title h1 span{margin-left:12px;color:var(--mint);font-weight:400}.title-index{text-align:right;font:9px/1.8 Consolas,monospace;color:#6d8888;flex-shrink:0}.title-index b{display:block;color:#c1cfca;font-size:11px;font-weight:400}.title-index em{font-style:normal;color:var(--mint)}
.model-stage{grid-area:model;min-height:0;min-width:0;position:relative;overflow:hidden;border-top:1px solid var(--line)}
.scene-host{position:absolute;inset:0}.scene-host :deep(canvas){display:block;width:100%;height:100%;touch-action:none}
.stage-top{position:absolute;top:18px;left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;pointer-events:none;gap:10px;color:#b1c1bc;font-size:11px}
.stage-top>div{display:flex;align-items:center;gap:8px}.signal-square{width:5px;height:5px;background:var(--mint);display:inline-block}.stage-top small{font:9px Consolas,monospace;color:#6c9290;border-left:1px solid #3b5152;padding-left:9px;margin-left:5px}.stage-top>span{font:10px Consolas,monospace;color:var(--mint)}.stage-top b{font-weight:400;font-size:8px;color:#6e8b88}
.landmark-rail{position:absolute;top:80px;left:12px;display:flex;flex-direction:column;gap:12px}.landmark-rail button{border:0;background:none;display:flex;align-items:center;gap:9px;color:#7b9593;padding:9px 6px}.landmark-rail button:hover{color:var(--mint)}.landmark-rail span{font-size:10px}
.stage-toolbar{position:absolute;left:50%;bottom:41px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:#111b20e8;border:1px solid #344449;padding:5px 8px;backdrop-filter:blur(10px);white-space:nowrap;border-radius:5px}
.view-switch{display:flex;gap:2px}.view-switch button{border:0;padding:7px 11px;background:none;color:#839e9a;font-size:10px}.view-switch button.active{color:#c5f7e9;background:#243b3b}.toolbar-icons{display:flex;align-items:center;gap:2px}.divider{width:1px;height:17px;background:#304347;margin:0 5px}
.stage-foot{position:absolute;bottom:9px;left:15px;right:15px;display:flex;justify-content:space-between;font:8px Consolas,monospace;color:#667e7c;pointer-events:none}.stage-foot span:last-child{font-family:"Microsoft YaHei",sans-serif}
.part-tooltip{position:absolute;max-width:200px;padding:6px 9px;background:#1d3438;color:#cbf1e7;border:1px solid #486562;border-radius:3px;pointer-events:none;font-size:10px;overflow-wrap:anywhere;z-index:2}
.load-state,.empty-state{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:17px;background:#0b1115d9;padding:25px;text-align:center;z-index:5;color:var(--mint)}.load-state h2,.empty-state h2{font:500 17px/1.5 "Microsoft YaHei",sans-serif;margin:0;letter-spacing:0}.load-state small,.load-state p{font-size:11px;color:#90aaa4;max-width:320px;margin:0}.load-progress{width:170px;background:#29403f;height:2px}.load-progress span{display:block;background:var(--mint);height:100%;transition:width .3s}.spin{animation:anatomy-spin 1.8s linear infinite}.empty-state{background:none;pointer-events:none}.empty-state button{pointer-events:auto;background:#1a3331;border:1px solid var(--mint);padding:9px 14px}
.control-deck{grid-area:deck;border-left:1px solid var(--line);padding-left:23px;display:flex;flex-direction:column;min-height:0;min-width:0}
.deck-heading{height:60px;min-height:60px;display:flex;align-items:center;justify-content:space-between}.deck-heading>span{display:flex;align-items:center;gap:10px;font-size:12px}.deck-heading svg{color:var(--mint)}.deck-heading small{font:8px Consolas,monospace;color:#7b9892}
.search-area{position:relative;z-index:9;margin-bottom:17px}.search-field{height:38px;background:#152126;border:1px solid #304247;border-radius:4px;display:flex;align-items:center;gap:10px;padding:0 11px;color:#728e89}.search-field:focus-within{border-color:#6ba99c}.search-field input{width:100%;min-width:0;border:0;outline:none;background:none;color:#d7e9e3;font-size:11px}.search-field input:focus-visible{outline:none}.search-field input::placeholder{color:#718b88}.search-results{position:absolute;top:44px;left:0;right:0;max-height:340px;overflow:auto;box-shadow:0 10px 25px #0006;background:#152126;border:1px solid #45625e;border-radius:4px}.results-heading{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;color:#7da49c;font-size:9px}.results-heading button{border:0;background:none;display:flex;padding:2px}.search-results>p{padding:14px;color:#8b9f9b}
.result-row{width:100%;min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border:0;border-bottom:1px solid #293a3d;background:none;text-align:left;color:#c2d4cd!important;font-size:11px}.result-row:hover{background:#223a3a;color:var(--mint)!important}.result-row span{min-width:0;overflow-wrap:anywhere}.result-row small{display:block;font:9px/1.4 Consolas,monospace;color:#728b84;margin-top:3px}.result-row svg{color:#628f85;flex-shrink:0}
.deck-tabs{display:flex;border-bottom:1px solid var(--line);min-height:38px}.deck-tabs button{flex:1;border:0;border-bottom:2px solid transparent;background:none;border-radius:0;display:flex;align-items:center;justify-content:center;gap:7px;font-size:11px;color:#798f89}.deck-tabs button.active{color:var(--mint);border-bottom-color:var(--mint)}
.deck-content{flex:1;min-height:0;overflow:auto;padding:18px 1px 12px 0;scrollbar-width:thin;scrollbar-color:#38524d transparent}.section-caption{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#95aca4;margin-bottom:13px}.section-caption b{font:9px Consolas,monospace;color:#7ca89a}
.presets{display:flex;gap:5px;margin-bottom:14px}.presets button{flex:1;min-width:0;background:#121e22;border:1px solid #2d4144;color:#89a69b;font-size:10px;padding:7px 2px}.presets button.active{background:#26403b;border-color:#608b79;color:#cdf4dc}
.system-list{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}.system-row{width:100%;height:38px;display:flex;align-items:center;gap:7px;background:none;border:0;border-bottom:1px solid #243538;text-align:left;color:#7b8e88!important;min-width:0}.system-row.selected{color:#c3d6cb!important}.system-row i{width:6px;height:6px;border-radius:2px;flex-shrink:0;opacity:.35}.system-row.selected i{opacity:1}.system-row span{font-size:10px}.system-row small{font:9px Consolas,monospace;color:#58766c;margin-left:auto}.system-row svg{color:#84b3a0;flex-shrink:0}.hidden-dot{width:13px;height:13px;position:relative}.hidden-dot:after{content:"";width:4px;height:1px;background:#4b655b;position:absolute;top:6px;left:4px}
.decomposition{border-top:1px solid var(--line);padding:17px 0 12px;flex-shrink:0}.decomposition>label{display:flex;justify-content:space-between;align-items:center;color:#bbcfc1;font-size:11px}.decomposition label span{display:flex;align-items:center;gap:8px}.decomposition svg{color:#84bc9b}.decomposition label b{font:20px/1 Consolas,monospace;color:var(--yellow)}.decomposition label small{font-size:10px;margin-left:3px;color:#8da084}.decomposition>div{display:flex;align-items:center;justify-content:space-between;font-size:8px;color:#718777}.decomposition>div button{background:none;border:0;display:flex;align-items:center;gap:6px;color:#b7ccac;font-size:10px}
.deck-footer{height:37px;flex-shrink:0;display:flex;align-items:center;gap:7px;border-top:1px solid var(--line);font:8px Consolas,monospace;color:#607d6e}.deck-footer button{margin-left:auto;background:none;border:0;display:flex;color:#719381}
.structure-identity{padding:2px 0 15px}.structure-identity>span{font:10px Consolas,monospace;color:var(--yellow)}.structure-identity h2{font:500 26px/1.4 "Microsoft YaHei",sans-serif;letter-spacing:0;margin:10px 0 5px;overflow-wrap:anywhere;color:#e8f2e8}.structure-identity small{font:10px/1.6 Consolas,monospace;color:#7ca394;overflow-wrap:anywhere}.system-tags{display:flex;flex-wrap:wrap;gap:10px}.system-tags span{display:flex;align-items:center;gap:6px;font-size:9px;color:#97b3a5}.system-tags i{width:5px;height:5px;border-radius:50%}.structure-note{font-size:11px;line-height:1.9;color:#94aca0;margin:16px 0}.structure-stats{margin:15px 0;display:flex;gap:26px;padding:13px 0;border-block:1px solid #2a3d37}.structure-stats dt{font-size:9px;color:#6f8e7e}.structure-stats dd{margin:5px 0 0;font:12px Consolas,monospace;color:#c6d6bc}.inspection-actions{display:flex;gap:8px}.primary-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#8ce1bc;border:1px solid #8ce1bc;color:#0b211b!important;min-height:35px;padding:8px 14px;font-size:11px;font-weight:500}.inspection-actions .primary-button{flex:1}.secondary-button{display:flex;align-items:center;justify-content:center;border:1px solid #415b4b;background:none;width:36px;color:#a5c8ae!important}.plain-icon{background:none;border:0;display:flex;padding:0;color:#8bad98!important}.inspect-empty{padding:13px 0 22px;color:#87ac93}.inspect-empty h2{font:500 17px/1.5 "Microsoft YaHei",sans-serif;margin:14px 0 6px;letter-spacing:0;color:#d2e4d0}.inspect-empty small{font-size:10px;color:#7e9e85}.guide-button{width:100%;display:flex;align-items:center;gap:9px;border:1px solid #3c5544;background:#15251c;padding:11px 10px;margin-top:22px;color:#b4d9b2!important;font-size:11px}.guide-button small{margin-left:auto;color:#738e66;font:9px Consolas,monospace}
.render-options{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:15px}.render-options button{display:flex;flex-direction:column;align-items:center;gap:7px;background:#122021;border:1px solid #314543;padding:13px 4px;color:#7e9b91}.render-options button.active{border-color:#80bfa8;color:var(--mint);background:#1a3231}.render-options b{font-size:11px;font-weight:400}.render-options small{font:8px Consolas,monospace;color:#678f84}.toggle-row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #263b34;cursor:pointer;font-size:11px;color:#b0c8b6}.toggle-row span{display:flex;align-items:center;gap:9px}.toggle-row svg{color:#769f85}.toggle-row input{appearance:none;width:28px;height:16px;background:#344639;border:1px solid #45604b;border-radius:10px;position:relative;cursor:pointer;transition:.2s}.toggle-row input:before{content:"";position:absolute;top:2px;left:2px;width:10px;height:10px;background:#90a98d;border-radius:50%;transition:.2s}.toggle-row input:checked{background:#47806c;border-color:#6ba992}.toggle-row input:checked:before{left:14px;background:#c0f9df}.slice-control{padding:14px 0}.slice-control label{display:flex;justify-content:space-between;font-size:10px;color:#8da991}.slice-control b{color:var(--mint);font:11px Consolas,monospace}.render-data{margin-top:25px}.render-data p{display:flex;justify-content:space-between;font-size:10px;color:#6f927d;margin:11px 0}.render-data b{font:10px Consolas,monospace;color:#9fb6a0}
.toast{position:absolute;bottom:95px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:#204035;border:1px solid #587d65;color:#c4efd0;font-size:11px;padding:9px 14px;border-radius:4px;white-space:nowrap}
.source-backdrop{position:fixed;inset:0;background:#0009;z-index:30;display:grid;place-items:center;padding:20px;backdrop-filter:blur(5px)}.source-dialog{width:min(500px,100%);background:#142024;border:1px solid #46605b;border-radius:7px;padding:30px;position:relative;max-height:90dvh;overflow:auto}.source-close{position:absolute;top:13px;right:13px}.source-dialog h2{font:500 25px/1.5 "Microsoft YaHei",sans-serif;margin:16px 0;letter-spacing:0}.source-dialog p{font-size:12px;line-height:1.9;color:#a6bcb2}.source-dialog a{display:flex;align-items:center;justify-content:space-between;color:var(--mint);text-decoration:none;padding:12px 0;border-bottom:1px solid #30483f;font-size:11px}.source-dialog>small{display:block;font-size:10px;line-height:1.8;margin-top:20px;color:#7d9b8a}
@keyframes anatomy-spin{to{transform:rotate(360deg)}}
@media(min-width:1600px){.anatomy-workspace{padding:0 36px 18px;grid-template-columns:minmax(0,1fr) 360px;gap:0 32px;grid-template-rows:125px minmax(0,1fr)}.workspace-title h1{font-size:38px}.system-row{height:43px}.deck-heading{height:68px;min-height:68px}}
@media(max-width:1100px) and (min-width:761px){.anatomy-workspace{grid-template-columns:minmax(0,1fr) 290px;padding-inline:14px;gap:0 16px}.control-deck{padding-left:15px}.workspace-title h1{font-size:26px}.workspace-title h1 span{display:block;margin:2px 0 0}.title-index{display:none}.landmark-rail span{display:none}.stage-toolbar{gap:4px;padding-inline:4px}.view-switch button{padding:7px}.toolbar-icons .icon-button{width:27px}}
@media(max-width:760px){.lab-nav{height:46px;padding:0 14px;gap:10px}.lab-brand{margin-left:auto;font-size:9px;gap:6px}.lab-brand b{font-size:9px}.lab-brand small,.nav-status,.title-index{display:none}.lab-nav>.icon-button{width:25px}.anatomy-workspace{height:calc(100dvh - 46px);padding:0 12px 8px;grid-template-columns:minmax(0,1fr);grid-template-rows:76px minmax(160px,1fr) 258px;grid-template-areas:"title" "model" "deck";gap:0}.workspace-title h1{font-size:23px;margin-top:6px}.workspace-title h1 span{margin-left:7px}.eyebrow-text{font-size:8px;gap:7px}.control-deck{border-left:0;padding-left:0;border-top:1px solid var(--line);display:grid;grid-template-columns:minmax(0,1fr) 118px;grid-template-rows:38px 30px minmax(0,1fr);column-gap:14px}.deck-heading,.deck-footer{display:none}.search-area{grid-column:1;grid-row:1;margin:5px 0 0}.search-field{height:30px}.search-field input{font-size:10px}.deck-tabs{grid-row:2;grid-column:1;min-height:0}.deck-content{grid-column:1;grid-row:3;padding:10px 1px 4px 0}.decomposition{grid-column:2;grid-row:1/4;align-self:start;margin-top:13px;border-top:0;border-left:1px solid var(--line);padding:6px 0 8px 13px}.decomposition>label{align-items:start;gap:12px;flex-direction:column}.decomposition label span{font-size:10px}.decomposition label b{font-size:23px}.decomposition>div{flex-wrap:wrap;gap:14px}.decomposition>div button{order:3;width:100%;font-size:9px;justify-content:space-between;padding:0}.search-results{top:auto;bottom:35px;max-height:250px}.system-list{column-gap:8px}.system-row{height:31px;gap:5px}.system-row span{font-size:9px}.system-row small{font-size:8px}.system-row svg{width:11px}.presets{margin-bottom:7px}.presets button{font-size:9px;padding:5px 0}.section-caption{font-size:9px;margin-bottom:8px}.stage-top{top:11px;left:5px;right:5px;font-size:9px}.stage-top small{font-size:8px}.stage-top>span{font-size:8px}.stage-top b{display:none}.stage-toolbar{bottom:24px;gap:3px;padding:3px;max-width:100%;background:#111b20ec}.view-switch button{padding:5px 6px;font-size:9px}.toolbar-icons{gap:0}.toolbar-icons .icon-button{width:25px;height:26px}.divider{margin-inline:1px}.stage-foot{bottom:3px;left:5px;right:5px;font-size:7px}.landmark-rail{left:0;top:50px;gap:8px}.landmark-rail span{display:none}.landmark-rail button{padding:6px}.landmark-rail svg{width:15px}.structure-identity h2{font-size:20px}.structure-note{font-size:10px}.render-options{gap:5px;margin-bottom:5px}.render-options button{padding:8px 2px;gap:4px}.render-options small{display:none}.toggle-row{padding:9px 0;font-size:10px}.toast{bottom:65px}}
@media(max-width:370px){.workspace-title h1{font-size:20px}.lab-brand b{font-size:8px}.anatomy-workspace{grid-template-rows:68px minmax(130px,1fr) 242px}.control-deck{grid-template-columns:minmax(0,1fr) 95px;column-gap:8px}.toolbar-icons .icon-button{width:22px}.view-switch button{padding-inline:4px}}
@media(prefers-reduced-motion:reduce){.spin{animation:none}.anatomy-lab *{transition:none!important}}
</style>
