import { postJson } from './http'

export function recordHomeVisit() {
  return postJson('/api/v1/visit-events', { path: '/' })
}
