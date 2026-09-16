// Shared import functions let idle preparation and navigation reuse modules.
export const loadCityHeatmap = () => import('./components/CityHeatmap.vue')
export const loadAnatomyVisualizer = () => import('./components/AnatomyVisualizer.vue')

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
