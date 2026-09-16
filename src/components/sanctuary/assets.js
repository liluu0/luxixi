import version from './modelVersion.json'

// Change the URL when the Blender source is re-exported so deployed browsers
// cannot pair an updated page with a cached older model or render.
const revision = version.sourceSha256.slice(0, 12)
export const modelUrl = `/assets/lake-sanctuary/aurelia-sanctuary-v3.glb?v=${revision}`
export const previewUrl = `/assets/lake-sanctuary/preview.png?v=${revision}`
