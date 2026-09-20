import { postJson } from './http'
export const contactApi = { create: (payload) => postJson('/api/v1/contact-messages', payload) }
