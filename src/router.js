import { defineAsyncComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './components/HomePage.vue'
import { loadCityHeatmap, loadAnatomyVisualizer } from './workPageLoaders'

const BrainGames = defineAsyncComponent(() => import('./components/BrainGames.vue'))
const CastleBattle = defineAsyncComponent(() => import('./components/CastleBattle.vue'))

export const routePaths = {
  home: '/',
  cityHeatmap: '/works/city-heatmap',
  anatomyVisualizer: '/works/anatomy-visualizer',
  castleBattle: '/works/castle-battle',
  brainGames: '/works/brain-games',
  lakeSanctuary: '/works/lake-sanctuary',
}

let navigationPromise
function openWork(name, path) {
  if (navigationPromise) return navigationPromise
  navigationPromise = router.push({ name }).catch(error => {
    // A stale or failed lazy chunk otherwise leaves the homepage looking inert.
    console.error(`作品页面加载失败：${path}`, error)
    if (window.location.pathname !== path) window.location.assign(path)
  }).finally(() => { navigationPromise = null })
  return navigationPromise
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: routePaths.home,
      name: 'home',
      component: HomePage,
      props: {
        onOpen: () => openWork('city-heatmap', routePaths.cityHeatmap),
        onOpenAnatomy: () => openWork('anatomy-visualizer', routePaths.anatomyVisualizer),
        onOpenCastle: () => openWork('castle-battle', routePaths.castleBattle),
        onOpenBrain: () => openWork('brain-games', routePaths.brainGames),
        onOpenSanctuary: () => openWork('lake-sanctuary', routePaths.lakeSanctuary),
      },
    },
    {
      path: routePaths.cityHeatmap,
      name: 'city-heatmap',
      component: loadCityHeatmap,
      props: { onBack: () => router.push({ name: 'home', hash: '#work' }) },
    },
    {
      path: routePaths.anatomyVisualizer,
      name: 'anatomy-visualizer',
      component: loadAnatomyVisualizer,
      props: { onBack: () => router.push({ name: 'home', hash: '#work' }) },
    },
    {
      path: routePaths.castleBattle,
      name: 'castle-battle',
      component: CastleBattle,
      props: { onBack: () => router.push({ name: 'home', hash: '#work' }) },
    },
    {
      path: routePaths.brainGames,
      name: 'brain-games',
      component: BrainGames,
      props: { onBack: () => router.push({ name: 'home', hash: '#work' }) },
    },
    {
      path: routePaths.lakeSanctuary,
      name: 'lake-sanctuary',
      component: () => import('./components/LakeSanctuary.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: routePaths.home },
  ],
  scrollBehavior: to => to.hash ? { el: to.hash, top: 24 } : { left: 0, top: 0 },
})

export default router
