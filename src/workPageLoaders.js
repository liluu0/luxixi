// Shared import functions let idle preparation and route loading reuse modules.
export const loadLakeSanctuary = () => import('./components/LakeSanctuary.vue')
export const loadCastleBattle = () => import('./components/CastleBattle.vue')
export const loadCityHeatmap = () => import('./components/CityHeatmap.vue')
export const loadAnatomyVisualizer = () => import('./components/AnatomyVisualizer.vue')
export const loadBrainGames = () => import('./components/BrainGames.vue')

export const workPageDefinitions = Object.freeze({
  'lake-sanctuary': Object.freeze({
    loader: loadLakeSanctuary,
    theme: 'sanctuary',
    icon: 'orbit',
    kicker: 'AURELIA SANCTUARY',
    title: '湖心圣殿',
    loadingLabel: '正在穿过湖上的雾',
    code: 'SELECTED WORK / 03',
    documentTitle: '湖心圣殿 · 3D建模 | LUXIXI',
    passesBack: false,
  }),
  'castle-battle': Object.freeze({
    loader: loadCastleBattle,
    theme: 'castle',
    icon: 'shield',
    kicker: '灰烬钟庭',
    title: '古堡战斗小游戏',
    loadingLabel: '正在开启古堡大门',
    code: 'SELECTED WORK / 02',
    documentTitle: '灰烬钟庭 · 古堡战斗 | LUXIXI',
    passesBack: true,
  }),
  'city-heatmap': Object.freeze({
    loader: loadCityHeatmap,
    theme: 'city',
    icon: 'activity',
    kicker: 'URBAN PULSE',
    title: '城市热力脉冲实验室',
    loadingLabel: '正在连接城市信号',
    code: 'EXPERIMENT / 001',
    documentTitle: '城市热力脉冲实验室 | LUXIXI',
    passesBack: true,
  }),
  'anatomy-visualizer': Object.freeze({
    loader: loadAnatomyVisualizer,
    theme: 'anatomy',
    icon: 'scan',
    kicker: 'ANATOMY / EXPLORER',
    title: '人体结构分解可视化',
    loadingLabel: '正在建立结构索引',
    code: 'DIGITAL ATLAS / 003',
    documentTitle: '人体结构分解可视化 | LUXIXI',
    passesBack: true,
  }),
  'brain-games': Object.freeze({
    loader: loadBrainGames,
    theme: 'brain',
    icon: 'brain',
    kicker: 'PLAY / THE MIND LAB',
    title: '给大脑找点麻烦',
    loadingLabel: '正在准备挑战',
    code: 'LUXIXI LAB / 005',
    documentTitle: '给大脑找点麻烦 | LUXIXI',
    passesBack: true,
  }),
})

export const getWorkPageDefinition = id => workPageDefinitions[id] || null

export function prepareWorkPagesWhenIdle() {
  const queue = [loadCityHeatmap, loadAnatomyVisualizer]
  let stopped = false
  let timer
  let idle
  const connection = navigator.connection
  const constrained = () => connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType || '')

  function schedule() {
    if (stopped || !queue.length || constrained()) return
    // Let the initial screen settle, and leave a gap between the two imports.
    timer = setTimeout(() => {
      if (stopped) return
      if ('requestIdleCallback' in window) idle = requestIdleCallback(run)
      else run()
    }, 1500)
  }

  async function run() {
    if (stopped || constrained()) return
    const galleryBusy = [...document.querySelectorAll('.gallery-slide img')].some(image => !image.complete)
    if (document.hidden || galleryBusy) {
      schedule()
      return
    }
    try {
      // Importing the component does not mount it or download its 3D model.
      await queue.shift()()
    } catch {
      // Prefetch is optional; a normal navigation can retry a failed request.
    }
    schedule()
  }

  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })

  return () => {
    stopped = true
    clearTimeout(timer)
    if ('cancelIdleCallback' in window) cancelIdleCallback(idle)
    window.removeEventListener('load', schedule)
    // An import already in flight cannot be aborted; no new imports are started.
  }
}
