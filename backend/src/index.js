import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createSession, getSession, addClient, removeClient, publicSession } from './sessions.js'
import { runDebate } from './debate.js'
import { pickTwoAgents } from './agents.js'
import { listModels } from './backboard.js'

dotenv.config({ path: '../.env' })

const app = express()
app.use(cors())
app.use(express.json())

// Reuse two existing assistant IDs as generic FOR/AGAINST counsel containers.
// Persona is injected per-message — the original system prompts are overridden.
const ASSISTANT_IDS = {
  for_counsel:    process.env.AGENT_SENATOR_ALARMUS,
  against_counsel: process.env.AGENT_SIR_TECHNOBRO,
  chief_justice:  process.env.AGENT_CHIEF_JUSTICE,
}

function sse(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function broadcast(session, event) {
  for (const client of session.clients) sse(client, event)
}

// GET /models — list available Backboard models
app.get('/models', async (req, res) => {
  try {
    const data = await listModels()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /debate — start a new debate
app.post('/debate', async (req, res) => {
  const { question } = req.body
  if (!question?.trim()) return res.status(400).json({ error: 'The Council requires a question.' })

  const missing = Object.entries(ASSISTANT_IDS).find(([, v]) => !v)
  if (missing) return res.status(500).json({ error: `Missing env var for ${missing[0]}. Run npm run setup.` })

  const { forAgent, againstAgent } = pickTwoAgents()
  const session = createSession(question.trim(), ASSISTANT_IDS, forAgent, againstAgent)

  res.json({ sessionId: session.id, forAgent, againstAgent })

  runDebate(session, event => broadcast(session, event)).catch(err => {
    console.error('Debate error:', err)
    broadcast(session, { type: 'error', message: err.message })
  })
})

// POST /debate/:id/next — advance to next round (or judgment)
app.post('/debate/:id/next', (req, res) => {
  const session = getSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found.' })
  if (!session.nextRoundResolve) return res.status(400).json({ error: 'Not waiting for next.' })

  session.nextRoundResolve()
  session.nextRoundResolve = null
  res.json({ ok: true })
})

// GET /debate/:id/stream — SSE stream
app.get('/debate/:id/stream', (req, res) => {
  const session = getSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found.' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  if (session.status === 'complete') {
    sse(res, { type: 'replay', session: publicSession(session) })
    res.end()
    return
  }

  addClient(req.params.id, res)
  req.on('close', () => removeClient(req.params.id, res))
})

// GET /session/:id — replay data
app.get('/session/:id', (req, res) => {
  const session = getSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found.' })
  res.json(publicSession(session))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Dumb Council backend on http://localhost:${PORT}`))
