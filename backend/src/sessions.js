import { randomUUID } from 'crypto'

const sessions = new Map()

export function createSession(question, assistantIds, forAgent, againstAgent) {
  const id = randomUUID()
  const session = {
    id,
    question,
    assistantIds,
    forAgent,
    againstAgent,
    status: 'debating',
    threads: {},
    transcript: [],  // { side, agent, agentName, title, round, content }
    judgment: null,
    winner: null,
    clients: [],
    nextRoundResolve: null,
  }
  sessions.set(id, session)
  return session
}

export function getSession(id) {
  return sessions.get(id)
}

export function addClient(sessionId, res) {
  const session = sessions.get(sessionId)
  if (session) session.clients.push(res)
}

export function removeClient(sessionId, res) {
  const session = sessions.get(sessionId)
  if (session) session.clients = session.clients.filter(c => c !== res)
}

export function publicSession(session) {
  const { id, question, status, transcript, judgment, winner, forAgent, againstAgent } = session
  return { id, question, status, transcript, judgment, winner, forAgent, againstAgent }
}
