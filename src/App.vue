<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue'
import HomePage from './components/HomePage.vue'
import CityHeatmap from './components/CityHeatmap.vue'
import AnatomyVisualizer from './components/AnatomyVisualizer.vue'
const BrainGames = defineAsyncComponent(() => import('./components/BrainGames.vue'))
const CastleBattle = defineAsyncComponent(() => import('./components/CastleBattle.vue'))
const path=ref(location.pathname)
const openWork=()=>{history.pushState({},'', '/works/city-heatmap');path.value=location.pathname;window.scrollTo(0,0)}
const openAnatomy=()=>{history.pushState({},'', '/works/anatomy-visualizer');path.value=location.pathname;window.scrollTo(0,0)}
const openCastle=()=>{history.pushState({},'', '/works/castle-battle');path.value=location.pathname;window.scrollTo(0,0)}
const openBrain=()=>{history.pushState({},'', '/works/brain-games');path.value=location.pathname;window.scrollTo(0,0)}
const closeWork=()=>{history.pushState({},'', '/');path.value='/';window.scrollTo(0,0)}
onMounted(()=>addEventListener('popstate',()=>{path.value=location.pathname;window.scrollTo(0,0)}))
</script>
<template><CityHeatmap v-if="path==='/works/city-heatmap'" :on-back="closeWork"/><AnatomyVisualizer v-else-if="path==='/works/anatomy-visualizer'" :on-back="closeWork"/><CastleBattle v-else-if="path==='/works/castle-battle'" :on-back="closeWork"/><BrainGames v-else-if="path==='/works/brain-games'" :on-back="closeWork"/><HomePage v-else :on-open="openWork" :on-open-anatomy="openAnatomy" :on-open-castle="openCastle" :on-open-brain="openBrain"/></template>
