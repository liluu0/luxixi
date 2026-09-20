<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ComingSoonDialog from './ComingSoonDialog.vue'
import ContactSection from './ContactSection.vue'
import WorkCover from './WorkCover.vue'
import VisualGallery from './VisualGallery.vue'
import { prepareWorkPagesWhenIdle } from '../workPageLoaders'
import { prepareAnatomyModel } from './anatomy/modelCache'
defineProps({
  onOpen: Function,
  onOpenAnatomy: Function,
  onOpenCastle: Function,
  onOpenBrain: Function,
  onOpenSanctuary: Function,
})
const comingSoon = ref(null)
const hero = ref(null)
const aboutSection = ref(null)
const stickerMood = ref(0)
const moods = ['AWAKE', 'POKE AGAIN', 'HUH?']
const pokeSticker = () => { stickerMood.value = (stickerMood.value + 1) % moods.length }
const doodleMood = ref(0)
const doodleMessages = ['点我一下', '嗨！一起玩呀', '灵感 +1 ✦']
let observer
let pointerFrame
let stopWorkPreparation
let stopModelPreparation
onMounted(() => { stopModelPreparation = prepareAnatomyModel() })
onUnmounted(() => { stopModelPreparation?.() })
onMounted(() => { stopWorkPreparation = prepareWorkPagesWhenIdle() })
onUnmounted(() => { stopWorkPreparation?.() })
const moveHero = (event) => {
  if (!hero.value || !matchMedia('(pointer:fine)').matches) return
  cancelAnimationFrame(pointerFrame)
  pointerFrame = requestAnimationFrame(() => {
    const rect = hero.value.getBoundingClientRect()
    hero.value.style.setProperty('--pointer-x', `${((event.clientX - rect.left) / rect.width - .5) * 2}`)
    hero.value.style.setProperty('--pointer-y', `${((event.clientY - rect.top) / rect.height - .5) * 2}`)
  })
}
const resetHero = () => {
  hero.value?.style.setProperty('--pointer-x', 0)
  hero.value?.style.setProperty('--pointer-y', 0)
}
const moveAbout = (event) => {
  if (!aboutSection.value || !matchMedia('(pointer:fine)').matches) return
  const rect = aboutSection.value.getBoundingClientRect()
  aboutSection.value.style.setProperty('--about-pointer-x', `${((event.clientX - rect.left) / rect.width - .5) * 2}`)
  aboutSection.value.style.setProperty('--about-pointer-y', `${((event.clientY - rect.top) / rect.height - .5) * 2}`)
}
const resetAbout = () => {
  aboutSection.value?.style.setProperty('--about-pointer-x', 0)
  aboutSection.value?.style.setProperty('--about-pointer-y', 0)
}
onMounted(()=>{ observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('show');observer.unobserve(entry.target)}}),{threshold:.12}); document.querySelectorAll('.reveal').forEach(el=>observer.observe(el)) })
onUnmounted(()=>observer?.disconnect())
</script>
<template>
  <div class="site">
    <header class="top wrap">
      <a class="logo" href="#top">LUXI<b>XI</b><i>✳</i></a>
      <nav>
        <a href="#about">ABOUT</a>
        <a href="#work">WORKS</a>
        <a href="#contact">CONTACT</a>
      </nav>
      <span class="availability">● AVAILABLE FOR FUN</span>
    </header>
    <main>
      <section ref="hero" class="hero wrap" @pointermove="moveHero" @pointerleave="resetHero">
        <div class="hero-grid"/>
        <div class="hero-noise"/>
        <div class="content">
          <div class="eyebrow">
            / 个人档案 001 — 自由创作者
          </div>
          <h1>露<span>西西</span></h1>
          <p><strong>我把好奇心做成可玩的东西。</strong><br>动画、三维、交互和一点点不合时宜的想象。</p>
          <div class="mobile-hero-actions">
            <a class="hero-work-link" href="#work">看看我的作品 ↗</a>
          </div>
        </div>
        <div class="sticker-field" aria-label="首页装饰贴图">
          <button type="button" class="sticker sticker-eye" :class="`mood-${stickerMood}`" :aria-label="`贴纸状态：${moods[stickerMood]}，点击切换`" @click="pokeSticker">
            <i/>
            <i/>
            <b>{{ moods[stickerMood] }}</b>
          </button>
          <img class="hero-doodle" src="/assets/stickers/02-free-doodle.svg?v=2" alt="自由涂鸦贴图">
          <button class="mobile-doodle" type="button" :class="`doodle-mood-${doodleMood}`" aria-label="和首页小怪打招呼" @click="doodleMood = (doodleMood + 1) % doodleMessages.length">
            <img src="/assets/stickers/02-free-doodle.svg?v=2" alt="">
            <span aria-live="polite">{{ doodleMessages[doodleMood] }}</span>
          </button>
          <div class="sticker sticker-ticket" aria-hidden="true">
            <span>NO.001</span>
            <strong>奇怪<br>通行证</strong>
          </div>
          <div class="sticker sticker-spark" aria-hidden="true">
            ✦
          </div>
          <div class="sticker-orbit" aria-hidden="true">
            <span>PLAY</span>
            <i>MAKE</i>
            <b>WONDER</b>
          </div>
        </div>
        <div class="scroll">
          ↓ 向下探索
        </div>
        <div class="signal">
          MOVE YOUR MOUSE /
          <b>POKE THE FACE</b>
        </div>
      </section>
      <div class="play-ticker" aria-hidden="true">
        <div>
          <span>KEEP IT WEIRD ✦</span>
          <span>动起来才算数 ●</span>
          <span>MAKE / BREAK / REMAKE ↗</span>
          <span>好奇心正在加载中...</span>
          <span>KEEP IT WEIRD ✦</span>
          <span>动起来才算数 ●</span>
          <span>MAKE / BREAK / REMAKE ↗</span>
          <span>好奇心正在加载中...</span>
        </div>
      </div>
      <section id="about" ref="aboutSection" class="about wrap reveal" @pointermove="moveAbout" @pointerleave="resetAbout">
        <div class="about-title">
          <div class="label">
            01 / A LITTLE ABOUT ME
          </div>
          <h2 class="curiosity-title"><span>保持</span><br><em>好奇。</em></h2>
          <span class="mini-sticker mini-sticker-wow about-float-sticker" aria-hidden="true">WOW</span>
        </div>
        <div class="copy">
          <span class="mini-sticker mini-sticker-note about-float-sticker" aria-hidden="true">脑内<br>施工中</span>
          <p>你好，我是露西西。一个喜欢把脑内画面变成立体世界的人。这里会慢慢放进我的实验、草稿、失败和突然灵光一现的作品。</p>
          <p>之后每个项目都会从这里出发，去往它自己的小宇宙。</p>
          <span class="stamp">STILL MAKING THINGS ✦</span>
        </div>
      </section>
      <VisualGallery />
      <section id="work" class="work wrap reveal">
        <div class="work-head">
          <div class="work-title-group">
            <div class="label">
              03 / SELECTED WORKS
            </div>
            <div class="work-title-line">
              <h2 class="works-lettering" aria-label="作品集"><span aria-hidden="true">作</span><span aria-hidden="true">品</span><span aria-hidden="true">集</span></h2>
              <img class="work-dancer" src="/assets/stickers/05-paper-dancer.svg" alt="纸片舞者贴图">
            </div>
          </div>
          <div class="work-doodle" aria-hidden="true">
            <span>挑一个</span>
            <i>↘</i>
          </div>
        </div>
        <div class="cards">
          <a class="card c3" href="/works/anatomy-visualizer" @click.prevent="onOpenAnatomy">
            <WorkCover kind="anatomy" />
            <span class="tag">3D / MODELING</span>
            <h3>人体结构<br>分解可视化 <span class="arrow">↗</span></h3>
          </a>
          <a class="card data-card" href="/works/city-heatmap" @click.prevent="onOpen">
            <WorkCover kind="city" />
            <span class="tag">DATA / CITY PULSE</span>
            <h3>城市热力<br>脉冲实验室 <span class="arrow">↗</span></h3>
          </a>
          <a class="card temple-card" href="/works/lake-sanctuary" @click.prevent="onOpenSanctuary">
            <WorkCover kind="temple" />
            <span class="tag">3D / MODELING · EXPLORE</span>
            <h3>湖心圣殿<br>3D建模 <span class="arrow">↗</span></h3>
          </a>
          <a class="card c2" href="/works/castle-battle" @click.prevent="onOpenCastle">
            <WorkCover kind="castle" />
            <span class="tag">GAME / PLAY</span>
            <h3>古堡战斗<br>小游戏</h3>
          </a>
          <a class="card c5" href="/works/brain-games" @click.prevent="onOpenBrain">
            <WorkCover kind="brain" />
            <span class="tag">GAME / PLAY</span>
            <h3>给大脑<br>找点麻烦</h3>
          </a>
          <button type="button" class="card c4 pending-work" @click="comingSoon.open('archive')">
            <WorkCover kind="archive" />
            <span class="tag">ARCHIVE / COMING SOON</span>
            <h3>虚构物种<br>档案</h3>
          </button>
          <button type="button" class="card c7 pending-work" @click="comingSoon.open('werewolf')">
            <WorkCover kind="werewolf" />
            <span class="tag">GAME / COMING SOON</span>
            <h3>狼人杀<br>夜间游戏</h3>
          </button>
          <button type="button" class="card c6 pending-work" @click="comingSoon.open('more')">
            <WorkCover kind="more" />
            <span class="tag">COMING SOON</span>
            <h3>更多<br>正在生成</h3>
          </button>
        </div>
      </section>
      <ContactSection />
    </main>
    <footer class="wrap">
      © 2026 LUXIXI / MADE WITH CURIOSITY
    </footer>
    <ComingSoonDialog ref="comingSoon" />
  </div>
</template>
<style scoped>
.mobile-hero-actions,.mobile-doodle{display:none}
@media(max-width:700px){
  .site .hero{height:auto;min-height:calc(85svh - 68px);padding-block:92px 100px;align-items:start}
  .hero .content{width:100%;min-width:0}
  .hero h1{margin:24px 0 26px}
  .hero p{margin-left:8%;width:92%;max-width:310px;padding:12px 14px}
  .mobile-hero-actions{display:flex;align-items:center;gap:18px;margin:22px 0 0 8%;pointer-events:auto;flex-wrap:wrap}
  .mobile-hero-actions a{font:600 12px/1.5 'Microsoft YaHei',sans-serif;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
  .hero-work-link{padding:0 14px;background:var(--acid);color:#11150d;border:1px solid var(--acid);box-shadow:4px 4px 0 var(--blue);transform:rotate(-2deg)}
  .mobile-hero-actions a:focus-visible,.mobile-doodle:focus-visible{outline:2px solid var(--pink);outline-offset:5px}
  .hero .hero-doodle{display:none}
  .mobile-doodle{display:block;position:absolute;right:4%;top:180px;width:90px;padding:0;border:0;background:none;cursor:pointer;pointer-events:auto;color:var(--ink)}
  .mobile-doodle img{display:block;width:100%;transition:transform .25s ease;filter:drop-shadow(4px 5px 0 #6057ff55)}
  .mobile-doodle span{display:block;margin-top:6px;font:10px/1.5 'Microsoft YaHei',sans-serif;color:var(--acid)}
  .doodle-mood-1 img{transform:rotate(-14deg) translateY(-6px)}
  .doodle-mood-2 img{transform:rotate(12deg) scale(1.1)}
  .hero .sticker-spark{top:5%;left:65%;font-size:32px}
  .site .hero .scroll{left:auto;right:16px;bottom:26px}
}
@media(max-width:700px) and (prefers-reduced-motion:reduce){.mobile-doodle img{transition:none}}
.pending-work { width: 100%; font: inherit; text-align: left; cursor: pointer; }
.pending-work:focus-visible { outline: 2px solid var(--acid); outline-offset: 4px; }

.works-lettering{display:inline-flex;isolation:isolate;position:relative;gap:.06em;white-space:nowrap;line-height:1.15;letter-spacing:0!important}
.works-lettering:after{content:'';position:absolute;bottom:-.1em;left:2%;width:96%;height:9px;border-bottom:3px solid var(--pink,#ff78b7);border-radius:50%;transform:rotate(-5deg);z-index:-1}
.works-lettering span{display:inline-block;transition:transform .35s cubic-bezier(.2,.9,.3,1.4)}
.works-lettering span:nth-child(1){transform:rotate(-7deg)}
.works-lettering span:nth-child(2){color:transparent;-webkit-text-stroke:1.5px var(--acid);transform:translateY(-.07em) rotate(4deg)}
.works-lettering span:nth-child(3){transform:rotate(-3deg);text-shadow:3px 3px 0 #6057ff}
.works-lettering:hover span:nth-child(1){transform:translateY(-5px) rotate(-11deg)}
.works-lettering:hover span:nth-child(2){transform:translateY(-.13em) rotate(0)}
.works-lettering:hover span:nth-child(3){transform:translateY(-3px) rotate(5deg)}
@media(max-width:700px){.works-lettering{font-size:clamp(40px,12vw,60px)}}
@media(prefers-reduced-motion:reduce){.works-lettering span{transition:none}.works-lettering:hover span{transform:none}}

.about {
  padding-block: 110px;
}

@media (max-width: 700px) {
  .about {
    padding-block: 80px;
  }

  .hero .sticker-eye,
  .hero .sticker-ticket,
  .copy .mini-sticker-note {
    display: none;
  }

  /* Extend the backdrop to both edges while keeping the content gutter. */
  .hero.wrap {
    width: 100%;
    padding-inline: 16px;
  }

  .hero .scroll {
    left: 16px;
  }

}
</style>
