export const DATA_ROOT = '/assets/anatomy/'

export const SYSTEMS = [
  { id: 'skeletal', name: '骨骼', en: 'Skeleton', color: '#e1e7dc' },
  { id: 'muscular', name: '肌肉', en: 'Muscles', color: '#be6661' },
  { id: 'cardiac', name: '心脏', en: 'Heart', color: '#ef6b69' },
  { id: 'arterial', name: '动脉', en: 'Arteries', color: '#da6257' },
  { id: 'venous', name: '静脉', en: 'Veins', color: '#598fc4' },
  { id: 'nervous', name: '神经', en: 'Nerves', color: '#f0ca6b' },
  { id: 'respiratory', name: '呼吸', en: 'Respiratory', color: '#d596a4' },
  { id: 'digestive', name: '消化', en: 'Digestive', color: '#b08e78' },
  { id: 'urinary', name: '泌尿', en: 'Urinary', color: '#ac7885' },
  { id: 'endocrine', name: '内分泌', en: 'Endocrine', color: '#d8a7a4' },
  { id: 'lymphatic', name: '淋巴', en: 'Lymphatic', color: '#92b987' },
  { id: 'sensory', name: '感觉器官', en: 'Sensory', color: '#8fbdc7' },
  { id: 'connective', name: '结缔组织', en: 'Connective', color: '#aac6b6' },
  { id: 'reproductive', name: '生殖', en: 'Reproductive', color: '#b89aaf' },
  { id: 'integumentary', name: '体表', en: 'Body surface', color: '#87b6b8' },
]

export const LANDMARKS = [
  { id: 'FMA7088', name: '心脏', aliases: ['心', 'heart'], note: '位于胸腔纵隔内的肌性器官。右心将血液送往肺循环，左心将血液送往体循环。' },
  { id: 'FMA50801', name: '大脑', aliases: ['脑', 'brain'], note: '中枢神经系统的主要部分，参与感觉、运动、记忆及自主功能的调节。' },
  { id: 'FMA46565', name: '颅骨', aliases: ['头骨', 'skull'], note: '颅骨围成颅腔并构成面部骨性框架，为脑和感觉器官提供保护。' },
  { id: 'FMA13478', name: '脊柱', aliases: ['脊椎', 'vertebral column', 'spine'], note: '脊柱构成躯干的中轴支架，保护椎管内的脊髓，并参与身体的负重与运动。' },
  { id: 'FMA7309', name: '右肺', aliases: ['肺', 'lung', 'right lung'], note: '右肺分为上、中、下三叶。气体交换发生在肺泡与周围毛细血管之间。' },
  { id: 'FMA7310', name: '左肺', aliases: ['left lung'], note: '左肺分为上、下两叶，内侧面与心脏相邻。' },
  { id: 'FMA7197', name: '肝脏', aliases: ['肝', 'liver'], note: '主要位于右上腹，参与物质代谢、胆汁生成以及多种血浆蛋白的合成。' },
  { id: 'FMA7148', name: '胃', aliases: ['stomach'], note: '连接食管与十二指肠的消化道器官，承担食物储存、混合与初步消化。' },
  { id: 'FMA7203', name: '肾脏', aliases: ['肾', 'kidney'], note: '肾脏过滤血液并形成尿液，参与体液、电解质和酸碱平衡的调节。' },
  { id: 'FMA3734', name: '主动脉', aliases: ['aorta'], note: '体循环的主要动脉，从左心室发出，经分支向各器官与组织输送血液。' },
  { id: 'FMA7480', name: '胸廓', aliases: ['肋骨', 'rib cage'], note: '由胸椎、肋骨及胸骨共同构成，保护胸腔脏器，并随呼吸发生形态变化。' },
]

export const PRESETS = [
  { id: 'body', name: '全身', systems: SYSTEMS.filter(s => s.id !== 'integumentary').map(s => s.id) },
  { id: 'skeleton', name: '骨骼', systems: ['skeletal', 'connective'] },
  { id: 'organs', name: '脏器', systems: ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine'] },
  { id: 'nerves', name: '神经', systems: ['nervous', 'sensory'] },
]

export function buildIndex(atlas) {
  const parts = new Map(atlas.parts.map(part => [part.id, part]))
  const named = atlas.concepts.map(concept => {
    const landmark = LANDMARKS.find(item => item.id === concept.id)
    return { ...concept, label: landmark?.name || concept.name, note: landmark?.note || '', search: [concept.id, concept.name, landmark?.name, ...(landmark?.aliases || [])].filter(Boolean).join(' ').toLowerCase() }
  })
  const byId = new Map(named.map(concept => [concept.id, concept]))
  return { parts, named, byId }
}

export function searchIndex(index, query) {
  const term = query.trim().toLowerCase().replace(/^(请|帮我|显示|聚焦|查看|只看|定位|找到)+/, '').trim()
  if (!term) return LANDMARKS.map(item => index.byId.get(item.id)).filter(Boolean).slice(0, 6)
  return index.named.filter(item => item.search.includes(term)).sort((a, b) => {
    const score = item => item.label.toLowerCase() === term || item.name.toLowerCase() === term || item.id.toLowerCase() === term ? 0 : LANDMARKS.some(mark => mark.id === item.id) ? 1 : 2
    return score(a) - score(b) || a.name.localeCompare(b.name)
  }).slice(0, 30)
}

export async function loadChunk(chunk, signal) {
  const response = await fetch(DATA_ROOT + chunk.gzip.split('/').pop(), { signal })
  if (!response.ok) throw new Error('模型数据加载失败，请重试。')
  let buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength))
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持模型解压，请使用新版 Chrome、Edge 或 Safari。')
    buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  }
  if (buffer.byteLength !== chunk.bytes) throw new Error('模型数据不完整，请重试。')
  return buffer
}
