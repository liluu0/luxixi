<script setup>
import { computed, onBeforeUnmount, onUnmounted, ref, shallowRef, watch } from 'vue'
import { Activity, ArrowLeft, Brain, Orbit, RotateCcw, ScanLine, Shield } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { getWorkPageDefinition } from '../workPageLoaders'

const props = defineProps({
  workId: { type: String, required: true },
})

const router = useRouter()
const resolvedComponent = shallowRef(null)
const error = ref('')
const previousTitle = document.title
let generation = 0
let disposed = false

const icons = { activity: Activity, brain: Brain, orbit: Orbit, scan: ScanLine, shield: Shield }
const work = computed(() => getWorkPageDefinition(props.workId))
const workIcon = computed(() => icons[work.value?.icon] || Orbit)
const loadedProps = computed(() => work.value?.passesBack ? { onBack: backToWorks } : {})

function backToWorks() {
  router.push({ name: 'home', hash: '#work' })
}

async function loadWork() {
  const definition = work.value
  const run = ++generation
  resolvedComponent.value = null
  error.value = ''

  if (!definition) {
    error.value = '没有找到这个作品页面。'
    return
  }

  document.title = definition.documentTitle
  try {
    const module = await definition.loader()
    if (disposed || run !== generation) return
    if (!module?.default) throw new Error('作品模块没有导出页面组件。')
    resolvedComponent.value = module.default
  } catch (cause) {
    if (disposed || run !== generation) return
    console.error(`作品页面加载失败：${props.workId}`, cause)
    error.value = '作品页面暂时未能载入，请检查网络后重试。'
  }
}

watch(() => props.workId, loadWork, { immediate: true })

onBeforeUnmount(() => {
  disposed = true
  generation++
})

onUnmounted(() => {
  document.title = previousTitle
})
</script>

<template>
  <component v-if="resolvedComponent" :is="resolvedComponent" v-bind="loadedProps" />
  <main
    v-else
    class="work-route-shell"
    :class="`work-route-shell--${work?.theme || 'default'}`"
    :aria-busy="!error"
  >
    <header class="shell-header">
      <button type="button" class="shell-back" title="返回作品集" aria-label="返回作品集" @click="backToWorks">
        <ArrowLeft :size="22" />
      </button>
      <div class="shell-location">
        <span>{{ work?.kicker || 'LUXIXI' }}</span>
        <b>{{ work?.title || '作品页面' }}</b>
      </div>
      <span class="shell-code">{{ work?.code || 'SELECTED WORK' }}</span>
    </header>

    <section class="shell-stage" :class="{ 'shell-stage--error': error }" :role="error ? 'alert' : 'status'" aria-live="polite">
      <div class="shell-mark" aria-hidden="true">
        <i class="shell-mark-ring shell-mark-ring--outer" />
        <i class="shell-mark-ring shell-mark-ring--inner" />
        <span class="shell-seal"><component :is="workIcon" :size="28" /></span>
      </div>

      <template v-if="error">
        <p class="shell-kicker">{{ work?.kicker || 'LUXIXI' }}</p>
        <h1>作品未能载入</h1>
        <p class="shell-error-message">{{ error }}</p>
        <button type="button" class="shell-retry" @click="loadWork"><RotateCcw :size="16" />重新载入</button>
      </template>
      <template v-else>
        <p class="shell-kicker">{{ work?.kicker }}</p>
        <h1>{{ work?.title }}</h1>
        <div class="shell-progress" aria-hidden="true"><i /></div>
        <div class="shell-caption"><span>{{ work?.loadingLabel }}</span><b>LOADING</b></div>
      </template>
    </section>

    <footer class="shell-footer" aria-hidden="true">
      <span>LUXIXI / SELECTED WORK</span>
      <span>ROUTE READY · MODULE LOADING</span>
    </footer>
  </main>
</template>

<style scoped>
.work-route-shell{
  --shell-bg:#101514;
  --shell-panel:#141c19;
  --shell-line:#aeb8aa2e;
  --shell-accent:#d8ff36;
  --shell-ink:#f1efe7;
  --shell-muted:#98a29a;
  position:fixed;
  inset:0;
  z-index:1000;
  display:grid;
  grid-template-rows:82px minmax(0,1fr) 48px;
  min-height:100dvh;
  overflow:hidden;
  background:var(--shell-bg);
  color:var(--shell-ink);
  font:13px/1.5 "Microsoft YaHei","PingFang SC",sans-serif;
  color-scheme:dark;
  isolation:isolate;
}
.work-route-shell *{box-sizing:border-box;letter-spacing:0}
.work-route-shell--castle{--shell-bg:#101716;--shell-panel:#141d1a;--shell-line:#b6b7a733;--shell-accent:#c7b887;--shell-ink:#f0eadc;--shell-muted:#9fa79d}
.work-route-shell--sanctuary{--shell-bg:#0c1b25;--shell-panel:#102128;--shell-line:#d9c29a36;--shell-accent:#d9c29a;--shell-ink:#e6eeeb;--shell-muted:#91a5a6}
.work-route-shell--city{--shell-bg:#10151a;--shell-panel:#172128;--shell-line:#46585f66;--shell-accent:#d8ff36;--shell-ink:#f1efe7;--shell-muted:#8d9b9c}
.work-route-shell--anatomy{--shell-bg:#0b1115;--shell-panel:#10191d;--shell-line:#3e505766;--shell-accent:#82e8cf;--shell-ink:#e8f1ed;--shell-muted:#839295}
.work-route-shell--brain{--shell-bg:#101211;--shell-panel:#171c19;--shell-line:#4b554b80;--shell-accent:#d8ff36;--shell-ink:#f1f2eb;--shell-muted:#9da89c}
.work-route-shell::before,.work-route-shell::after{position:absolute;content:"";pointer-events:none;z-index:-1}
.work-route-shell::before{inset:82px 0 48px;border-top:1px solid var(--shell-line);border-bottom:1px solid var(--shell-line)}
.work-route-shell::after{width:min(72vw,820px);aspect-ratio:1;left:50%;top:51%;border:1px solid var(--shell-line);transform:translate(-50%,-50%) rotate(45deg);opacity:.32}
.shell-header{display:flex;align-items:center;gap:18px;padding:0 32px;background:var(--shell-panel);border-bottom:1px solid var(--shell-line)}
.shell-back{display:grid;place-items:center;width:46px;height:46px;flex:none;padding:0;border:1px solid var(--shell-line);border-radius:3px;background:transparent;color:var(--shell-ink);cursor:pointer;transition:border-color .18s,color .18s,background .18s}
.shell-back:hover{border-color:var(--shell-accent);color:var(--shell-accent);background:#ffffff08}
.shell-back:focus-visible,.shell-retry:focus-visible{outline:2px solid var(--shell-accent);outline-offset:4px}
.shell-location{display:flex;align-items:baseline;gap:14px;min-width:0}
.shell-location span{color:var(--shell-muted);font-size:10px;white-space:nowrap}
.shell-location b{padding-left:14px;border-left:1px solid var(--shell-line);font:400 15px/1.4 "Songti SC","Noto Serif CJK SC","SimSun",serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shell-code{margin-left:auto;color:var(--shell-muted);font:9px/1.4 Consolas,monospace;white-space:nowrap}
.shell-stage{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0;padding:42px 24px 56px;border:0;text-align:center}
.shell-mark{position:relative;display:grid;place-items:center;width:142px;height:142px;margin-bottom:38px;color:var(--shell-accent)}
.shell-mark-ring{position:absolute;inset:0;border:1px solid var(--shell-line);border-radius:50%}
.shell-mark-ring--outer{animation:shell-turn 12s linear infinite}
.shell-mark-ring--outer::before,.shell-mark-ring--outer::after{position:absolute;content:"";width:5px;height:5px;border-radius:50%;background:var(--shell-accent)}
.shell-mark-ring--outer::before{top:-3px;left:50%}.shell-mark-ring--outer::after{bottom:-3px;left:50%}
.shell-mark-ring--inner{inset:22px;border-style:dashed;opacity:.55;animation:shell-turn 8s linear infinite reverse}
.shell-seal{display:grid;place-items:center;width:70px;height:70px;border:1px solid var(--shell-line);background:var(--shell-panel);box-shadow:inset 0 0 0 1px #ffffff08;transform:rotate(45deg);animation:shell-breathe 1.8s ease-in-out infinite}
.shell-seal svg{transform:rotate(-45deg)}
.shell-kicker{margin:0 0 13px;color:var(--shell-accent);font-size:11px}
.shell-stage h1{max-width:760px;margin:0;color:var(--shell-ink);font:400 46px/1.28 "Songti SC","Noto Serif CJK SC","SimSun",serif;overflow-wrap:anywhere}
.shell-progress{width:min(700px,74vw);height:2px;margin-top:48px;overflow:hidden;background:var(--shell-line)}
.shell-progress i{display:block;width:34%;height:100%;background:var(--shell-accent);animation:shell-progress 1.25s ease-in-out infinite}
.shell-caption{display:flex;justify-content:space-between;width:min(700px,74vw);margin-top:14px;color:var(--shell-muted);font-size:11px;text-align:left}
.shell-caption b{color:var(--shell-accent);font:400 9px Consolas,monospace}
.shell-error-message{max-width:430px;margin:18px 0 26px;color:var(--shell-muted);font-size:12px;line-height:1.8}
.shell-retry{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:42px;padding:10px 19px;border:1px solid var(--shell-line);border-radius:3px;background:var(--shell-panel);color:var(--shell-ink);font:12px "Microsoft YaHei","PingFang SC",sans-serif;cursor:pointer}
.shell-retry:hover{border-color:var(--shell-accent);color:var(--shell-accent)}
.shell-stage--error .shell-mark-ring{animation-play-state:paused}.shell-stage--error .shell-seal{animation:none}
.shell-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 32px;color:var(--shell-muted);font:8px Consolas,monospace}
@keyframes shell-turn{to{transform:rotate(360deg)}}
@keyframes shell-breathe{50%{transform:rotate(45deg) scale(.94);opacity:.72}}
@keyframes shell-progress{0%{transform:translateX(-65%)}50%{transform:translateX(98%)}100%{transform:translateX(260%)}}
@media(max-width:650px){
  .work-route-shell{grid-template-rows:72px minmax(0,1fr) 38px}
  .work-route-shell::before{inset:72px 0 38px}
  .work-route-shell::after{width:108vw;top:54%;opacity:.23}
  .shell-header{gap:13px;padding:0 18px}
  .shell-back{width:44px;height:44px}
  .shell-location{display:block;min-width:0}
  .shell-location span{display:block;margin-bottom:3px;font-size:9px;overflow:hidden;text-overflow:ellipsis}
  .shell-location b{display:block;padding:0;border:0;font-size:14px;overflow:hidden;text-overflow:ellipsis}
  .shell-code{display:none}
  .shell-stage{padding:34px 18px 48px}
  .shell-mark{width:116px;height:116px;margin-bottom:34px}
  .shell-mark-ring--inner{inset:18px}
  .shell-seal{width:60px;height:60px}
  .shell-stage h1{max-width:92vw;font-size:32px;line-height:1.36}
  .shell-progress,.shell-caption{width:min(76vw,420px)}
  .shell-progress{margin-top:42px}
  .shell-footer{justify-content:center;padding:0 18px}
  .shell-footer span:last-child{display:none}
}
@media(prefers-reduced-motion:reduce){
  .shell-mark-ring,.shell-seal,.shell-progress i{animation:none}
  .shell-progress i{width:42%}
}
</style>
