<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ComingSoonDialog from './ComingSoonDialog.vue'
import ContactSection from './ContactSection.vue'
defineProps({ onOpen: Function, onOpenAnatomy: Function, onOpenCastle: Function, onOpenBrain: Function })
const comingSoon = ref(null)
const hero = ref(null)
const aboutSection = ref(null)
const dots=Array.from({length:24},(_,i)=>({x:(i*37)%88+5,y:(i*53)%78+8}))
const stickerMood = ref(0)
const moods = ['AWAKE', 'POKE AGAIN', 'HUH?']
const pokeSticker = () => { stickerMood.value = (stickerMood.value + 1) % moods.length }
let observer
let pointerFrame
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
<template><div class="site"><header class="top wrap"><a class="logo" href="#top">LUXI<b>XI</b><i>✳</i></a><nav><a href="#about">ABOUT</a><a href="#work">WORKS</a><a href="#contact">CONTACT</a></nav><span class="availability">● AVAILABLE FOR FUN</span></header><main><section ref="hero" class="hero wrap" @pointermove="moveHero" @pointerleave="resetHero"><div class="hero-grid"/><div class="hero-noise"/><div class="content"><div class="eyebrow">/ 个人档案 001 — 自由创作者</div><h1>露<span>西西</span></h1><p><strong>我把好奇心做成可玩的东西。</strong><br>动画、三维、交互和一点点不合时宜的想象。</p></div><div class="sticker-field" aria-label="首页装饰贴图"><button type="button" class="sticker sticker-eye" :class="`mood-${stickerMood}`" :aria-label="`贴纸状态：${moods[stickerMood]}，点击切换`" @click="pokeSticker"><i/><i/><b>{{ moods[stickerMood] }}</b></button><img class="hero-doodle" src="/assets/stickers/02-free-doodle.svg" alt="自由涂鸦贴图"><div class="sticker sticker-ticket" aria-hidden="true"><span>NO.001</span><strong>奇怪<br>通行证</strong></div><div class="sticker sticker-spark" aria-hidden="true">✦</div><div class="sticker-orbit" aria-hidden="true"><span>PLAY</span><i>MAKE</i><b>WONDER</b></div></div><div class="scroll">↓ 向下探索</div><div class="signal">MOVE YOUR MOUSE / <b>POKE THE FACE</b></div></section><div class="play-ticker" aria-hidden="true"><div><span>KEEP IT WEIRD ✦</span><span>动起来才算数 ●</span><span>MAKE / BREAK / REMAKE ↗</span><span>好奇心正在加载中...</span><span>KEEP IT WEIRD ✦</span><span>动起来才算数 ●</span><span>MAKE / BREAK / REMAKE ↗</span><span>好奇心正在加载中...</span></div></div><section id="about" ref="aboutSection" class="about wrap reveal" @pointermove="moveAbout" @pointerleave="resetAbout"><div class="about-title"><div class="label">01 / A LITTLE ABOUT ME</div><h2 class="curiosity-title"><span>保持</span><br><em>好奇。</em></h2><span class="mini-sticker mini-sticker-wow about-float-sticker" aria-hidden="true">WOW</span></div><div class="copy"><span class="mini-sticker mini-sticker-note about-float-sticker" aria-hidden="true">脑内<br>施工中</span><p>你好，我是露西西。一个喜欢把脑内画面变成立体世界的人。这里会慢慢放进我的实验、草稿、失败和突然灵光一现的作品。</p><p>之后每个项目都会从这里出发，去往它自己的小宇宙。</p><span class="stamp">STILL MAKING THINGS ✦</span></div></section><section id="work" class="work wrap reveal"><div class="work-head"><div class="work-title-group"><div class="label">02 / SELECTED WORKS</div><div class="work-title-line"><h2>作品集</h2><img class="work-dancer" src="/assets/stickers/05-paper-dancer.svg" alt="纸片舞者贴图"></div></div><div class="work-doodle" aria-hidden="true"><span>挑一个</span><i>↘</i></div></div><div class="cards"><a class="card data-card" href="/works/city-heatmap" @click.prevent="onOpen"><span class="tag">DATA VISUALIZATION / 2025</span><div class="cover-map"><i v-for="d in dots" :key="d.x+d.y" :style="{left:d.x+'%',top:d.y+'%'}"/></div><h3>全国城市<br>热力数据大屏 <span class="arrow">↗</span></h3></a><a class="card c2" href="/works/castle-battle" @click.prevent="onOpenCastle"><span class="tag">GAME / PLAY</span><h3>古堡战斗<br>小游戏</h3></a><a class="card c3" href="/works/anatomy-visualizer" @click.prevent="onOpenAnatomy"><span class="tag">3D / MODELING</span><h3>人体结构<br>分解可视化 <span class="arrow">↗</span></h3></a><button type="button" class="card c4 pending-work" @click="comingSoon.open('archive')"><span class="tag">ARCHIVE / SPECULATIVE</span><h3>虚构物种<br>档案</h3></button><a class="card c5" href="/works/brain-games" @click.prevent="onOpenBrain"><span class="tag">GAME / PLAY</span><h3>给大脑<br>找点麻烦</h3></a><button type="button" class="card c6 pending-work" @click="comingSoon.open('more')"><span class="tag">COMING SOON</span><h3>更多<br>正在生成</h3></button></div></section><ContactSection /></main><footer class="wrap">© 2026 LUXIXI / MADE WITH CURIOSITY</footer><ComingSoonDialog ref="comingSoon" /></div></template>
<style scoped>
.pending-work { width: 100%; font: inherit; text-align: left; cursor: pointer; }
.pending-work:focus-visible { outline: 2px solid var(--acid); outline-offset: 4px; }
</style>
