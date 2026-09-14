<script setup>
import { ref, onMounted } from 'vue'
import HomePage from './components/HomePage.vue'
import CityHeatmap from './components/CityHeatmap.vue'
const path=ref(location.pathname)
const openWork=()=>{history.pushState({},'', '/works/city-heatmap');path.value=location.pathname;window.scrollTo(0,0)}
const closeWork=()=>{history.pushState({},'', '/');path.value='/';window.scrollTo(0,0)}
onMounted(()=>addEventListener('popstate',()=>{path.value=location.pathname;window.scrollTo(0,0)}))
</script>
<template><CityHeatmap v-if="path==='/works/city-heatmap'" :on-back="closeWork"/><HomePage v-else :on-open="openWork"/></template>
