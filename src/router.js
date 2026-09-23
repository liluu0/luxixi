import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './components/HomePage.vue'
import WorkRouteShell from './components/WorkRouteShell.vue'

export const routePaths = {
  home: '/',
  cityHeatmap: '/works/city-heatmap',
  anatomyVisualizer: '/works/anatomy-visualizer',
  castleBattle: '/works/castle-battle',
  brainGames: '/works/brain-games',
  lakeSanctuary: '/works/lake-sanctuary',
}

const openWork = name => router.push({ name })

const workRoute = (path, name) => ({
  path,
  name,
  component: WorkRouteShell,
  props: { workId: name },
})

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: routePaths.home,
      name: 'home',
      component: HomePage,
      props: {
        onOpen: () => openWork('city-heatmap'),
        onOpenAnatomy: () => openWork('anatomy-visualizer'),
        onOpenCastle: () => openWork('castle-battle'),
        onOpenBrain: () => openWork('brain-games'),
        onOpenSanctuary: () => openWork('lake-sanctuary'),
      },
    },
    workRoute(routePaths.cityHeatmap, 'city-heatmap'),
    workRoute(routePaths.anatomyVisualizer, 'anatomy-visualizer'),
    workRoute(routePaths.castleBattle, 'castle-battle'),
    workRoute(routePaths.brainGames, 'brain-games'),
    workRoute(routePaths.lakeSanctuary, 'lake-sanctuary'),
    { path: '/:pathMatch(.*)*', redirect: routePaths.home },
  ],
  scrollBehavior: to => to.hash ? { el: to.hash, top: 24 } : { left: 0, top: 0 },
})

export default router
