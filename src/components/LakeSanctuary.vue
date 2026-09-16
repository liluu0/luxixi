<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft, ArrowUpRight, RotateCcw, Orbit, Grid3X3, Image, Maximize, Minimize, X, Info } from 'lucide-vue-next'
import { createSanctuaryScene, viewpoints } from './sanctuary/createSanctuaryScene'
import { previewUrl } from './sanctuary/assets'

const host = ref(null)
const stage = ref(null)
const progress = ref(0)
const ready = ref(false)
const error = ref('')
const rotating = ref(false)
const wireframe = ref(false)
const original = ref(false)
const infoOpen = ref(false)
const fullscreen = ref(false)
const expanded = ref(false)
const activeView = ref('arrival')
const caption = computed(() => viewpoints.find(v => v.id === activeView.value)?.note || '把视角交给自己，寻找你喜欢的一处角落。')
let controller
let generation = 0
let disposed = false

async function initialize() {
  const run = ++generation
  controller?.dispose()
  controller = null
  ready.value = false
  error.value = ''
  progress.value = 0
  rotating.value = false
  wireframe.value = false
  original.value = false
  activeView.value = 'arrival'
  try {
    controller = createSanctuaryScene(host.value, {
      onProgress: value => { if (run === generation) progress.value = value },
      onInteraction: () => { rotating.value = false; activeView.value = '' },
      onError: message => { error.value = message; ready.value = false },
    })
    await controller.load()
    if (!disposed && run === generation) ready.value = true
  } catch (cause) {
    if (!disposed && run === generation) {
      error.value = '三维场景暂时无法加载。你仍然可以欣赏原始渲染图，或重试加载。'
      console.error('Sanctuary scene:', cause)
      controller?.dispose()
      controller = null
    }
  }
}
function selectView(id) {
  activeView.value = id
  rotating.value = false
  original.value = false
  controller?.setVisible(true)
  controller?.setView(id)
}
function toggleRotate() {
  rotating.value = !rotating.value
  controller?.setRotate(rotating.value)
}
function toggleWireframe() {
  wireframe.value = !wireframe.value
  controller?.setWireframe(wireframe.value)
}
function toggleOriginal() {
  original.value = !original.value
  rotating.value = false
  controller?.setRotate(false)
  controller?.setVisible(!original.value)
}
async function toggleFullscreen() {
  if (expanded.value) { expanded.value = false; fullscreen.value = false; return }
  try {
    if (document.fullscreenElement === stage.value) await document.exitFullscreen()
    else await stage.value.requestFullscreen()
  } catch {
    // Embedded or background browser tabs may deny native fullscreen.
    expanded.value = true
    fullscreen.value = true
  }
}
function syncFullscreen() { fullscreen.value = document.fullscreenElement === stage.value || expanded.value }
function escapeExpanded(event) {
  if (event.key === 'Escape' && expanded.value) { expanded.value = false; fullscreen.value = false }
}
onMounted(() => {
  initialize()
  document.addEventListener('fullscreenchange', syncFullscreen)
  document.addEventListener('keydown', escapeExpanded)
})
onUnmounted(() => {
  disposed = true
  generation++
  controller?.dispose()
  document.removeEventListener('fullscreenchange', syncFullscreen)
  document.removeEventListener('keydown', escapeExpanded)
})
</script>

<template>
  <main class="sanctuary-page">
    <header class="sanctuary-nav">
      <RouterLink to="/#work" class="back-link"><ArrowLeft :size="16" /> 返回作品集</RouterLink>
      <span class="sanctuary-wordmark">LUXIXI <span>/</span> WORLDS</span>
      <span class="edition">SELECTED WORK 03</span>
    </header>

    <div class="sanctuary-heading">
      <div><p class="sanctuary-kicker">AURELIA SANCTUARY <span>—</span> 3D STUDY / V3</p><h1>湖心圣殿<span>一座与世隔水的梦。</span></h1></div>
      <p class="intro">群山之后，湖光之间。<br>让想象有形，让时间停在暮色里。</p>
    </div>

    <div ref="stage" class="sanctuary-stage" :class="{ 'show-original': original, expanded }">
      <div ref="host" class="scene-host" />
      <img v-if="!ready || original" class="sanctuary-poster" :src="previewUrl" alt="湖心圣殿 Blender 原始渲染：群山环抱湖面，金色穹顶、哥特尖塔与花园坐落于石拱孤岛。" />
      <div class="stage-topline"><span class="scene-label"><i />{{ original ? 'BLENDER / 原始渲染' : ready ? 'LIVE / 实时三维' : 'AURELIA / 湖心圣殿' }}</span><button type="button" class="info-button" :aria-expanded="infoOpen" aria-controls="sanctuary-info" @click="infoOpen = !infoOpen"><Info :size="15" /> 作品手记</button></div>

      <div v-if="!ready && !original" class="scene-loading" role="status" aria-live="polite">
        <template v-if="!error"><span class="loading-symbol">✳</span><strong>{{ progress >= 90 ? '正在唤醒圣殿' : '正在穿过湖上的雾' }}</strong><p>三维场景加载中 · {{ progress }}%</p><div class="load-track"><i :style="{ width: `${progress}%` }" /></div></template>
        <template v-else><strong>先在湖边停留片刻</strong><p>{{ error }}</p><div class="error-actions"><button @click="initialize">重新加载</button><button @click="toggleOriginal">欣赏渲染图</button></div></template>
      </div>

      <aside v-if="infoOpen" id="sanctuary-info" class="sanctuary-info" aria-label="作品手记">
        <button class="close-info" aria-label="关闭作品手记" @click="infoOpen = false"><X :size="18" /></button>
        <span class="sanctuary-kicker">NOTES ON A SMALL WORLD</span><h2>把一个梦，<br>建成一座岛。</h2>
        <p>尖塔与穹顶隔着庭园对望，石拱托起整座圣殿。沿湖倾落的瀑布、桥上的灯与远处的山，共同组成这个安静的世界。</p>
        <dl><div><dt>创作</dt><dd>露西西</dd></div><div><dt>媒介</dt><dd>Blender · 3D 建模</dd></div><div><dt>版本</dt><dd>Aurelia Sanctuary / V3</dd></div></dl>
        <p class="material-note">实时三维保留模型几何与基础材质；程序化纹理、体积雾及光照与 Blender 渲染有所不同。点击「原始渲染」查看创作效果。</p>
      </aside>

      <div v-if="ready || original" class="stage-bottom">
        <div class="view-caption"><span>{{ original ? 'STILL / 01' : activeView ? `VIEW / 0${viewpoints.findIndex(v => v.id === activeView) + 1}` : 'FREE / ORBIT' }}</span><p>{{ original ? '暮色凝固在湖面，窗里的灯刚刚亮起。' : caption }}</p></div>
        <div class="scene-tools" aria-label="场景工具">
          <button :disabled="!ready || original" :aria-pressed="rotating" @click="toggleRotate"><Orbit :size="17" /><span>{{ rotating ? '暂停环绕' : '自动环绕' }}</span></button>
          <button :disabled="!ready || original" :aria-pressed="wireframe" @click="toggleWireframe"><Grid3X3 :size="17" /><span>线框</span></button>
          <button :aria-pressed="original" @click="toggleOriginal"><Image :size="17" /><span>{{ original ? '实时三维' : '原始渲染' }}</span></button>
          <button :disabled="!ready" @click="selectView('arrival')"><RotateCcw :size="17" /><span>复位</span></button>
          <button :aria-label="fullscreen ? '退出全屏' : '全屏查看'" @click="toggleFullscreen"><component :is="fullscreen ? Minimize : Maximize" :size="17" /></button>
        </div>
      </div>
    </div>

    <div class="sanctuary-bottom">
      <div class="viewpoints" aria-label="预设视角"><span class="viewpoints-label">漫游视角</span><button v-for="(view, index) in viewpoints" :key="view.id" :disabled="!ready" :aria-pressed="activeView === view.id && !original" @click="selectView(view.id)"><small>0{{ index + 1 }}</small>{{ view.label }}<ArrowUpRight :size="13" /></button></div>
      <p class="gesture-hint">拖动旋转 · 滚轮缩放 · 右键平移<span>触屏：单指旋转 · 双指缩放 / 平移</span></p>
    </div>
    <footer class="sanctuary-footer"><span>IMAGINED & BUILT BY LUXIXI</span><span>留一点想象，给现实以外的地方。 ✳</span></footer>
  </main>
</template>

<style scoped>
.sanctuary-page{--gold:#d9c29a;--muted:#8d9b9d;min-height:100svh;background:#101b20;color:#eee9dc;font-family:'Microsoft YaHei',sans-serif;padding:0 4vw}
.sanctuary-page button,.sanctuary-page a{-webkit-tap-highlight-color:transparent}
.sanctuary-page button{font:inherit;cursor:pointer}
.sanctuary-page button:focus-visible,.sanctuary-page a:focus-visible{outline:2px solid var(--gold);outline-offset:5px}
.sanctuary-page button:disabled{opacity:.35;cursor:default}
.sanctuary-nav{height:70px;border-bottom:1px solid #ffffff1a;display:flex;align-items:center;justify-content:space-between;font-size:11px;letter-spacing:.12em}
.back-link{display:flex;align-items:center;gap:10px;color:#c6cfca;text-decoration:none}.back-link:hover{color:var(--gold)}
.sanctuary-wordmark{font-family:Georgia,serif;font-size:16px;letter-spacing:.18em}.sanctuary-wordmark span{color:#63787c;margin:0 12px}.edition{color:var(--muted);font-family:monospace}
.sanctuary-heading{display:flex;justify-content:space-between;align-items:end;padding:30px 0 28px;gap:20px}.sanctuary-kicker{font:10px monospace;letter-spacing:.19em;color:var(--gold);margin:0 0 14px}.sanctuary-kicker span{padding:0 8px;color:#657a7e}
.sanctuary-heading h1{font:normal clamp(32px,3.8vw,58px)/1.2 'Songti SC','SimSun',serif;letter-spacing:.12em;margin:0}.sanctuary-heading h1 span{font:12px 'Microsoft YaHei',sans-serif;letter-spacing:.18em;display:inline-block;margin-left:28px;color:#a5b1b0}.intro{font-size:12px;line-height:1.9;color:var(--muted);margin:0}
.sanctuary-stage{position:relative;height:calc(100svh - 338px);min-height:430px;max-height:960px;background:#172731;border:1px solid #ffffff17;overflow:hidden;isolation:isolate}.sanctuary-stage:fullscreen{height:100vh;max-height:none;border:0}
.scene-host{position:absolute;inset:0}.scene-host :deep(canvas){width:100%;height:100%;display:block;touch-action:none;outline-offset:-3px}
.sanctuary-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}.show-original .sanctuary-poster{object-fit:contain;background:#101b20}
.stage-topline{position:absolute;top:20px;left:24px;right:24px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}.scene-label{font:10px monospace;letter-spacing:.1em;background:#0b191ec9;padding:9px 12px;color:#c9d8d7;border:1px solid #ffffff16;display:flex;align-items:center;gap:8px}.scene-label i{width:5px;height:5px;border-radius:50%;background:var(--gold)}
.info-button{pointer-events:auto;display:flex;align-items:center;gap:7px;background:#101e25d9;border:1px solid #ffffff2b;color:#d3dcd7;padding:9px 12px;font-size:11px!important}
.scene-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0c1b25ba;backdrop-filter:blur(5px);text-align:center;padding:35px}.scene-loading strong{font:24px 'SimSun',serif;letter-spacing:.15em}.scene-loading p{font-size:12px;color:#b1bfbd;line-height:1.9;max-width:320px}.loading-symbol{font-size:40px;color:var(--gold);margin-bottom:22px;animation:sanctuary-turn 10s linear infinite}.load-track{width:180px;height:1px;background:#ffffff30;margin-top:16px}.load-track i{display:block;height:100%;background:var(--gold);transition:width .3s}.error-actions{display:flex;gap:10px;margin-top:16px}.error-actions button{border:1px solid #d9c29a88;padding:10px 15px;background:#15252b;color:var(--gold)}
.stage-bottom{position:absolute;bottom:0;left:0;right:0;padding:40px 24px 20px;display:flex;justify-content:space-between;align-items:end;gap:16px;background:linear-gradient(transparent,#0b161cdd);pointer-events:none}.view-caption{max-width:45%}.view-caption span{font:10px monospace;letter-spacing:.2em;color:var(--gold)}.view-caption p{font-size:11px;line-height:1.8;margin:8px 0 0;color:#d3dedb}.scene-tools{display:flex;gap:4px;pointer-events:auto;padding:5px;background:#102128e8;border:1px solid #ffffff24;backdrop-filter:blur(10px)}.scene-tools button{display:flex;align-items:center;justify-content:center;gap:7px;border:0;background:transparent;color:#b7c4c4;padding:10px;font-size:11px;min-height:37px}.scene-tools button:hover:not(:disabled),.scene-tools button[aria-pressed=true]{color:#f0d4a4;background:#ffffff0d}
.sanctuary-info{position:absolute;z-index:3;top:65px;right:24px;width:330px;max-width:calc(100% - 48px);max-height:calc(100% - 85px);overflow:auto;background:#102128f5;border:1px solid #d9c29a44;padding:30px;box-shadow:0 20px 60px #0004;backdrop-filter:blur(20px)}.close-info{position:absolute;right:10px;top:10px;background:none;border:0;color:#c6ceca;padding:5px}.sanctuary-info .sanctuary-kicker{font-size:8px}.sanctuary-info h2{font:26px/1.5 'SimSun',serif;letter-spacing:.08em;margin:18px 0}.sanctuary-info p{font-size:12px;line-height:1.9;color:#aebcba}.sanctuary-info dl{font-size:11px;border-top:1px solid #ffffff20;padding-top:16px;margin:20px 0}.sanctuary-info dl div{display:flex;justify-content:space-between;margin:12px 0;gap:12px}.sanctuary-info dt{color:#7d9195}.sanctuary-info dd{margin:0}.sanctuary-info .material-note{font-size:10px;color:#7d9195;margin-bottom:0}
.sanctuary-bottom{display:flex;justify-content:space-between;align-items:center;padding:20px 0;gap:20px;border-bottom:1px solid #ffffff18}.viewpoints{display:flex;align-items:center;gap:8px}.viewpoints-label{font-size:10px;color:#839597;margin-right:12px}.viewpoints button{display:flex;align-items:center;gap:10px;padding:11px 13px;color:#9fadaf;background:transparent;border:1px solid #ffffff19;font-size:11px}.viewpoints button small{font:9px monospace;color:#697e83}.viewpoints button[aria-pressed=true]{border-color:#d9c29a66;color:#e6d0ab;background:#d9c29a09}.viewpoints button:hover:not(:disabled){border-color:var(--gold)}.gesture-hint{font-size:10px;color:#84979a;margin:0;line-height:1.8}.gesture-hint span{display:block;font-size:9px;color:#657b7f}
.sanctuary-footer{display:flex;justify-content:space-between;padding:17px 0 20px;border:0;color:#60797f;font:9px monospace;letter-spacing:.13em}
@keyframes sanctuary-turn{to{transform:rotate(360deg)}}
@media(min-width:1800px){.sanctuary-page{padding:0 max(4vw,calc((100vw - 1800px)/2))}}
@media(max-width:1000px){.viewpoints-label{display:none}.viewpoints button{padding:10px;gap:7px}.view-caption{max-width:38%}.scene-tools button{padding:9px 7px}.sanctuary-heading h1 span{display:block;margin:14px 0 0}.sanctuary-stage{height:60svh}.gesture-hint{font-size:9px}}
@media(max-width:650px){.sanctuary-page{padding:0 18px}.sanctuary-nav{height:58px;font-size:10px}.sanctuary-wordmark{font-size:12px}.edition{display:none}.sanctuary-heading{padding:26px 0 22px}.sanctuary-heading h1{font-size:38px}.sanctuary-heading h1 span{font-size:11px;margin-top:12px}.sanctuary-kicker{font-size:8px}.intro{display:none}.sanctuary-stage{height:63svh;min-height:460px;margin:0 -18px;border-left:0;border-right:0}.stage-topline{top:16px;left:16px;right:16px}.scene-label{font-size:8px}.stage-bottom{padding:55px 14px 16px;flex-direction:column;align-items:stretch;gap:15px}.view-caption{max-width:100%;text-align:center}.view-caption p{font-size:10px;margin-top:5px}.scene-tools{justify-content:center;gap:3px}.scene-tools button{padding:9px 7px;font-size:10px}.scene-tools button span{white-space:nowrap}.sanctuary-bottom{display:block;padding:18px 0}.viewpoints{display:grid;grid-template-columns:1fr 1fr;gap:8px}.viewpoints button{justify-content:space-between;padding:12px}.gesture-hint{text-align:center;margin-top:15px}.gesture-hint span{font-size:10px}.sanctuary-footer{font-size:8px;gap:20px;line-height:1.8}.sanctuary-footer span:last-child{text-align:right}.sanctuary-info{right:16px;width:calc(100% - 32px);max-width:none}}
@media(prefers-reduced-motion:reduce){.loading-symbol{animation:none}.load-track i{transition:none}}
.sanctuary-stage.expanded{position:fixed;inset:0;z-index:1000;height:100dvh;min-height:0;max-height:none;margin:0;border:0}
</style>
