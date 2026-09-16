import { defineAsyncComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './components/HomePage.vue'
import CityHeatmap from './components/CityHeatmap.vue'
import AnatomyVisualizer from './components/AnatomyVisualizer.vue'

const BrainGames = defineAsyncComponent(() => import('./components/BrainGames.vue'))
const CastleBattle = defineAsyncComponent(() => import('./components/CastleBattle.vue'))

export const routePaths = {
  home: '/',
  cityHeatmap: '/works/city-heatmap',
  anatomyVisualizer: '/works/anatomy-visualizer',
  castleBattle: '/works/castle-battle',
  brainGames: '/works/brain-games',
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: routePaths.home,
      name: 'home',
      component: HomePage,
      props: {
        onOpen: () => router.push({ name: 'city-heatmap' }),
        onOpenAnatomy: () => router.push({ name: 'anatomy-visualizer' }),
        onOpenCastle: () => router.push({ name: 'castle-battle' }),
        onOpenBrain: () => router.push({ name: 'brain-games' }),
      },
    },
    {
      path: routePaths.cityHeatmap,
      name: 'city-heatmap',
      component: CityHeatmap,
      props: { onBack: () => router.push({ name: 'home' }) },
    },
    {
      path: routePaths.anatomyVisualizer,
      name: 'anatomy-visualizer',
      component: AnatomyVisualizer,
      props: { onBack: () => router.push({ name: 'home' }) },
    },
    {
      path: routePaths.castleBattle,
      name: 'castle-battle',
      component: CastleBattle,
      props: { onBack: () => router.push({ name: 'home' }) },
    },
    {
      path: routePaths.brainGames,
      name: 'brain-games',
      component: BrainGames,
      props: { onBack: () => router.push({ name: 'home' }) },
    },
    { path: '/:pathMatch(.*)*', redirect: routePaths.home },
  ],
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

export default router
