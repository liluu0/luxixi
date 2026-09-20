const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
export async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || '请求失败，请稍后重试')
  return data
}
