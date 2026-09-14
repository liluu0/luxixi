<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  ArrowLeft, Check, ChevronRight, CircleHelp, Crosshair, FlaskConical,
  Footprints, Heart, Maximize, Minimize, Pause, Play, RotateCcw,
  Settings2, Shield, Swords, Volume2, VolumeX, X, Zap,
} from 'lucide-vue-next'
import { createCastleGame } from '../game/castle/game.js'

const props = defineProps({ onBack: Function })
const root = ref(null)
const canvas = ref(null)
const loaded = ref(false)
const loading = reactive({ progress: 0, label: '正在进入钟庭' })
const failure = ref('')
const notice = ref('')
const settingsOpen = ref(false)
const isFullscreen = ref(false)
const state = reactive({
  phase: 'ready', health: 100, stamina: 100, potions: 3,
  kills: 0, total: 8, elapsed: 0, locked: false,
  targetName: '', targetHealth: 0, targetMaxHealth: 100,
  muted: false, quality: 'balanced',
})
const stick = reactive({ x: 0, y: 0, active: false })
const hasRun = computed(() => loaded.value && state.phase !== 'ready')
const isPlaying = computed(() => loaded.value && state.phase === 'playing' && !settingsOpen.value)
const enemiesLeft = computed(() => Math.max(0, state.total - state.kills))
const percent = value => Math.max(0, Math.min(100, Number(value) || 0))
const targetPercent = computed(() => percent(state.targetHealth / Math.max(1, state.targetMaxHealth) * 100))
const elapsedTime = computed(() => {
  const seconds = Math.max(0, Math.floor(state.elapsed || 0))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})
let game
let previousTitle = ''
let disposed = false
let resumeAfterSettings = false
let stickPointer = null
let lookPointer = null
let lookPosition = { x: 0, y: 0 }
let noticeTimer

function clearInput() {
  stick.x = 0
  stick.y = 0
  stick.active = false
  stickPointer = null
  lookPointer = null
  game?.setMovement({ x: 0, y: 0 })
}

function onState(next) {
  if (disposed) return
  const wasPlaying = state.phase === 'playing'
  Object.assign(state, next)
  if (wasPlaying && state.phase !== 'playing') clearInput()
}

function notify(message) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 2600)
}

function start() {
  if (!loaded.value || failure.value) return
  settingsOpen.value = false
  game?.start()
}

function resume() {
  settingsOpen.value = false
  resumeAfterSettings = false
  game?.resume()
}

function restart() {
  settingsOpen.value = false
  resumeAfterSettings = false
  clearInput()
  game?.restart()
}

function togglePause() {
  if (!loaded.value) return
  if (settingsOpen.value) closeSettings()
  else if (state.phase === 'playing') game?.pause()
  else if (state.phase === 'paused') resume()
}

function openSettings() {
  resumeAfterSettings = state.phase === 'playing'
  if (resumeAfterSettings) game?.pause()
  settingsOpen.value = true
}

function closeSettings() {
  settingsOpen.value = false
  if (resumeAfterSettings && state.phase === 'paused') game?.resume()
  resumeAfterSettings = false
}

function setQuality(quality) {
  game?.setQuality(quality)
  state.quality = quality
}

function toggleMuted() {
  state.muted = !state.muted
  game?.setMuted(state.muted)
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else if (root.value?.requestFullscreen) await root.value.requestFullscreen()
    else notify('此浏览器暂不支持全屏')
  } catch {
    notify('暂时无法进入全屏')
  }
}

function fullscreenChanged() {
  isFullscreen.value = document.fullscreenElement === root.value
}

function menuKeydown(event) {
  if (!settingsOpen.value) return
  event.stopImmediatePropagation()
  if (event.code === 'Escape' || event.code === 'KeyP') {
    event.preventDefault()
    closeSettings()
  }
}

function back() {
  clearInput()
  game?.pause()
  props.onBack?.()
}

function stickMove(event) {
  if (event.pointerId !== stickPointer) return
  const bounds = event.currentTarget.getBoundingClientRect()
  const max = bounds.width * .28
  const dx = event.clientX - (bounds.left + bounds.width / 2)
  const dy = event.clientY - (bounds.top + bounds.height / 2)
  const length = Math.hypot(dx, dy)
  const scale = length > max ? max / length : 1
  stick.x = dx * scale
  stick.y = dy * scale
  game?.setMovement({ x: stick.x / max, y: -stick.y / max })
}

function stickDown(event) {
  if (!isPlaying.value || stickPointer !== null) return
  stickPointer = event.pointerId
  stick.active = true
  event.currentTarget.setPointerCapture(event.pointerId)
  stickMove(event)
}

function stickUp(event) {
  if (event.pointerId !== stickPointer) return
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  stickPointer = null
  stick.x = 0
  stick.y = 0
  stick.active = false
  game?.setMovement({ x: 0, y: 0 })
}

function lookDown(event) {
  if (!isPlaying.value || lookPointer !== null) return
  lookPointer = event.pointerId
  lookPosition = { x: event.clientX, y: event.clientY }
  event.currentTarget.setPointerCapture(event.pointerId)
}

function lookMove(event) {
  if (event.pointerId !== lookPointer) return
  game?.look(event.clientX - lookPosition.x, event.clientY - lookPosition.y)
  lookPosition = { x: event.clientX, y: event.clientY }
}

function lookUp(event) {
  if (event.pointerId !== lookPointer) return
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  lookPointer = null
}

onMounted(async () => {
  previousTitle = document.title
  document.title = '灰烬钟庭 · 古堡战斗 | LUXIXI'
  document.addEventListener('fullscreenchange', fullscreenChanged)
  window.addEventListener('keydown', menuKeydown, true)
  try {
    const created = await createCastleGame(canvas.value, {
      onState,
      onLoading: next => {
        if (!disposed) Object.assign(loading, next)
      },
      onError: error => {
        if (!disposed) {
          failure.value = error?.message || '场景加载失败'
          clearInput()
        }
      },
    })
    if (disposed) created.dispose()
    else {
      game = created
      loaded.value = true
    }
  } catch (error) {
    if (!disposed) failure.value = error?.message || '场景加载失败'
  }
})

onBeforeUnmount(() => {
  disposed = true
  document.title = previousTitle
  clearTimeout(noticeTimer)
  document.removeEventListener('fullscreenchange', fullscreenChanged)
  window.removeEventListener('keydown', menuKeydown, true)
  clearInput()
  game?.dispose()
})
</script>

<template>
  <div ref="root" class="castle-battle" :class="{ 'castle-battle--playing': isPlaying }">
    <canvas ref="canvas" class="castle-canvas" aria-label="古堡战斗三维场景" @contextmenu.prevent />
    <div class="castle-shade" aria-hidden="true" />

    <header class="castle-topbar">
      <button class="castle-icon castle-back" type="button" title="返回作品集" aria-label="返回作品集" @click="back"><ArrowLeft :size="20" /></button>
      <div class="castle-location"><span>古堡战斗小游戏</span><b>灰烬钟庭</b></div>
      <div class="castle-tools">
        <button v-if="hasRun && ['playing', 'paused'].includes(state.phase)" class="castle-icon" type="button" :title="state.phase === 'paused' ? '继续' : '暂停'" :aria-label="state.phase === 'paused' ? '继续' : '暂停'" @click="togglePause"><Play v-if="state.phase === 'paused'" :size="18" /><Pause v-else :size="18" /></button>
        <button class="castle-icon" type="button" :title="state.muted ? '开启音效' : '关闭音效'" :aria-label="state.muted ? '开启音效' : '关闭音效'" :disabled="!loaded" @click="toggleMuted"><VolumeX v-if="state.muted" :size="18" /><Volume2 v-else :size="18" /></button>
        <button class="castle-icon castle-fullscreen" type="button" :title="isFullscreen ? '退出全屏' : '全屏'" :aria-label="isFullscreen ? '退出全屏' : '全屏'" @click="toggleFullscreen"><Minimize v-if="isFullscreen" :size="18" /><Maximize v-else :size="18" /></button>
        <button class="castle-icon" type="button" title="设置" aria-label="设置" :disabled="!loaded" @click="settingsOpen ? closeSettings() : openSettings()"><Settings2 :size="18" /></button>
      </div>
    </header>

    <div v-if="hasRun" class="castle-hud" aria-label="战斗状态">
      <div class="castle-vitals">
        <div class="castle-character"><span class="castle-character-sigil"><Shield :size="19" /></span><div><b>艾莉娅</b><span>余烬行者</span></div></div>
        <div class="castle-meter castle-meter--health" :class="{ 'castle-meter--critical': state.health <= 25 }" role="progressbar" :aria-valuenow="Math.round(state.health)" aria-valuemin="0" aria-valuemax="100" aria-label="生命值"><Heart :size="12" /><div><i :style="{ width: percent(state.health) + '%' }" /></div><span>{{ Math.ceil(state.health) }}</span></div>
        <div class="castle-meter castle-meter--stamina" role="progressbar" :aria-valuenow="Math.round(state.stamina)" aria-valuemin="0" aria-valuemax="100" aria-label="体力"><Zap :size="12" /><div><i :style="{ width: percent(state.stamina) + '%' }" /></div></div>
      </div>
      <div class="castle-objective"><Shield :size="17" /><div><span>钟庭守卫</span><b>{{ String(enemiesLeft).padStart(2, '0') }}<small> / {{ String(state.total).padStart(2, '0') }}</small></b></div></div>
    </div>

    <div v-if="isPlaying && state.locked && state.targetName" class="castle-target" aria-label="锁定目标">
      <div><Crosshair :size="12" /><span>{{ state.targetName }}</span></div>
      <div class="castle-target-meter" role="progressbar" :aria-valuenow="Math.round(state.targetHealth)" aria-valuemin="0" :aria-valuemax="state.targetMaxHealth" aria-label="敌人生命值"><i :style="{ width: targetPercent + '%' }" /></div>
    </div>

    <div v-if="isPlaying" class="castle-combat-tools">
      <button class="castle-flask" type="button" title="饮用药剂" aria-label="饮用药剂" :disabled="state.potions <= 0 || state.health >= 100" @click="game?.heal()"><FlaskConical :size="27" /><span>{{ state.potions }}</span></button>
      <button class="castle-icon castle-lock" type="button" title="攻击" aria-label="攻击" :disabled="state.stamina < 18" @click="game?.attack()"><Swords :size="21" /></button>
      <button class="castle-icon castle-lock" type="button" title="闪避" aria-label="闪避" :disabled="state.stamina < 24" @click="game?.dodge()"><Footprints :size="21" /></button>
      <button class="castle-icon castle-lock" :class="{ 'castle-lock--active': state.locked }" type="button" title="锁定目标" aria-label="锁定目标" :aria-pressed="state.locked" @click="game?.toggleLock()"><Crosshair :size="21" /></button>
    </div>

    <div v-if="isPlaying" class="castle-touch">
      <div class="castle-look" aria-label="转动视角" @pointerdown.stop.prevent="lookDown" @pointermove.stop.prevent="lookMove" @pointerup.stop.prevent="lookUp" @pointercancel.stop.prevent="lookUp" />
      <div class="castle-joystick" :class="{ active: stick.active }" role="group" aria-label="移动摇杆" @pointerdown.stop.prevent="stickDown" @pointermove.stop.prevent="stickMove" @pointerup.stop.prevent="stickUp" @pointercancel.stop.prevent="stickUp"><span class="castle-stick-cross" /><i :style="{ transform: `translate(${stick.x}px, ${stick.y}px)` }" /></div>
      <div class="castle-touch-actions">
        <button class="castle-touch-heal" type="button" title="饮用药剂" aria-label="饮用药剂" :disabled="state.potions <= 0 || state.health >= 100" @pointerdown.stop.prevent="game?.heal()"><FlaskConical :size="22" /><small>{{ state.potions }}</small></button>
        <button class="castle-touch-dodge" type="button" title="闪避" aria-label="闪避" :disabled="state.stamina < 24" @pointerdown.stop.prevent="game?.dodge()"><Footprints :size="25" /></button>
        <button class="castle-touch-attack" type="button" title="攻击" aria-label="攻击" @pointerdown.stop.prevent="game?.attack()"><Swords :size="31" /></button>
        <button class="castle-touch-lock" :class="{ active: state.locked }" type="button" title="锁定目标" aria-label="锁定目标" :aria-pressed="state.locked" @pointerdown.stop.prevent="game?.toggleLock()"><Crosshair :size="20" /></button>
      </div>
    </div>

    <Transition name="castle-fade" mode="out-in">
      <div v-if="failure" class="castle-overlay castle-error" role="alert">
        <CircleHelp :size="30" /><p class="castle-kicker">钟庭暂未苏醒</p><h1>无法进入古堡</h1><p class="castle-error-message">{{ failure }}</p><button class="castle-command" type="button" @click="back"><ArrowLeft :size="17" />返回作品集</button>
      </div>
      <div v-else-if="!loaded" class="castle-overlay castle-loading" role="status" aria-live="polite">
        <span class="castle-loading-seal"><Shield :size="25" /></span><p class="castle-kicker">灰烬钟庭</p><h1>古堡战斗小游戏</h1><div class="castle-loading-track" role="progressbar" :aria-valuenow="Math.round(loading.progress * 100)" aria-valuemin="0" aria-valuemax="100" aria-label="加载进度"><i :style="{ width: percent(loading.progress * 100) + '%' }" /></div><div class="castle-loading-caption"><span>{{ loading.label }}</span><b>{{ Math.round(loading.progress * 100) }}%</b></div>
      </div>
      <div v-else-if="settingsOpen" class="castle-overlay castle-settings-backdrop" @click.self="closeSettings">
        <div class="castle-settings" role="dialog" aria-modal="true" aria-labelledby="castle-settings-title">
          <header><h2 id="castle-settings-title">设置</h2><button class="castle-icon" type="button" title="关闭设置" aria-label="关闭设置" @click="closeSettings"><X :size="19" /></button></header>
          <div class="castle-setting-row"><span>画质</span><div class="castle-quality" role="group" aria-label="画质"><button type="button" :aria-pressed="state.quality === 'balanced'" :class="{ active: state.quality === 'balanced' }" @click="setQuality('balanced')">均衡</button><button type="button" :aria-pressed="state.quality === 'high'" :class="{ active: state.quality === 'high' }" @click="setQuality('high')">精细</button></div></div>
          <div class="castle-setting-row"><span>音效</span><button class="castle-toggle" type="button" role="switch" :aria-checked="!state.muted" :class="{ active: !state.muted }" aria-label="音效" @click="toggleMuted"><i /></button></div>
          <button class="castle-command castle-settings-done" type="button" @click="closeSettings"><Check :size="17" />完成</button>
        </div>
      </div>
      <div v-else-if="state.phase === 'ready'" class="castle-overlay castle-intro">
        <p class="castle-kicker">LUXIXI · 作品 002</p><h1>灰烬钟庭</h1><div class="castle-title-rule" aria-hidden="true"><span /><Shield :size="15" /><span /></div><p class="castle-game-title">古堡战斗小游戏</p><button class="castle-command castle-begin" type="button" @click="start">踏入钟庭<ChevronRight :size="18" /></button>
      </div>
      <div v-else-if="state.phase === 'paused'" class="castle-overlay castle-paused" role="dialog" aria-modal="true" aria-labelledby="castle-paused-title">
        <p class="castle-kicker">灰烬钟庭</p><h1 id="castle-paused-title">片刻休憩</h1><div class="castle-pause-actions"><button class="castle-command" type="button" @click="resume"><Play :size="17" />继续征途</button><button class="castle-secondary" type="button" @click="restart"><RotateCcw :size="15" />重新挑战</button><button class="castle-secondary" type="button" @click="back"><ArrowLeft :size="15" />返回作品集</button></div>
      </div>
      <div v-else-if="state.phase === 'dead'" class="castle-overlay castle-death" role="dialog" aria-modal="true" aria-labelledby="castle-death-title">
        <p class="castle-kicker">余烬未熄</p><h1 id="castle-death-title">你已倒下</h1><p class="castle-end-detail">已击败 {{ state.kills }} 位守卫</p><button class="castle-command" type="button" @click="restart"><RotateCcw :size="17" />再次挑战</button><button class="castle-secondary" type="button" @click="back"><ArrowLeft :size="15" />返回作品集</button>
      </div>
      <div v-else-if="state.phase === 'victory'" class="castle-overlay castle-victory" role="dialog" aria-modal="true" aria-labelledby="castle-victory-title">
        <span class="castle-victory-seal"><Shield :size="32" /></span><p class="castle-kicker">钟庭重归寂静</p><h1 id="castle-victory-title">通关成功</h1><div class="castle-results"><div><span>击败守卫</span><b>{{ state.kills }}<small> / {{ state.total }}</small></b></div><i /><div><span>征途用时</span><b>{{ elapsedTime }}</b></div></div><button class="castle-command" type="button" @click="restart"><RotateCcw :size="17" />再次挑战</button><button class="castle-secondary" type="button" @click="back"><ArrowLeft :size="15" />返回作品集</button>
      </div>
    </Transition>

    <Transition name="castle-fade"><div v-if="notice" class="castle-notice" role="status">{{ notice }}</div></Transition>
    <div v-if="!hasRun && loaded && !failure" class="castle-chapter" aria-hidden="true"><span>II</span><i />ASHEN SANCTUARY</div>
  </div>
</template>

<style scoped>
.castle-battle{--castle-ink:#f0eadc;--castle-muted:#b1b5ab;--castle-gold:#c7b887;--castle-line:#b6b7a72e;position:fixed;inset:0;width:100%;height:100%;height:100dvh;overflow:hidden;background:#111515;color:var(--castle-ink);font:13px/1.4 "Microsoft YaHei","PingFang SC",sans-serif;isolation:isolate;letter-spacing:0;touch-action:none;user-select:none}
.castle-battle *{box-sizing:border-box;letter-spacing:0}
.castle-canvas{position:absolute;inset:0;display:block;width:100%;height:100%;outline:none;touch-action:none}
.castle-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#060b0b94 0,transparent 29%,transparent 67%,#080b0d8a 100%);z-index:1}
.castle-battle button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.castle-battle button:focus-visible{outline:2px solid #e0d4aa;outline-offset:5px}
.castle-battle button:disabled{cursor:default;opacity:.34}
.castle-battle h1,.castle-battle h2,.castle-battle p{margin:0}
.castle-topbar{position:absolute;z-index:20;inset:0 0 auto;display:flex;align-items:center;gap:17px;height:82px;padding:0 32px;border:none;background:none}
.castle-icon{width:36px;height:36px;display:inline-grid;place-items:center;flex:none;border:1px solid transparent;border-radius:3px;background:#10171545;color:#dedfcf;transition:color .2s,background .2s,border-color .2s}
.castle-icon:hover:not(:disabled){color:#fff5d0;background:#b6b7a718;border-color:#b6b7a739}
.castle-back{border-color:#b6b7a736}
.castle-location{display:flex;align-items:baseline;gap:13px;font-size:10px;color:#e1e2d19e}
.castle-location b{font:14px "Songti SC","Noto Serif CJK SC","SimSun",serif;color:var(--castle-ink);padding-left:13px;border-left:1px solid #b6b7a741}
.castle-tools{display:flex;align-items:center;gap:5px;margin-left:auto}
.castle-hud{position:absolute;inset:104px 40px auto;z-index:4;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none}
.castle-vitals{width:280px;max-width:44vw}
.castle-character{display:flex;align-items:center;gap:11px;margin-bottom:13px}
.castle-character-sigil{display:grid;place-items:center;width:34px;height:34px;border:1px solid #c2ba8d63;transform:rotate(45deg);color:#d2c999;background:#1e272690}
.castle-character-sigil svg{transform:rotate(-45deg)}
.castle-character div{display:flex;align-items:baseline;gap:11px}
.castle-character b{font:16px "Songti SC","SimSun",serif;font-weight:400}
.castle-character div span{font-size:10px;color:#c4c8b294}
.castle-meter{display:flex;align-items:center;gap:8px;height:13px;color:#ae9b89}
.castle-meter>div{height:7px;flex:1;border:1px solid #d4c9a634;padding:1px;background:#030706b8;box-shadow:0 1px 6px #0006}
.castle-meter i{display:block;height:100%;transition:width .2s linear;background:#b44542;box-shadow:0 0 6px #9e3f3a38}
.castle-meter>span{width:23px;font:10px Georgia,serif;color:#dbc5bc;text-align:right;font-variant-numeric:tabular-nums}
.castle-meter--stamina{width:79%;color:#93a982}
.castle-meter--stamina>div{height:5px;padding:0}
.castle-meter--stamina i{background:#8eab79}
.castle-meter--critical i{background:#f06052}
.castle-objective{display:flex;align-items:flex-start;gap:13px;color:var(--castle-gold);padding:3px 0 0 22px;border-left:1px solid #b6b7a744;text-shadow:0 2px 8px #000}
.castle-objective svg{margin-top:4px}
.castle-objective div{display:flex;flex-direction:column;gap:1px}
.castle-objective span{font-size:10px;color:#d6d9c9bf}
.castle-objective b{font:28px/1.2 Georgia,"Times New Roman",serif;color:#e7e1c6;font-variant-numeric:tabular-nums}
.castle-objective small{font-size:13px;color:#a8b3a8}
.castle-target{position:absolute;z-index:5;top:100px;left:50%;width:230px;transform:translateX(-50%);pointer-events:none}
.castle-target>div:first-child{display:flex;align-items:center;justify-content:center;gap:7px;margin-bottom:9px;font-size:11px;color:#efe7cd;text-shadow:0 2px 5px #000}
.castle-target-meter{height:5px;background:#100d0cc9;border:1px solid #a8997759;padding:1px}
.castle-target-meter i{display:block;height:100%;background:#bd654f;transition:width .15s}
.castle-combat-tools{position:absolute;z-index:6;bottom:39px;left:40px;display:flex;align-items:center;gap:13px}
.castle-flask{position:relative;display:grid;place-items:center;width:63px;height:68px;border:1px solid #beb38568;background:#111a17a1;border-radius:4px;color:#decc9e}
.castle-flask span{position:absolute;bottom:3px;right:7px;font:15px Georgia,serif;color:#f2e9d3}
.castle-flask:hover:not(:disabled){background:#31382e99;border-color:#cfbc88}
.castle-lock{width:42px;height:42px;background:#0e181778;border-color:#a5afaa3d;color:#b9c3b7}
.castle-lock--active{color:#eed4a1;border-color:#c3b27b}
.castle-overlay{position:absolute;z-index:10;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:90px 24px 60px;overflow-y:auto;background:#050c0c62}
.castle-overlay h1{font:46px/1.3 "Songti SC","Noto Serif CJK SC","SimSun",Georgia,serif;font-weight:400;color:#efe9d9;text-shadow:0 3px 22px #0009}
.castle-kicker{color:var(--castle-gold);font-size:11px;margin-bottom:22px!important}
.castle-title-rule{display:flex;align-items:center;gap:17px;color:#c7b88799;margin:26px 0 19px}
.castle-title-rule span{display:block;width:58px;height:1px;background:#c7b88766}
.castle-intro{padding-top:14vh;background:linear-gradient(90deg,#03090820,#04090838,#03090820)}
.castle-intro h1{font-size:68px}
.castle-game-title{font-size:12px;color:#e5e0cfbd}
.castle-command{display:flex;align-items:center;justify-content:center;gap:13px;min-width:190px;min-height:47px;padding:12px 24px;border:1px solid #c8b67c99;border-radius:2px;background:#141c16ba;color:#ece0b7;box-shadow:0 3px 20px #0002;transition:background .2s,border-color .2s,box-shadow .2s}
.castle-command:hover{background:#4c503acf;border-color:#e8d596;box-shadow:0 0 24px #c2b78019}
.castle-begin{margin-top:42px;background:#19231bc7}
.castle-begin svg{margin-left:18px}
.castle-secondary{display:flex;align-items:center;justify-content:center;gap:9px;min-height:36px;margin-top:13px;border:none;border-radius:2px;background:transparent;color:#cccab8;font-size:12px}
.castle-secondary:hover{color:#fff0c0;background:#d5d0aa0b}
.castle-chapter{position:absolute;z-index:12;bottom:29px;right:34px;display:flex;align-items:center;gap:13px;font:9px Georgia,"Times New Roman",serif;color:#dfdac080;pointer-events:none}
.castle-chapter span{font-size:18px;color:#c9bc90}
.castle-chapter i{width:25px;height:1px;background:#c7b8875c}
.castle-loading{background:#101817ba}
.castle-loading h1{font-size:29px}
.castle-loading-seal{color:#b9b087;border:1px solid #c4bd9454;width:58px;height:58px;display:grid;place-items:center;transform:rotate(45deg);margin-bottom:36px;animation:castle-breathe 2s ease-in-out infinite}
.castle-loading-seal svg{transform:rotate(-45deg)}
.castle-loading .castle-kicker{margin-bottom:12px!important}
.castle-loading-track{width:280px;max-width:75vw;height:2px;background:#c7b8872b;margin-top:38px;text-align:left;overflow:hidden}
.castle-loading-track i{display:block;height:100%;background:#c7b887;transition:width .3s}
.castle-loading-caption{display:flex;justify-content:space-between;width:280px;max-width:75vw;gap:10px;margin-top:13px;font-size:10px;color:#d0d3bf94;text-align:left}
.castle-loading-caption b{font-weight:400;color:#d5ccaa;font-variant-numeric:tabular-nums}
.castle-settings-backdrop{background:#060c0db8;backdrop-filter:blur(5px)}
.castle-settings{width:350px;max-width:100%;padding:22px 26px 27px;background:#17201dea;border:1px solid #9da48758;border-radius:4px;text-align:left;box-shadow:0 20px 80px #0004}
.castle-settings header{display:flex;align-items:center;justify-content:space-between;padding-bottom:17px;border-bottom:1px solid var(--castle-line)}
.castle-settings h2{font:23px "Songti SC","SimSun",serif;color:#e4ddc5}
.castle-setting-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px 0;border-bottom:1px solid var(--castle-line);font-size:12px;color:#d0d4c5}
.castle-quality{display:flex;padding:3px;gap:3px;background:#0a121173;border:1px solid #9da4874d;border-radius:3px}
.castle-quality button{width:60px;height:30px;padding:0;border:0;border-radius:2px;background:transparent;color:#899c8f;font-size:11px}
.castle-quality button.active{background:#bbb487;color:#19221a}
.castle-toggle{width:40px;height:22px;padding:3px;border:1px solid #83978955;border-radius:13px;background:#29352f}
.castle-toggle i{display:block;width:14px;height:14px;border-radius:50%;background:#718275;transition:transform .2s,background .2s}
.castle-toggle.active{background:#bac08b}
.castle-toggle.active i{transform:translateX(17px);background:#243328}
.castle-settings-done{margin-top:26px;min-width:0;width:100%;min-height:41px}
.castle-paused{background:#050a0a8c;backdrop-filter:blur(3px)}
.castle-pause-actions{display:flex;flex-direction:column;align-items:center;margin-top:37px}
.castle-death{background:linear-gradient(#110b0b69,#230f1199,#0b0c0de0)}
.castle-death h1{color:#c8736a;font-size:58px}
.castle-death .castle-kicker{color:#aa8f7b}
.castle-end-detail{color:#beada4;font-size:12px;margin:21px 0 34px!important}
.castle-victory{background:linear-gradient(#08131269,#10221b8f,#0b1415e3)}
.castle-victory-seal{width:64px;height:64px;display:grid;place-items:center;border:1px solid #c3b57d78;color:#ddce9b;transform:rotate(45deg);margin-bottom:37px}
.castle-victory-seal svg{transform:rotate(-45deg)}
.castle-victory .castle-kicker{margin-bottom:16px!important}
.castle-victory h1{color:#e2d3a1;font-size:55px}
.castle-results{display:flex;align-items:center;gap:35px;margin:31px 0}
.castle-results>div{display:flex;flex-direction:column;gap:10px;min-width:82px}
.castle-results span{font-size:10px;color:#bcc7ae}
.castle-results b{font:24px Georgia,"Times New Roman",serif;color:#e2dec1;font-variant-numeric:tabular-nums}
.castle-results small{font-size:13px;color:#899d8f}
.castle-results>i{width:1px;height:35px;background:#aaa88852}
.castle-error{background:#101615d9}
.castle-error>svg{color:#c78f7e;margin-bottom:24px}
.castle-error h1{font-size:34px}
.castle-error-message{max-width:450px;overflow-wrap:anywhere;font-size:12px;line-height:1.7;color:#b6bba9;margin:22px 0 30px!important;user-select:text}
.castle-notice{position:absolute;z-index:30;bottom:28px;left:50%;transform:translateX(-50%);padding:11px 18px;background:#14201df2;border:1px solid #a5ab875c;border-radius:3px;color:#dedac5;font-size:12px;max-width:calc(100% - 40px);text-align:center}
.castle-touch{display:none;position:absolute;inset:0;z-index:7;pointer-events:none}
.castle-look{position:absolute;inset:190px 0 0 35%;pointer-events:auto;touch-action:none}
.castle-joystick{position:absolute;bottom:max(28px,env(safe-area-inset-bottom));left:max(25px,env(safe-area-inset-left));width:122px;height:122px;display:grid;place-items:center;border:1px solid #d6d5b440;border-radius:50%;background:#0c171732;pointer-events:auto;touch-action:none;box-shadow:inset 0 0 0 18px #d6d5b406}
.castle-stick-cross{position:absolute;width:50px;height:50px;border:1px solid #d5d2ac19;border-radius:50%}
.castle-joystick>i{position:relative;width:45px;height:45px;border:1px solid #d5d2ac85;border-radius:50%;background:#ced1b125;box-shadow:0 3px 20px #0003;pointer-events:none}
.castle-joystick.active{border-color:#e7dfb48c;background:#0c171751}
.castle-joystick.active>i{background:#e0d9b240}
.castle-touch-actions{position:absolute;right:max(22px,env(safe-area-inset-right));bottom:max(23px,env(safe-area-inset-bottom));width:177px;height:152px;pointer-events:none}
.castle-touch-actions button{position:absolute;display:grid;place-items:center;padding:0;border:1px solid #d3c9a76b;border-radius:50%;color:#dfd6b7;background:#1b282596;pointer-events:auto;touch-action:none;backdrop-filter:blur(3px)}
.castle-touch-actions button:active{background:#acaa735c;border-color:#e9dbab;transform:scale(.95)}
.castle-touch-attack{right:0;bottom:30px;width:74px;height:74px;border-color:#d6c89bab!important;background:#69715163!important}
.castle-touch-dodge{right:85px;bottom:0;width:57px;height:57px}
.castle-touch-heal{right:114px;bottom:75px;width:50px;height:50px}
.castle-touch-heal small{position:absolute;bottom:2px;right:8px;color:#f0e5c3;font:12px Georgia,serif}
.castle-touch-lock{right:30px;bottom:117px;width:35px;height:35px;color:#bec3ae!important}
.castle-touch-lock.active{background:#c4ba8466;border-color:#e9d9a2}
.castle-fade-enter-active,.castle-fade-leave-active{transition:opacity .24s}
.castle-fade-enter-from,.castle-fade-leave-to{opacity:0}
@keyframes castle-breathe{50%{opacity:.4}}
@media(pointer:coarse),(max-width:900px){.castle-touch{display:block}.castle-combat-tools{display:none}.castle-topbar{height:67px;padding:0 20px;gap:12px}.castle-hud{top:86px;left:25px;right:25px}.castle-target{top:159px;width:190px}.castle-character{margin-bottom:9px}.castle-location{font-size:9px}.castle-location b{font-size:13px}.castle-vitals{width:220px}.castle-overlay h1{font-size:42px}.castle-intro h1{font-size:58px}.castle-intro{padding-top:80px}.castle-victory-seal{width:46px;height:46px;margin-bottom:25px}.castle-victory-seal svg{width:25px}.castle-results{margin:24px 0}}
@media(max-width:600px){.castle-topbar{height:63px;padding:0 14px;gap:10px}.castle-location{display:flex;flex-direction:column;align-items:flex-start;gap:2px}.castle-location span{font-size:8px}.castle-location b{border:0;padding:0;font-size:12px}.castle-tools{gap:0}.castle-icon{width:32px;height:34px}.castle-fullscreen{display:none}.castle-hud{top:83px;left:19px;right:19px}.castle-vitals{width:186px;max-width:54vw}.castle-character{gap:10px;margin-bottom:9px}.castle-character-sigil{width:25px;height:25px}.castle-character-sigil svg{width:15px}.castle-character div{gap:8px}.castle-character b{font-size:14px}.castle-character div span{font-size:8px}.castle-meter{gap:6px}.castle-meter>span{font-size:9px;width:18px}.castle-objective{padding-left:11px;gap:7px}.castle-objective>svg{width:14px}.castle-objective span{font-size:9px}.castle-objective b{font-size:24px}.castle-objective small{font-size:11px}.castle-target{top:160px;width:160px}.castle-overlay{padding:80px 20px 45px}.castle-overlay h1{font-size:36px}.castle-intro h1{font-size:48px}.castle-kicker{font-size:10px;margin-bottom:18px!important}.castle-intro{padding-top:80px}.castle-begin{margin-top:33px}.castle-command{min-height:44px;min-width:180px;font-size:12px}.castle-chapter{right:22px;bottom:21px;font-size:8px}.castle-joystick{width:108px;height:108px;left:max(18px,env(safe-area-inset-left));bottom:max(30px,env(safe-area-inset-bottom))}.castle-joystick>i{width:41px;height:41px}.castle-touch-actions{right:max(16px,env(safe-area-inset-right));bottom:max(23px,env(safe-area-inset-bottom));width:166px;height:151px}.castle-touch-attack{width:66px;height:66px}.castle-touch-dodge{right:76px;width:53px;height:53px}.castle-touch-heal{right:107px;bottom:72px;width:46px;height:46px}.castle-touch-lock{right:21px;bottom:112px}.castle-look{top:185px}.castle-loading h1{font-size:25px}.castle-settings{padding:18px 22px 23px}.castle-death h1{font-size:46px}.castle-victory h1{font-size:43px}.castle-victory-seal{margin-bottom:29px}.castle-end-detail{margin:20px 0 29px!important}}
@media(max-height:560px) and (orientation:landscape){.castle-topbar{height:54px}.castle-hud{top:68px}.castle-character{margin-bottom:6px}.castle-character-sigil{width:24px;height:24px}.castle-vitals{width:210px}.castle-target{top:128px;width:160px}.castle-overlay{padding:65px 20px 20px}.castle-intro{padding-top:58px}.castle-intro h1{font-size:43px}.castle-kicker{margin-bottom:12px!important}.castle-title-rule{margin:14px 0 10px}.castle-begin{margin-top:22px}.castle-chapter{bottom:18px}.castle-look{top:130px}.castle-joystick{width:98px;height:98px;bottom:20px}.castle-joystick>i{width:37px;height:37px}.castle-touch-actions{transform:scale(.85);transform-origin:bottom right;bottom:15px}.castle-overlay h1{font-size:36px}.castle-pause-actions{margin-top:21px}.castle-secondary{margin-top:7px}.castle-victory-seal{display:none}.castle-results{margin:18px 0;gap:30px}.castle-results>div{gap:5px}.castle-results b{font-size:21px}.castle-settings{padding:12px 22px 16px}.castle-settings header{padding-bottom:6px}.castle-setting-row{padding:14px 0}.castle-settings-done{margin-top:16px}.castle-end-detail{margin:14px 0 22px!important}.castle-loading-seal{width:40px;height:40px;margin-bottom:20px}.castle-loading-track{margin-top:23px}}
@media(prefers-reduced-motion:reduce){.castle-battle *{animation:none!important;transition:none!important}}
</style>
