import { createThread, sendMessage, deleteThread, updateAssistant } from './backboard.js'

// Neutral system prompt — wipes any old persona baked into the Backboard assistant
const NEUTRAL_SYSTEM = `You are a debate assistant with no identity of your own. Your only job is to respond exactly as the character described in each user message. Follow character instructions precisely. Keep all responses short.`
import { JUDGE, buildRoundPrompt, buildJudgePrompt } from './agents.js'

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim()
}

async function streamTurn(threadId, content, onToken) {
  const raw = await sendMessage(threadId, content)
  if (!raw) return ''
  const full = stripMarkdown(raw)

  // Simulate word-by-word streaming so the frontend sees live text
  const chunks = full.match(/\S+\s*/g) || []
  for (const chunk of chunks) {
    onToken(chunk)
    await new Promise(r => setTimeout(r, 30))
  }

  return full
}

function waitForNext(session) {
  return new Promise(resolve => {
    session.nextRoundResolve = resolve
  })
}

function detectWinner(judgment, forAgent, againstAgent) {
  const j = judgment.toLowerCase()
  const forScore = j.indexOf(forAgent.name.toLowerCase())
  const againstScore = j.indexOf(againstAgent.name.toLowerCase())
  if (forScore === -1 && againstScore === -1) return null
  if (forScore === -1) return { ...againstAgent, side: 'against' }
  if (againstScore === -1) return { ...forAgent, side: 'for' }
  // Whichever name appears first in the judgment is likely the winner
  return forScore < againstScore
    ? { ...forAgent, side: 'for' }
    : { ...againstAgent, side: 'against' }
}

export async function runDebate(session, broadcast) {
  const { question, assistantIds, forAgent, againstAgent } = session

  // Wipe old assistant personas so per-message injection takes full effect
  await Promise.all([
    updateAssistant(assistantIds.for_counsel, NEUTRAL_SYSTEM),
    updateAssistant(assistantIds.against_counsel, NEUTRAL_SYSTEM),
    updateAssistant(assistantIds.chief_justice, NEUTRAL_SYSTEM),
  ])

  // Create one thread per side + judge
  const forThread = await createThread(assistantIds.for_counsel)
  const againstThread = await createThread(assistantIds.against_counsel)
  const judgeThread = await createThread(assistantIds.chief_justice)

  session.threads = {
    for_counsel: forThread.thread_id,
    against_counsel: againstThread.thread_id,
    chief_justice: judgeThread.thread_id,
  }

  for (let round = 1; round <= 3; round++) {
    broadcast({ type: 'round_start', round })

    // FOR speaks
    broadcast({
      type: 'turn_start',
      side: 'for',
      agent: forAgent.key,
      agentName: forAgent.name,
      title: forAgent.title,
      color: forAgent.color,
      round,
    })

    const forPrompt = buildRoundPrompt(forAgent, 'for', question, session.transcript, round)
    const forContent = await streamTurn(
      session.threads.for_counsel,
      forPrompt,
      token => broadcast({ type: 'token', content: token })
    )

    session.transcript.push({ side: 'for', agent: forAgent.key, agentName: forAgent.name, title: forAgent.title, round, content: forContent })
    broadcast({ type: 'turn_end', side: 'for', content: forContent })

    // AGAINST speaks
    broadcast({
      type: 'turn_start',
      side: 'against',
      agent: againstAgent.key,
      agentName: againstAgent.name,
      title: againstAgent.title,
      color: againstAgent.color,
      round,
    })

    const againstPrompt = buildRoundPrompt(againstAgent, 'against', question, session.transcript, round)
    const againstContent = await streamTurn(
      session.threads.against_counsel,
      againstPrompt,
      token => broadcast({ type: 'token', content: token })
    )

    session.transcript.push({ side: 'against', agent: againstAgent.key, agentName: againstAgent.name, title: againstAgent.title, round, content: againstContent })
    broadcast({ type: 'turn_end', side: 'against', content: againstContent })

    // Signal round complete — wait for user to press Next
    broadcast({ type: 'round_complete', round, isLastRound: round === 3 })
    await waitForNext(session)
  }

  // Judge
  broadcast({ type: 'judgment_start' })

  const judgmentContent = await streamTurn(
    session.threads.chief_justice,
    buildJudgePrompt(question, session.transcript),
    token => broadcast({ type: 'judgment_token', content: token })
  )

  const winner = detectWinner(judgmentContent, forAgent, againstAgent)
  session.judgment = judgmentContent
  session.winner = winner
  session.status = 'complete'

  broadcast({ type: 'debate_complete', winner, judgment: judgmentContent })

  // Cleanup threads
  await Promise.all(Object.values(session.threads).map(id => deleteThread(id)))
}
