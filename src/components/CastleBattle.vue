<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  ArrowLeft, ArrowUpFromLine, BookOpen, Check, ChevronRight, CircleHelp, Compass, Crosshair,
  DoorOpen, FlaskConical, Footprints, Gamepad2, Heart, Keyboard, Maximize,
  Minimize, Mouse, Pause, Play, RotateCcw, Settings2, Shield, SkipForward,
  Swords, Volume2, VolumeX, X, Zap,
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
const helpOpen = ref(false)
const dialogPanel = ref(null)
const manualBody = ref(null)
const touchMode = ref(false)
const helpMode = ref('keyboard')
const tutorialSeen = ref(false)
const isFullscreen = ref(false)
const state = reactive({
  phase: 'ready', health: 100, stamina: 100, potions: 3,
  kills: 0, total: 12, elapsed: 0, locked: false,
  targetName: '', targetHealth: 0, targetMaxHealth: 100,
  muted: false, quality: 'balanced', hurt: 0,
  zone: 'courtyard', location: '钟庭花园', interactionLabel: '', tutorial: null,
  remainingHere: 8, exploring: false, canJump: false,
})
const stick = reactive({ x: 0, y: 0, active: false })
const panelOpen = computed(() => settingsOpen.value || helpOpen.value)
const hasRun = computed(() => loaded.value && state.phase !== 'ready')
const isPlaying = computed(() => loaded.value && state.phase === 'playing' && !panelOpen.value)
const enemiesLeft = computed(() => Math.max(0, state.total - state.kills))
const tutorialActive = computed(() => isPlaying.value && state.tutorial?.active)
const tutorialNumber = computed(() => Math.min(state.tutorial?.total || 6, (state.tutorial?.index || 0) + 1))
const percent = value => Math.max(0, Math.min(100, Number(value) || 0))
const targetPercent = computed(() => percent(state.targetHealth / Math.max(1, state.targetMaxHealth) * 100))
const elapsedTime = computed(() => {
  const seconds = Math.max(0, Math.floor(state.elapsed || 0))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})
const keyboardControls = [
  { icon: Footprints, name: '移动', keys: ['W', 'A', 'S', 'D'], detail: '也可使用方向键' },
  { icon: Mouse, name: '转动视角', keys: ['鼠标右键'], detail: '按住并拖动鼠标' },
  { icon: Swords, name: '攻击', keys: ['鼠标左键', 'Space'], detail: '按住可连续挥剑' },
  { icon: Zap, name: '冲刺', keys: ['Shift'], detail: '按住并移动，消耗体力' },
  { icon: Footprints, name: '闪避', keys: ['C', 'Alt'], detail: '沿移动方向翻滚' },
  { icon: ArrowUpFromLine, name: '跳跃', keys: ['V'], detail: '消耗 12 体力，落地后可再次起跳' },
  { icon: FlaskConical, name: '饮用药剂', keys: ['E'], detail: '恢复生命，每次征途 3 瓶' },
  { icon: Crosshair, name: '锁定目标', keys: ['Q'], detail: '再次按下取消锁定' },
  { icon: DoorOpen, name: '进出古堡', keys: ['F'], detail: '靠近城门时使用' },
  { icon: Pause, name: '暂停 / 继续', keys: ['P', 'Esc'], detail: '随时休息，再继续征途' },
  { icon: CircleHelp, name: '操作手册', keys: ['H'], detail: '打开或关闭此页' },
]
const touchControls = [
  { icon: Footprints, name: '移动', gesture: '左侧摇杆', detail: '拖动摇杆决定走位方向' },
  { icon: Mouse, name: '转动视角', gesture: '右侧空白处滑动', detail: '移动与转向可同时操作' },
  { icon: Swords, name: '攻击', gesture: '右侧双剑按钮', detail: '点击挥剑，连续点击衔接攻击' },
  { icon: Footprints, name: '闪避', gesture: '脚印按钮', detail: '配合摇杆，向指定方向翻滚' },
  { icon: ArrowUpFromLine, name: '跳跃', gesture: '向上箭头按钮', detail: '消耗 12 体力，落地后可再次点击' },
  { icon: FlaskConical, name: '饮用药剂', gesture: '药瓶按钮', detail: '恢复生命，瓶旁数字为剩余次数' },
  { icon: Crosshair, name: '锁定目标', gesture: '准星按钮', detail: '再次点击取消锁定' },
  { icon: DoorOpen, name: '进出古堡', gesture: '城门提示按钮', detail: '靠近城门后点击画面中的提示' },
  { icon: Pause, name: '暂停 / 继续', gesture: '右上角暂停按钮', detail: '操作手册与设置也会暂停战斗' },
]
const touchLessons = [
  { description: '拖动左下角摇杆，让艾莉娅沿庭院走动。', keys: ['左侧摇杆'] },
  { description: '在画面右侧的空白处滑动，看看身后的古堡。', keys: ['右侧滑动'] },
  { description: '点击右下角的双剑按钮，完成一次挥剑。', keys: ['双剑按钮'] },
  { description: '点击脚印按钮翻滚，配合摇杆选择方向。', keys: ['脚印按钮'] },
  { description: '点击准星按钮，锁定附近的一位守卫。', keys: ['准星按钮'] },
  { description: '走近古堡正门，点击门前提示进入王庭大殿。', keys: ['城门提示'] },
]
const tutorialLesson = computed(() => {
  const lesson = state.tutorial
  if (!lesson) return { description: '', keys: [] }
  if (!touchMode.value) return lesson
  const touchLesson = touchLessons[lesson.index] || lesson
  return { ...touchLesson, description: lesson.touchDescription || touchLesson.description }
})
const tutorialStorageKey = 'luxixi.castle.tutorial.v2'
let game
let previousTitle = ''
let disposed = false
let resumeAfterPanel = false
let previousFocus = null
let inputMedia
let stickPointer = null
let lookPointer = null
let lookPosition = { x: 0, y: 0 }
let noticeTimer
let tutorialCompleteShown = false

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
  if (next.tutorial?.completed && !tutorialSeen.value) {
    tutorialSeen.value = true
    try { localStorage.setItem(tutorialStorageKey, 'complete') } catch { /* Storage may be disabled. */ }
  }
  if (next.tutorial?.active) tutorialCompleteShown = false
  if (next.tutorial?.completed && !tutorialCompleteShown) {
    tutorialCompleteShown = true
    notify('新手引导完成，王庭试炼开始')
  }
}

function notify(message) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 2600)
}

function clearPanel() {
  settingsOpen.value = false
  helpOpen.value = false
  resumeAfterPanel = false
}

function start(tutorial = !tutorialSeen.value) {
  if (!loaded.value || failure.value) return
  clearPanel()
  game?.start({ tutorial })
}

function resume() {
  clearPanel()
  game?.resume()
}

function restart() {
  clearPanel()
  clearInput()
  game?.restart()
}

function togglePause() {
  if (!loaded.value) return
  if (panelOpen.value) closePanel()
  else if (state.phase === 'playing') game?.pause()
  else if (state.phase === 'paused') resume()
}

function openPanel(kind) {
  if (!loaded.value) return
  if (!panelOpen.value) {
    resumeAfterPanel = state.phase === 'playing'
    previousFocus = document.activeElement
  }
  settingsOpen.value = kind === 'settings'
  helpOpen.value = kind === 'help'
  clearInput()
  if (state.phase === 'playing') game?.pause()
  nextTick(focusPanel)
}

function focusPanel() {
  if (panelOpen.value) dialogPanel.value?.querySelector('button')?.focus()
}

function closePanel() {
  const shouldResume = resumeAfterPanel
  clearPanel()
  if (shouldResume && state.phase === 'paused') game?.resume()
  if (previousFocus?.isConnected) previousFocus.focus?.()
  previousFocus = null
}

function replayTutorial() {
  clearPanel()
  clearInput()
  if (state.phase === 'ready') game?.start({ tutorial: true })
  else game?.replayTutorial()
}

function explore() {
  clearPanel()
  game?.explore()
}

function inputModeChanged() {
  touchMode.value = inputMedia.matches
  selectHelpMode(touchMode.value ? 'touch' : 'keyboard')
}

function selectHelpMode(mode) {
  helpMode.value = mode
  nextTick(() => {
    if (manualBody.value) manualBody.value.scrollTop = 0
  })
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
  if (event.code === 'KeyH' && loaded.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (!event.repeat) helpOpen.value ? closePanel() : openPanel('help')
    return
  }
  if (!panelOpen.value) return
  event.stopImmediatePropagation()
  if (event.code === 'Escape' || event.code === 'KeyP') {
    event.preventDefault()
    if (!event.repeat) closePanel()
    return
  }
  if (event.code === 'Tab') {
    const controls = [...(dialogPanel.value?.querySelectorAll('button:not(:disabled), [tabindex="0"]') || [])]
    const first = controls[0]
    const last = controls.at(-1)
    if (!dialogPanel.value?.contains(document.activeElement)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first)?.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
}

function menuKeyup(event) {
  if (panelOpen.value) event.stopImmediatePropagation()
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
  try { tutorialSeen.value = localStorage.getItem(tutorialStorageKey) === 'complete' } catch { /* Storage may be disabled. */ }
  inputMedia = window.matchMedia('(pointer: coarse), (max-width: 900px)')
  inputModeChanged()
  inputMedia.addEventListener('change', inputModeChanged)
  document.addEventListener('fullscreenchange', fullscreenChanged)
  window.addEventListener('keydown', menuKeydown, true)
  window.addEventListener('keyup', menuKeyup, true)
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
  window.removeEventListener('keyup', menuKeyup, true)
  inputMedia?.removeEventListener('change', inputModeChanged)
  clearInput()
  game?.dispose()
})
</script>

<template>
  <div ref="root" class="castle-battle" :class="{ 'castle-battle--playing': isPlaying, 'castle-battle--tutorial': tutorialActive, 'castle-battle--interior': state.zone === 'interior' }">
    <canvas ref="canvas" class="castle-canvas" aria-label="古堡战斗三维场景" @contextmenu.prevent />
    <div class="castle-shade" aria-hidden="true" />
    <div class="castle-hurt" :style="{ opacity: Math.min(1, Math.max(0, Number(state.hurt) || 0)) }" aria-hidden="true" />

    <header class="castle-topbar">
      <button class="castle-icon castle-back" type="button" title="返回作品集" aria-label="返回作品集" @click="back"><ArrowLeft :size="20" /></button>
      <div class="castle-location"><span>灰烬钟庭</span><b>{{ hasRun ? state.location : '古堡战斗小游戏' }}</b></div>
      <div class="castle-tools">
        <button v-if="hasRun && ['playing', 'paused'].includes(state.phase)" class="castle-icon" type="button" :title="state.phase === 'paused' ? '继续' : '暂停'" :aria-label="state.phase === 'paused' ? '继续' : '暂停'" @click="togglePause"><Play v-if="state.phase === 'paused'" :size="18" /><Pause v-else :size="18" /></button>
        <button class="castle-icon" type="button" :title="state.muted ? '开启音效' : '关闭音效'" :aria-label="state.muted ? '开启音效' : '关闭音效'" :disabled="!loaded" @click="toggleMuted"><VolumeX v-if="state.muted" :size="18" /><Volume2 v-else :size="18" /></button>
        <button class="castle-icon castle-fullscreen" type="button" :title="isFullscreen ? '退出全屏' : '全屏'" :aria-label="isFullscreen ? '退出全屏' : '全屏'" @click="toggleFullscreen"><Minimize v-if="isFullscreen" :size="18" /><Maximize v-else :size="18" /></button>
        <button class="castle-icon" :class="{ 'castle-icon--selected': helpOpen }" type="button" title="操作手册 (H)" aria-label="操作手册" :disabled="!loaded" @click="helpOpen ? closePanel() : openPanel('help')"><CircleHelp :size="18" /></button>
        <button class="castle-icon" :class="{ 'castle-icon--selected': settingsOpen }" type="button" title="设置" aria-label="设置" :disabled="!loaded" @click="settingsOpen ? closePanel() : openPanel('settings')"><Settings2 :size="18" /></button>
      </div>
    </header>

    <div v-if="hasRun" class="castle-hud" aria-label="战斗状态">
      <div class="castle-vitals">
        <div class="castle-character"><span class="castle-character-sigil"><Shield :size="19" /></span><div><b>艾莉娅</b><span>余烬行者</span></div></div>
        <div class="castle-meter castle-meter--health" :class="{ 'castle-meter--critical': state.health <= 25 }" role="progressbar" :aria-valuenow="Math.round(state.health)" aria-valuemin="0" aria-valuemax="100" aria-label="生命值"><Heart :size="12" /><div><i :style="{ width: percent(state.health) + '%' }" /></div><span>{{ Math.ceil(state.health) }}</span></div>
        <div class="castle-meter castle-meter--stamina" role="progressbar" :aria-valuenow="Math.round(state.stamina)" aria-valuemin="0" aria-valuemax="100" aria-label="体力"><Zap :size="12" /><div><i :style="{ width: percent(state.stamina) + '%' }" /></div></div>
      </div>
      <div class="castle-objective"><Shield :size="17" /><div><span>{{ state.exploring ? '自由探索' : enemiesLeft ? `本区 ${state.remainingHere} · 全堡剩余` : '古堡已肃清' }}</span><b>{{ String(enemiesLeft).padStart(2, '0') }}<small> / {{ String(state.total).padStart(2, '0') }}</small></b></div></div>
    </div>

    <div v-if="isPlaying && state.locked && state.targetName" class="castle-target" aria-label="锁定目标">
      <div><Crosshair :size="12" /><span>{{ state.targetName }}</span></div>
      <div class="castle-target-meter" role="progressbar" :aria-valuenow="Math.round(state.targetHealth)" aria-valuemin="0" :aria-valuemax="state.targetMaxHealth" aria-label="敌人生命值"><i :style="{ width: targetPercent + '%' }" /></div>
    </div>

    <aside v-if="tutorialActive" class="castle-tutorial" aria-label="新手引导" aria-live="polite">
      <div class="castle-tutorial-heading"><span><BookOpen :size="14" />初行者的试炼</span><b>{{ String(tutorialNumber).padStart(2, '0') }}<i> / {{ String(state.tutorial.total).padStart(2, '0') }}</i></b></div>
      <div class="castle-tutorial-progress" aria-hidden="true"><i v-for="step in state.tutorial.total" :key="step" :class="{ complete: step < tutorialNumber, active: step === tutorialNumber }" /></div>
      <h2>{{ state.tutorial.title }}</h2>
      <p>{{ tutorialLesson.description }}</p>
      <div class="castle-tutorial-footer"><span class="castle-keyset"><kbd v-for="key in tutorialLesson.keys" :key="key">{{ key }}</kbd></span><button class="castle-text-command" type="button" title="跳过新手引导" @click="game?.skipTutorial()">跳过<SkipForward :size="12" /></button></div>
      <div class="castle-tutorial-safety"><Shield :size="11" /><span>引导期间不会受到伤害</span></div>
    </aside>

    <button v-if="isPlaying && state.interactionLabel" class="castle-interaction" type="button" @click="game?.interact()"><kbd v-if="!touchMode">F</kbd><DoorOpen v-else :size="19" /><span>{{ state.interactionLabel }}</span><ChevronRight :size="15" /></button>
    <button v-if="isPlaying && !touchMode" class="castle-help-shortcut" type="button" @click="openPanel('help')"><kbd>H</kbd><span>操作手册</span></button>

    <div v-if="isPlaying" class="castle-combat-tools">
      <button class="castle-flask" type="button" title="饮用药剂 (E)" aria-label="饮用药剂" :disabled="state.potions <= 0 || state.health >= 100" @click="game?.heal()"><FlaskConical :size="27" /><span>{{ state.potions }}</span></button>
      <button class="castle-icon castle-lock" type="button" title="攻击 (鼠标左键 / Space)" aria-label="攻击" :disabled="state.stamina < 18" @click="game?.attack()"><Swords :size="21" /></button>
      <button class="castle-icon castle-lock" type="button" title="闪避 (C / Alt)" aria-label="闪避" :disabled="state.stamina < 24" @click="game?.dodge()"><Footprints :size="21" /></button>
      <button class="castle-icon castle-lock" type="button" title="跳跃 (V)，消耗 12 体力" aria-label="跳跃" :disabled="!state.canJump" @click="game?.jump()"><ArrowUpFromLine :size="21" /></button>
      <button class="castle-icon castle-lock" :class="{ 'castle-lock--active': state.locked }" type="button" title="锁定目标 (Q)" aria-label="锁定目标" :aria-pressed="state.locked" @click="game?.toggleLock()"><Crosshair :size="21" /></button>
    </div>

    <div v-if="isPlaying" class="castle-touch">
      <div class="castle-look" aria-label="转动视角" @pointerdown.stop.prevent="lookDown" @pointermove.stop.prevent="lookMove" @pointerup.stop.prevent="lookUp" @pointercancel.stop.prevent="lookUp" />
      <div class="castle-joystick" :class="{ active: stick.active }" role="group" aria-label="移动摇杆" @pointerdown.stop.prevent="stickDown" @pointermove.stop.prevent="stickMove" @pointerup.stop.prevent="stickUp" @pointercancel.stop.prevent="stickUp"><span class="castle-stick-cross" /><i :style="{ transform: `translate(${stick.x}px, ${stick.y}px)` }" /></div>
      <div class="castle-touch-actions">
        <button class="castle-touch-heal" type="button" title="饮用药剂" aria-label="饮用药剂" :disabled="state.potions <= 0 || state.health >= 100" @pointerdown.stop.prevent="game?.heal()"><FlaskConical :size="22" /><small>{{ state.potions }}</small></button>
        <button class="castle-touch-dodge" type="button" title="闪避" aria-label="闪避" :disabled="state.stamina < 24" @pointerdown.stop.prevent="game?.dodge()"><Footprints :size="25" /></button>
        <button class="castle-touch-attack" type="button" title="攻击" aria-label="攻击" @pointerdown.stop.prevent="game?.attack()"><Swords :size="31" /></button>
        <button class="castle-touch-jump" type="button" title="跳跃，消耗 12 体力" aria-label="跳跃" :disabled="!state.canJump" @pointerdown.stop.prevent="game?.jump()"><ArrowUpFromLine :size="24" /></button>
        <button class="castle-touch-lock" :class="{ active: state.locked }" type="button" title="锁定目标" aria-label="锁定目标" :aria-pressed="state.locked" @pointerdown.stop.prevent="game?.toggleLock()"><Crosshair :size="20" /></button>
      </div>
    </div>

    <Transition name="castle-fade" mode="out-in" @after-enter="focusPanel">
      <div v-if="failure" class="castle-overlay castle-error" role="alert">
        <CircleHelp :size="30" /><p class="castle-kicker">钟庭暂未苏醒</p><h1>无法进入古堡</h1><p class="castle-error-message">{{ failure }}</p><button class="castle-command" type="button" @click="back"><ArrowLeft :size="17" />返回作品集</button>
      </div>
      <div v-else-if="!loaded" class="castle-overlay castle-loading" role="status" aria-live="polite">
        <span class="castle-loading-seal"><Shield :size="25" /></span><p class="castle-kicker">灰烬钟庭</p><h1>古堡战斗小游戏</h1><div class="castle-loading-track" role="progressbar" :aria-valuenow="Math.round(loading.progress * 100)" aria-valuemin="0" aria-valuemax="100" aria-label="加载进度"><i :style="{ width: percent(loading.progress * 100) + '%' }" /></div><div class="castle-loading-caption"><span>{{ loading.label }}</span><b>{{ Math.round(loading.progress * 100) }}%</b></div>
      </div>
      <div v-else-if="settingsOpen" class="castle-overlay castle-settings-backdrop" @click.self="closePanel">
        <div ref="dialogPanel" class="castle-settings" role="dialog" aria-modal="true" aria-labelledby="castle-settings-title">
          <header><h2 id="castle-settings-title">设置</h2><button class="castle-icon" type="button" title="关闭设置" aria-label="关闭设置" @click="closePanel"><X :size="19" /></button></header>
          <div class="castle-setting-row"><span>画质</span><div class="castle-quality" role="group" aria-label="画质"><button type="button" :aria-pressed="state.quality === 'balanced'" :class="{ active: state.quality === 'balanced' }" @click="setQuality('balanced')">均衡</button><button type="button" :aria-pressed="state.quality === 'high'" :class="{ active: state.quality === 'high' }" @click="setQuality('high')">精细</button></div></div>
          <div class="castle-setting-row"><span>音效</span><button class="castle-toggle" type="button" role="switch" :aria-checked="!state.muted" :class="{ active: !state.muted }" aria-label="音效" @click="toggleMuted"><i /></button></div>
          <button class="castle-command castle-settings-done" type="button" @click="closePanel"><Check :size="17" />完成</button>
        </div>
      </div>
      <div v-else-if="helpOpen" class="castle-overlay castle-settings-backdrop castle-help-backdrop" @click.self="closePanel">
        <div ref="dialogPanel" class="castle-help" role="dialog" aria-modal="true" aria-labelledby="castle-help-title">
          <header class="castle-help-heading"><div><span>行者手记</span><h2 id="castle-help-title">操作手册</h2></div><button class="castle-icon" type="button" title="关闭操作手册 (H / Esc)" aria-label="关闭操作手册" @click="closePanel"><X :size="20" /></button></header>
          <div class="castle-help-modes" role="tablist" aria-label="操作方式"><button id="castle-keyboard-tab" type="button" role="tab" :aria-selected="helpMode === 'keyboard'" aria-controls="castle-controls" :class="{ active: helpMode === 'keyboard' }" @click="selectHelpMode('keyboard')"><Keyboard :size="17" />键盘与鼠标</button><button id="castle-touch-tab" type="button" role="tab" :aria-selected="helpMode === 'touch'" aria-controls="castle-controls" :class="{ active: helpMode === 'touch' }" @click="selectHelpMode('touch')"><Gamepad2 :size="17" />触屏操作</button></div>
          <div ref="manualBody" class="castle-manual-body">
            <div id="castle-controls" class="castle-control-grid" role="tabpanel" :aria-labelledby="helpMode === 'keyboard' ? 'castle-keyboard-tab' : 'castle-touch-tab'">
              <div v-for="control in helpMode === 'keyboard' ? keyboardControls : touchControls" :key="control.name" class="castle-control-row"><component :is="control.icon" :size="17" /><div><b>{{ control.name }}</b><p>{{ control.detail }}</p></div><span v-if="control.keys" class="castle-keyset"><kbd v-for="key in control.keys" :key="key">{{ key }}</kbd></span><span v-else class="castle-gesture">{{ control.gesture }}</span></div>
            </div>
            <div class="castle-help-mission"><Compass :size="19" /><p>肃清庭院与王庭大殿中的全部守卫，即可通关。靠近古堡正门进出室内；通关后仍可继续探索。</p></div>
          </div>
          <footer class="castle-help-footer"><button class="castle-secondary" type="button" @click="replayTutorial"><RotateCcw :size="15" />重新进行新手引导</button><button class="castle-command" type="button" @click="closePanel"><Check :size="16" />{{ resumeAfterPanel ? '返回游戏' : '知道了' }}</button></footer>
        </div>
      </div>
      <div v-else-if="state.phase === 'ready'" class="castle-overlay castle-intro">
        <p class="castle-kicker">LUXIXI · 作品 002</p><h1>灰烬钟庭</h1><div class="castle-title-rule" aria-hidden="true"><span /><Shield :size="15" /><span /></div><p class="castle-game-title">古堡战斗小游戏</p><button class="castle-command castle-begin" type="button" @click="start(!tutorialSeen)">{{ tutorialSeen ? '踏入钟庭' : '新手启程' }}<ChevronRight :size="18" /></button><button class="castle-secondary" type="button" @click="start(tutorialSeen)"><component :is="tutorialSeen ? BookOpen : Swords" :size="15" />{{ tutorialSeen ? '重温新手引导' : '直接挑战' }}</button><button class="castle-intro-manual" type="button" @click="openPanel('help')"><CircleHelp :size="14" />操作手册<kbd v-if="!touchMode">H</kbd></button>
      </div>
      <div v-else-if="state.phase === 'paused'" class="castle-overlay castle-paused" role="dialog" aria-modal="true" aria-labelledby="castle-paused-title">
        <p class="castle-kicker">{{ state.location }}</p><h1 id="castle-paused-title">片刻休憩</h1><div class="castle-pause-actions"><button class="castle-command" type="button" @click="resume"><Play :size="17" />继续征途</button><button class="castle-secondary" type="button" @click="openPanel('help')"><BookOpen :size="15" />操作手册与新手引导</button><button class="castle-secondary" type="button" @click="restart"><RotateCcw :size="15" />重新挑战</button><button class="castle-secondary" type="button" @click="back"><ArrowLeft :size="15" />返回作品集</button></div>
      </div>
      <div v-else-if="state.phase === 'dead'" class="castle-overlay castle-death" role="dialog" aria-modal="true" aria-labelledby="castle-death-title">
        <p class="castle-kicker">余烬未熄</p><h1 id="castle-death-title">你已倒下</h1><p class="castle-end-detail">已击败 {{ state.kills }} 位守卫</p><button class="castle-command" type="button" @click="restart"><RotateCcw :size="17" />再次挑战</button><button class="castle-secondary" type="button" @click="back"><ArrowLeft :size="15" />返回作品集</button>
      </div>
      <div v-else-if="state.phase === 'victory'" class="castle-overlay castle-victory" role="dialog" aria-modal="true" aria-labelledby="castle-victory-title">
        <span class="castle-victory-seal"><Shield :size="32" /></span><p class="castle-kicker">钟庭重归寂静</p><h1 id="castle-victory-title">通关成功</h1><div class="castle-results"><div><span>击败守卫</span><b>{{ state.kills }}<small> / {{ state.total }}</small></b></div><i /><div><span>征途用时</span><b>{{ elapsedTime }}</b></div></div><button class="castle-command" type="button" @click="explore"><Compass :size="17" />继续探索</button><button class="castle-secondary" type="button" @click="restart"><RotateCcw :size="15" />再次挑战</button><button class="castle-secondary" type="button" @click="back"><ArrowLeft :size="15" />返回作品集</button>
      </div>
    </Transition>

    <Transition name="castle-fade"><div v-if="notice" class="castle-notice" role="status">{{ notice }}</div></Transition>
    <div v-if="!hasRun && loaded && !failure && !panelOpen" class="castle-chapter" aria-hidden="true"><span>II</span><i />ASHEN SANCTUARY</div>
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
.castle-touch-actions{position:absolute;right:max(22px,env(safe-area-inset-right));bottom:max(23px,env(safe-area-inset-bottom));width:177px;height:175px;pointer-events:none}
.castle-touch-actions button{position:absolute;display:grid;place-items:center;padding:0;border:1px solid #d3c9a76b;border-radius:50%;color:#dfd6b7;background:#1b282596;pointer-events:auto;touch-action:none;backdrop-filter:blur(3px)}
.castle-touch-actions button:active{background:#acaa735c;border-color:#e9dbab;transform:scale(.95)}
.castle-touch-attack{right:0;bottom:30px;width:74px;height:74px;border-color:#d6c89bab!important;background:#69715163!important}
.castle-touch-dodge{right:85px;bottom:0;width:57px;height:57px}
.castle-touch-heal{right:114px;bottom:75px;width:50px;height:50px}
.castle-touch-heal small{position:absolute;bottom:2px;right:8px;color:#f0e5c3;font:12px Georgia,serif}
.castle-touch-jump{right:0;bottom:125px;width:50px;height:50px}
.castle-touch-lock{right:78px;bottom:117px;width:35px;height:35px;color:#bec3ae!important}
.castle-touch-lock.active{background:#c4ba8466;border-color:#e9d9a2}
.castle-fade-enter-active,.castle-fade-leave-active{transition:opacity .24s}
.castle-fade-enter-from,.castle-fade-leave-to{opacity:0}
.castle-hurt{position:absolute;inset:0;z-index:3;pointer-events:none;background:#831e1b0d;box-shadow:inset 0 0 120px #b3312a88;transition:opacity .08s linear}
.castle-icon--selected{border-color:#d1c28c80;background:#8c8d663b;color:#f3e5b7}
.castle-location{min-width:0}
.castle-location b{white-space:nowrap}
.castle-battle kbd{display:inline-flex;align-items:center;justify-content:center;min-width:24px;min-height:25px;padding:3px 6px;border:1px solid #bbc4b04d;border-bottom-width:2px;border-radius:3px;background:#06110ed4;color:#e2e7d1;font:11px/1.25 Consolas,"Microsoft YaHei",monospace;white-space:nowrap}
.castle-keyset{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.castle-tutorial{position:absolute;z-index:8;left:40px;top:232px;width:302px;max-width:calc(100% - 48px);padding:17px 18px 13px;border:1px solid #c6c3a643;border-left:2px solid #b4b07c;border-radius:3px;background:#10201de8;box-shadow:0 8px 30px #0002;backdrop-filter:blur(8px);text-align:left}
.castle-tutorial-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#d1c591;font-size:10px}
.castle-tutorial-heading>span{display:flex;align-items:center;gap:7px}
.castle-tutorial-heading>b{flex:none;font:13px Georgia,serif;color:#e3d6a6}
.castle-tutorial-heading i{font-style:normal;font-size:11px;color:#8c9e90}
.castle-tutorial-progress{display:flex;gap:4px;margin:12px 0 15px}
.castle-tutorial-progress i{flex:1;height:2px;background:#84988836}
.castle-tutorial-progress i.complete{background:#7f9d80}
.castle-tutorial-progress i.active{background:#dbc891}
.castle-tutorial h2{font:20px/1.35 "Songti SC","SimSun",serif;font-weight:400;color:#f0e6c9}
.castle-tutorial p{min-height:42px;margin:9px 0 12px;color:#c2cec0;font-size:12px;line-height:1.75}
.castle-tutorial-footer{display:flex;align-items:center;justify-content:space-between;gap:10px}
.castle-text-command{display:inline-flex;align-items:center;justify-content:center;gap:5px;flex:none;min-height:30px;padding:4px 0 4px 5px;border:0;background:none;color:#a5b7a9;font-size:10px!important}
.castle-text-command:hover{color:#f4e3b1}
.castle-tutorial-safety{display:flex;align-items:center;gap:5px;padding-top:11px;color:#839e8a;font-size:9px}
.castle-interaction{position:absolute;z-index:9;bottom:45px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:12px;max-width:calc(100% - 30px);min-height:48px;padding:9px 17px 9px 11px;border:1px solid #d2c18a99;border-radius:3px;background:#10211df0;color:#f1e3b7;box-shadow:0 5px 25px #0005;font-size:12px!important;white-space:nowrap}
.castle-interaction:hover{background:#30453af2;border-color:#e4d5a3}
.castle-interaction>svg:last-child{color:#afa979}
.castle-help-shortcut{position:absolute;z-index:8;bottom:43px;right:40px;display:flex;align-items:center;gap:8px;min-height:34px;padding:4px 0;border:0;background:transparent;color:#d1d9c7;font-size:11px!important;text-shadow:0 2px 5px #000}
.castle-help-shortcut:hover{color:#ffedb4}
.castle-intro-manual{display:flex;align-items:center;justify-content:center;gap:8px;min-height:34px;margin-top:23px;padding:2px 4px;border:0;background:none;color:#c4cdbb;font-size:11px!important}
.castle-intro-manual:hover{color:#f0dfb0}
.castle-intro-manual kbd{min-width:20px;min-height:21px;font-size:10px}
.castle-help{display:flex;flex-direction:column;width:760px;max-width:100%;max-height:calc(100dvh - 130px);min-height:0;padding:25px 29px 21px;border:1px solid #a4b29a66;border-radius:5px;background:#14221ff7;box-shadow:0 20px 90px #0006;text-align:left}
.castle-help-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;flex:none}
.castle-help-heading>div>span{color:#aeba93;font-size:10px}
.castle-help-heading h2{font:28px/1.35 "Songti SC","SimSun",serif;font-weight:400;color:#e8e4cd;margin-top:4px}
.castle-help-modes{display:flex;gap:22px;flex:none;border-bottom:1px solid #a6b7973d;margin-top:18px}
.castle-help-modes button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:43px;padding:8px 2px 12px;border:0;border-bottom:2px solid transparent;background:none;color:#93a99a;font-size:12px}
.castle-help-modes button.active{border-bottom-color:#d0c28c;color:#f0dfad}
.castle-manual-body{min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#6a826952 transparent}
.castle-control-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:26px}
.castle-control-row{display:flex;align-items:center;gap:11px;min-height:80px;padding:13px 0;border-bottom:1px solid #90a89124}
.castle-control-row>svg{flex:none;color:#b9bb92}
.castle-control-row>div{flex:1;min-width:0}
.castle-control-row b{font-size:12px;color:#e0e5d3;font-weight:400}
.castle-control-row p{margin-top:5px;font-size:10px;line-height:1.6;color:#93aa98}
.castle-control-row>.castle-keyset{max-width:135px;justify-content:flex-end;flex:none}
.castle-control-row .castle-keyset:has(kbd:nth-child(4)){max-width:61px}
.castle-control-row kbd{min-width:24px;min-height:23px;font-size:10px}
.castle-gesture{max-width:108px;color:#cdd3b1;font-size:10px;line-height:1.6;text-align:right}
.castle-help-mission{display:flex;align-items:flex-start;gap:12px;padding:17px 0 4px;color:#a8bbab}
.castle-help-mission>svg{flex:none;margin-top:2px;color:#bab77d}
.castle-help-mission p{font-size:11px;line-height:1.8}
.castle-help-footer{display:flex;align-items:center;justify-content:space-between;flex:none;gap:18px;margin-top:19px;padding:17px 0 0;border-top:1px solid #a6b7973d}
.castle-help-footer .castle-secondary{margin:0;font-size:11px;min-height:37px;justify-content:flex-start}
.castle-help-footer .castle-command{min-width:125px;min-height:39px;padding:9px 17px;font-size:11px}
@media(min-width:901px) and (min-height:561px){.castle-intro{align-items:flex-start;justify-content:flex-end;text-align:left;padding:105px 7% 82px;background:linear-gradient(90deg,#04100d82,transparent 67%)}.castle-intro h1{font-size:61px}.castle-intro .castle-kicker{margin-bottom:16px!important}.castle-intro .castle-title-rule{margin:20px 0 14px}.castle-intro .castle-begin{margin-top:29px}.castle-intro .castle-secondary{min-width:190px}.castle-intro-manual{min-width:190px;margin-top:16px}}
@keyframes castle-breathe{50%{opacity:.4}}
@media(pointer:coarse),(max-width:900px){.castle-touch{display:block}.castle-combat-tools{display:none}.castle-topbar{height:67px;padding:0 20px;gap:12px}.castle-hud{top:86px;left:25px;right:25px}.castle-target{top:159px;width:190px}.castle-character{margin-bottom:9px}.castle-location{font-size:9px}.castle-location b{font-size:13px}.castle-vitals{width:220px}.castle-overlay h1{font-size:42px}.castle-intro h1{font-size:58px}.castle-intro{padding-top:80px}.castle-victory-seal{width:46px;height:46px;margin-bottom:25px}.castle-victory-seal svg{width:25px}.castle-results{margin:24px 0}}
@media(max-width:600px){.castle-topbar{height:63px;padding:0 14px;gap:10px}.castle-location{display:flex;flex-direction:column;align-items:flex-start;gap:2px}.castle-location span{font-size:8px}.castle-location b{border:0;padding:0;font-size:12px}.castle-tools{gap:0}.castle-icon{width:32px;height:34px}.castle-fullscreen{display:none}.castle-hud{top:83px;left:19px;right:19px}.castle-vitals{width:186px;max-width:54vw}.castle-character{gap:10px;margin-bottom:9px}.castle-character-sigil{width:25px;height:25px}.castle-character-sigil svg{width:15px}.castle-character div{gap:8px}.castle-character b{font-size:14px}.castle-character div span{font-size:8px}.castle-meter{gap:6px}.castle-meter>span{font-size:9px;width:18px}.castle-objective{padding-left:11px;gap:7px}.castle-objective>svg{width:14px}.castle-objective span{font-size:9px}.castle-objective b{font-size:24px}.castle-objective small{font-size:11px}.castle-target{top:160px;width:160px}.castle-overlay{padding:80px 20px 45px}.castle-overlay h1{font-size:36px}.castle-intro h1{font-size:48px}.castle-kicker{font-size:10px;margin-bottom:18px!important}.castle-intro{padding-top:80px}.castle-begin{margin-top:33px}.castle-command{min-height:44px;min-width:180px;font-size:12px}.castle-chapter{right:22px;bottom:21px;font-size:8px}.castle-joystick{width:108px;height:108px;left:max(18px,env(safe-area-inset-left));bottom:max(30px,env(safe-area-inset-bottom))}.castle-joystick>i{width:41px;height:41px}.castle-touch-actions{right:max(16px,env(safe-area-inset-right));bottom:max(23px,env(safe-area-inset-bottom));width:166px;height:151px}.castle-touch-attack{width:66px;height:66px}.castle-touch-dodge{right:76px;width:53px;height:53px}.castle-touch-heal{right:107px;bottom:72px;width:46px;height:46px}.castle-touch-lock{right:21px;bottom:112px}.castle-look{top:185px}.castle-loading h1{font-size:25px}.castle-settings{padding:18px 22px 23px}.castle-death h1{font-size:46px}.castle-victory h1{font-size:43px}.castle-victory-seal{margin-bottom:29px}.castle-end-detail{margin:20px 0 29px!important}}
@media(max-height:560px) and (orientation:landscape){.castle-topbar{height:54px}.castle-hud{top:68px}.castle-character{margin-bottom:6px}.castle-character-sigil{width:24px;height:24px}.castle-vitals{width:210px}.castle-target{top:128px;width:160px}.castle-overlay{padding:65px 20px 20px}.castle-intro{padding-top:58px}.castle-intro h1{font-size:43px}.castle-kicker{margin-bottom:12px!important}.castle-title-rule{margin:14px 0 10px}.castle-begin{margin-top:22px}.castle-chapter{bottom:18px}.castle-look{top:130px}.castle-joystick{width:98px;height:98px;bottom:20px}.castle-joystick>i{width:37px;height:37px}.castle-touch-actions{transform:scale(.85);transform-origin:bottom right;bottom:15px}.castle-overlay h1{font-size:36px}.castle-pause-actions{margin-top:21px}.castle-secondary{margin-top:7px}.castle-victory-seal{display:none}.castle-results{margin:18px 0;gap:30px}.castle-results>div{gap:5px}.castle-results b{font-size:21px}.castle-settings{padding:12px 22px 16px}.castle-settings header{padding-bottom:6px}.castle-setting-row{padding:14px 0}.castle-settings-done{margin-top:16px}.castle-end-detail{margin:14px 0 22px!important}.castle-loading-seal{width:40px;height:40px;margin-bottom:20px}.castle-loading-track{margin-top:23px}}
@media(pointer:coarse),(max-width:900px){.castle-tutorial{top:202px;left:25px;width:276px;padding:14px 15px 11px}.castle-tutorial h2{font-size:18px}.castle-tutorial p{font-size:11px}.castle-tutorial-progress{margin:10px 0 12px}.castle-interaction{bottom:190px}.castle-help-backdrop{padding:80px 18px 28px}.castle-help{max-height:calc(100dvh - 108px);padding:21px 23px 18px}.castle-help-modes{margin-top:12px}.castle-control-row{min-height:75px;gap:9px}.castle-control-grid{column-gap:20px}}
@media(max-width:640px){.castle-help{width:420px;padding:18px 19px 15px}.castle-help-heading h2{font-size:24px}.castle-help-modes{gap:20px}.castle-help-modes button{font-size:11px;min-height:39px}.castle-control-grid{grid-template-columns:1fr}.castle-control-row{min-height:65px;padding:10px 0}.castle-control-row>.castle-keyset{max-width:145px}.castle-control-row .castle-keyset:has(kbd:nth-child(4)){max-width:145px}.castle-control-row p{font-size:10px}.castle-help-mission{padding-top:14px}.castle-help-footer{gap:12px;flex-wrap:wrap;margin-top:13px;padding-top:12px}.castle-help-footer .castle-secondary{font-size:10px}.castle-help-footer .castle-command{min-width:98px;padding:8px 12px}.castle-tutorial{top:198px;left:19px;width:258px;max-width:calc(100% - 38px);padding:12px 14px 10px}.castle-tutorial p{min-height:0;margin:7px 0 8px;line-height:1.65}.castle-tutorial h2{font-size:17px}.castle-tutorial-progress{margin:9px 0 10px}.castle-tutorial-safety{padding-top:7px}.castle-tutorial-heading{font-size:9px}.castle-interaction{bottom:184px;min-height:43px;font-size:11px!important;padding:8px 12px}.castle-target{top:160px}.castle-location b{font-size:11px}.castle-location span{font-size:8px}.castle-topbar{gap:8px}}
@media(max-width:360px){.castle-topbar{padding:0 11px;gap:6px}.castle-tools .castle-icon{width:29px}.castle-location b{font-size:10px}.castle-location span{font-size:8px}.castle-tutorial{width:244px}.castle-help{padding:16px 14px 12px}.castle-help-footer{gap:4px}.castle-control-row>.castle-keyset{max-width:118px}.castle-control-row kbd{font-size:9px}.castle-touch-actions{right:10px}}
@media(max-height:700px) and (orientation:portrait){.castle-tutorial{top:164px;max-height:126px;padding:10px 12px 8px;overflow-y:auto;scrollbar-width:thin}.castle-tutorial-safety{display:none}.castle-tutorial p{font-size:10px;line-height:1.5;margin:5px 0 6px}.castle-tutorial h2{font-size:16px}.castle-tutorial-heading{font-size:9px}.castle-tutorial-progress{margin:6px 0 7px}.castle-tutorial .castle-text-command{min-height:25px}.castle-tutorial kbd{min-height:22px;font-size:10px}.castle-battle--tutorial .castle-target{top:154px}.castle-intro .castle-begin{margin-top:23px}.castle-intro-manual{margin-top:15px}.castle-interaction{bottom:176px}}
@media(max-height:560px) and (orientation:landscape){.castle-tutorial{top:137px;left:25px;width:232px;max-height:calc(100dvh - 252px);overflow-y:auto;padding:10px 12px;scrollbar-width:thin}.castle-tutorial-heading{font-size:9px}.castle-tutorial-progress{margin:7px 0 8px}.castle-tutorial h2{font-size:16px}.castle-tutorial p{margin:6px 0;font-size:10px;line-height:1.5;min-height:0}.castle-tutorial-safety{display:none}.castle-tutorial kbd{font-size:9px;min-height:21px}.castle-tutorial-footer{gap:7px}.castle-interaction{bottom:25px;min-height:40px;font-size:11px!important}.castle-help-backdrop{padding:61px 20px 15px}.castle-help{max-height:calc(100dvh - 76px);padding:12px 22px}.castle-help-heading h2{font-size:21px}.castle-help-heading>div>span{display:none}.castle-help-modes{margin-top:4px}.castle-help-modes button{min-height:33px;padding:5px 2px 8px}.castle-control-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.castle-control-row{min-height:62px;padding:9px 0}.castle-help-footer{margin-top:7px;padding-top:8px;flex-wrap:nowrap}.castle-help-footer .castle-command{min-height:34px}.castle-help-mission{padding-top:12px}.castle-intro .castle-begin{margin-top:16px}.castle-intro .castle-secondary{margin-top:5px}.castle-intro-manual{margin-top:5px;min-height:27px}}
@media(max-height:370px) and (orientation:landscape){.castle-battle--tutorial .castle-character{display:none}.castle-battle--tutorial .castle-tutorial{top:105px;max-height:calc(100dvh - 212px)}.castle-battle--tutorial .castle-joystick{width:86px;height:86px;bottom:15px}.castle-help-heading h2{font-size:19px}.castle-help{padding-top:9px;padding-bottom:9px}.castle-intro .castle-title-rule{margin:9px 0 7px}.castle-intro .castle-kicker{margin-bottom:8px!important}.castle-intro h1{font-size:36px}}
@media(max-width:600px){.castle-touch-actions{width:166px;height:175px}.castle-touch-lock{right:78px;bottom:117px}}
@media(prefers-reduced-motion:reduce){.castle-battle *{animation:none!important;transition:none!important}}
</style>
