import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })

const BASE = 'https://app.backboard.io/api'
const KEY = process.env.BACKBOARD_API_KEY

export async function updateAssistant(assistantId, systemPrompt) {
  // Try PUT first, fall back to PATCH
  for (const method of ['PUT', 'PATCH']) {
    const res = await fetch(`${BASE}/assistants/${assistantId}`, {
      method,
      headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_prompt: systemPrompt }),
    })
    if (res.ok) { console.log(`updateAssistant OK (${method})`); return }
    console.warn(`updateAssistant ${method} ${assistantId}: ${res.status} ${await res.text()}`)
  }
}

export async function createAssistant(name, systemPrompt) {
  const res = await fetch(`${BASE}/assistants`, {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, system_prompt: systemPrompt }),
  })
  if (!res.ok) throw new Error(`createAssistant failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function createThread(assistantId) {
  const res = await fetch(`${BASE}/assistants/${assistantId}/threads`, {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error(`createThread failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function deleteThread(threadId) {
  const res = await fetch(`${BASE}/threads/${threadId}`, {
    method: 'DELETE',
    headers: { 'X-API-Key': KEY },
  })
  if (!res.ok) console.warn(`deleteThread ${threadId} failed: ${res.status}`)
}

export async function listModels() {
  const res = await fetch(`${BASE}/models`, {
    headers: { 'X-API-Key': KEY },
  })
  if (!res.ok) throw new Error(`listModels failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sendMessage(threadId, content) {
  const form = new URLSearchParams()
  form.append('content', content)
  form.append('stream', 'false')
  form.append('llm_provider', 'google')
  form.append('model_name', 'gemini-2.5-flash')
  form.append('memory', 'off')

  const res = await fetch(`${BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'X-API-Key': KEY },
    body: form,
  })
  if (!res.ok) throw new Error(`sendMessage failed: ${res.status} ${await res.text()}`)

  const data = await res.json()
  console.log('[backboard] response status:', data.status, '| content length:', (data.content || '').length)
  if (!data.content) console.error('[backboard] empty content, full response:', JSON.stringify(data))
  return data.content || ''
}
