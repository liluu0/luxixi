<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const slides = [
  { file: 'storm-train', title: '风暴列车少女', theme: '驶向未知', alt: '少女站在穿越风暴与高架桥的列车上，远处是幻想城堡' },
  { file: 'city-skater', title: '怪趣城市滑板', theme: '偏离轨道', alt: '滑板少女与怪趣伙伴穿行于荧光色的超现实城市' },
  { file: 'inventor', title: '怪趣发明家', theme: '制造一点意外', alt: '发明家在布满工具与机械花朵的工作室里探索新点子' },
  { file: 'boxing', title: '拳击', theme: '打破惯性', alt: '拳击手击中沙袋，荧光色的冲击在暗色训练室中迸发' },
]
const center = ref(0)
const section = ref(null)
const viewport = ref(null)
const active = ref(0)
const enabled = ref(false)
const states = ref(slides.map(() => 'loading'))
const attempts = ref(slides.map(() => 0))
const offset = ref(0)
const step = ref(0)
const dragging = ref(false)
const hovering = ref(false)
const direction = ref(1)
const cursor = ref({ x: 0, y: 0 })
const current = computed(() => slides[active.value])
let intersection, resize, gesture
const src = (slide, i) => `/assets/visual-gallery/${slide.file}.webp${attempts.value[i] ? `?retry=${attempts.value[i]}` : ''}`
const go = (index) => { active.value = Math.max(0, Math.min(slides.length - 1, index)); offset.value = 0 }
const retry = (i) => { states.value[i] = 'loading'; attempts.value[i]++ }
const settle = () => { gesture = null; dragging.value = false; offset.value = 0 }
function down(event) {
  if (!event.isPrimary || event.button !== 0 || event.target.closest('button')) return
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null }
  viewport.value.setPointerCapture(event.pointerId)
}
function move(event) {
  const rect = viewport.value.getBoundingClientRect()
  cursor.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  direction.value = cursor.value.x < rect.width / 2 ? -1 : 1
  hovering.value = event.pointerType === 'mouse' && !event.target.closest('button')
  if (!gesture || gesture.id !== event.pointerId) return
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y
  if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
  if (gesture.axis === 'x') { dragging.value = true; offset.value = dx * .85 }
}
function up(event) {
  if (!gesture || gesture.id !== event.pointerId) return
  const dx = event.clientX - gesture.x
  if (gesture.axis === 'x' && Math.abs(dx) > Math.min(70, step.value * .15)) go(active.value + (dx < 0 ? 1 : -1))
  else if (!gesture.axis && event.pointerType === 'mouse') {
    const rect = viewport.value.getBoundingClientRect()
    go(active.value + (event.clientX - rect.left < rect.width / 2 ? -1 : 1))
  }
  settle()
  if (viewport.value.hasPointerCapture(event.pointerId)) viewport.value.releasePointerCapture(event.pointerId)
}
function key(event) {
  if (event.target.tagName === 'BUTTON') return
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  if (event.key === 'Home') go(0)
  else if (event.key === 'End') go(slides.length - 1)
  else go(active.value + (event.key === 'ArrowRight' ? 1 : -1))
}
onMounted(() => {
  intersection = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { enabled.value = true; intersection.disconnect() }
  }, { rootMargin: '400px' })
  intersection.observe(section.value)
  resize = new ResizeObserver(() => {
    const cards = viewport.value.querySelectorAll('.gallery-slide')
    const first = cards[0].getBoundingClientRect()
    step.value = cards[1].getBoundingClientRect().left - first.left
    center.value = (viewport.value.clientWidth - first.width) / 2
    settle()
  })
  resize.observe(viewport.value)
})
onUnmounted(() => { intersection?.disconnect(); resize?.disconnect() })
</script>

<template>
  <section id="visual-gallery" ref="section" class="gallery reveal" aria-labelledby="gallery-title" aria-roledescription="轮播">
    <header class="gallery-heading wrap">
      <div><div class="label">02 / VISUAL EXPERIMENTS</div><h2 id="gallery-title">脑内放映室<span aria-hidden="true">✳</span></h2></div>
      <p>四帧想象，暂时逃离日常。<br><span>SCENES FROM SOMEWHERE ELSE</span></p>
    </header>
    <div ref="viewport" class="gallery-viewport" :class="{ dragging, 'has-cursor': hovering }" tabindex="0" aria-label="四幅视觉作品，使用左右方向键切换" @keydown="key" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="settle" @lostpointercapture="settle" @pointerleave="hovering = false">
      <div class="gallery-track" :style="{ transform: `translate3d(${ center - active * step + offset }px,0,0)` }">
        <figure v-for="(slide, slot) in slides" :key="slot" class="gallery-slide" :class="{ ready: states[slot] === 'ready' }" :aria-hidden="slot !== active" role="group" aria-roledescription="幻灯片" :aria-label="`${slot + 1} / 4：${slide.title}`">
          <img v-if="enabled" :key="attempts[slot]" :src="src(slide, slot)" :alt="slide.alt" width="1536" height="1024" decoding="async" draggable="false" @load="states[slot] = 'ready'" @error="states[slot] = 'error'">
          <div v-if="states[slot] === 'loading'" class="gallery-loading" role="status" :aria-label="`正在加载${slide.title}`"><i/><i/><i/></div>
          <div v-if="states[slot] === 'error'" class="gallery-error"><span>画面暂未加载</span><button type="button" :tabindex="slot === active ? 0 : -1" @click.stop="retry(slot)">重新加载</button></div>
          <span class="frame-number" aria-hidden="true">FRAME / 0{{ slot + 1 }}</span>
        </figure>
      </div>
      <div class="gallery-cursor" :style="{ left: `${cursor.x}px`, top: `${cursor.y}px` }" aria-hidden="true"><b>{{ dragging ? '↔' : direction === -1 ? '←' : '→' }}</b><small>{{ dragging ? 'DRAG' : direction === -1 ? 'PREV' : 'NEXT' }}</small></div>
    </div>
    <footer class="gallery-footer wrap">
      <div class="gallery-caption" aria-live="polite" aria-atomic="true"><span class="gallery-count">0{{ active + 1 }} <i>/ 04</i></span><div><h3>{{ current.title }}</h3><p>{{ current.theme }}</p></div></div>
      <div class="gallery-controls"><button type="button" class="gallery-arrow" aria-label="上一张图片" :disabled="active === 0" @click="go(active - 1)">←</button><div class="gallery-dots" aria-label="选择图片"><button v-for="(slide, i) in slides" :key="slide.file" type="button" :aria-label="`查看第${i + 1}张：${slide.title}`" :aria-current="i === active ? 'true' : undefined" @click="go(i)"><span/></button></div><button type="button" class="gallery-arrow" aria-label="下一张图片" :disabled="active === slides.length - 1" @click="go(active + 1)">→</button></div>
    </footer>
    <p class="gallery-hint wrap">← <span class="desktop-hint">拖动探索 / 点击画面左右切换</span><span class="mobile-hint">左右滑动，继续放映</span> →</p>
  </section>
</template>

<style scoped>
.gallery{position:relative;overflow:hidden;scroll-margin-top:24px;border-top-color:transparent}
.gallery:before{content:'';position:absolute;top:0;left:50%;width:min(1180px,calc(100% - 48px));height:1px;background:var(--line);transform:translateX(-50%);pointer-events:none}
.gallery-heading{display:flex;justify-content:space-between;align-items:end;gap:30px;margin-bottom:42px}
.gallery-heading .label{margin-bottom:30px}
.gallery-heading h2{font-size:clamp(36px,5.4vw,72px);line-height:1.15;letter-spacing:-.045em}
.gallery-heading h2 span{display:inline-block;color:var(--acid);font-size:.6em;margin-left:18px;vertical-align:top;transform:rotate(-15deg)}
.gallery-heading p{margin:0 0 5px;color:#b1b5a8;font:13px/2 'Microsoft YaHei',sans-serif}
.gallery-heading p span{font:9px/2 monospace;letter-spacing:.12em;color:#818a76}
.gallery-viewport{position:relative;overflow:hidden;touch-action:pan-y pinch-zoom;user-select:none;cursor:grab;outline-offset:-3px}
.gallery-track{display:flex;gap:clamp(40px,5vw,100px);transition:transform .65s cubic-bezier(.22,.75,.18,1);will-change:transform}
.gallery-viewport.dragging .gallery-track{transition:none}
.gallery-slide{position:relative;flex:0 0 clamp(360px,40vw,640px);aspect-ratio:3/2;margin:0;background:#19201a;overflow:hidden}
.gallery-slide:after{content:'';position:absolute;inset:0;pointer-events:none;background:rgba(8,20,12,.09)}
.gallery-slide img{width:100%;height:100%;display:block;object-fit:contain;opacity:0;transform:scale(1.035);transition:opacity .65s,transform 1s}
.gallery-slide.ready img{opacity:1;transform:scale(1)}
.frame-number{position:absolute;left:18px;bottom:18px;z-index:1;padding:7px 9px;background:#0d0e0dbb;color:#f1efe7;font:9px monospace;letter-spacing:.15em}
.gallery-loading,.gallery-error{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:9px;color:var(--acid)}
.gallery-loading i{height:9px;width:9px;border-radius:50%;background:var(--acid);animation:gallery-pulse 1s ease-in-out infinite}
.gallery-loading i:nth-child(2){animation-delay:.15s}.gallery-loading i:nth-child(3){animation-delay:.3s}
.gallery-error{flex-direction:column;z-index:2;font-size:13px}.gallery-error button{background:none;border:1px solid var(--acid);color:var(--acid);padding:10px;cursor:pointer}
.gallery-cursor{position:absolute;z-index:3;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:96px;height:96px;border-radius:50%;background:#f1efe7ed;color:#11160d;transform:translate(-50%,-50%) scale(.5);opacity:0;transition:opacity .18s,transform .22s;box-shadow:0 5px 24px #0002}
.gallery-cursor b{font:34px/1 monospace}.gallery-cursor small{font:9px monospace;letter-spacing:.12em;margin-top:8px}
@media(hover:hover) and (pointer:fine){.has-cursor{cursor:none}.has-cursor .gallery-cursor{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.gallery-footer{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:0 auto;padding:24px 0 0;border:0}
.gallery-caption{display:flex;align-items:center;gap:24px}.gallery-count{color:var(--acid);font:24px monospace;white-space:nowrap}.gallery-count i{font:12px monospace;color:#818a76;font-style:normal}
.gallery-caption h3{margin:0;color:var(--ink);font:500 17px/1.5 'Microsoft YaHei',sans-serif}.gallery-caption p{margin:4px 0 0;color:#818a76;font-size:11px}
.gallery-controls{display:flex;align-items:center;gap:12px}.gallery-arrow{width:44px;height:44px;border:1px solid #49503f;border-radius:50%;background:none;color:var(--ink);font:20px monospace;cursor:pointer}.gallery-arrow:hover:not(:disabled){background:var(--acid);border-color:var(--acid);color:#0d0e0d}
.gallery-arrow:disabled{opacity:.25;cursor:default}.gallery-dots{display:flex}.gallery-dots button{display:grid;place-items:center;width:28px;height:44px;padding:0;border:0;background:none;cursor:pointer}.gallery-dots span{width:6px;height:6px;border-radius:50%;background:#66715b;transition:background .2s,box-shadow .2s}.gallery-dots [aria-current=true] span{background:var(--acid);box-shadow:0 0 0 4px #d8ff361b}
.gallery button:focus-visible,.gallery-viewport:focus-visible{outline:2px solid var(--acid);outline-offset:3px}
.gallery-hint{margin:22px auto 0;color:#818a76;font-size:10px;letter-spacing:.12em}.mobile-hint{display:none}
@keyframes gallery-pulse{0%,80%,100%{opacity:.3;transform:scale(.7)}40%{opacity:1;transform:scale(1.25)}}
@media(max-width:700px){.gallery:before{width:calc(100% - 32px)}.gallery-viewport{width:calc(100% - 32px);margin:auto}.gallery-heading{display:block;margin-bottom:26px}.gallery-heading p{margin-top:20px}.gallery-heading h2{font-size:clamp(30px,8.5vw,50px)}.gallery-slide{flex-basis:100%}.gallery-track{gap:16px}.gallery-footer{flex-wrap:wrap;padding-top:20px}.gallery-caption{gap:16px}.gallery-controls{width:100%;justify-content:space-between}.gallery-dots button{width:40px}.gallery-cursor{display:none}.desktop-hint{display:none}.mobile-hint{display:inline}.gallery-hint{text-align:center;margin-top:12px}.frame-number{left:10px;bottom:10px;font-size:8px}}
@media(prefers-reduced-motion:reduce){.gallery-track,.gallery-slide img,.gallery-cursor,.gallery-dots span{transition:none}.gallery-loading i{animation:none}.gallery.reveal{opacity:1;transform:none;transition:none}}
</style>
