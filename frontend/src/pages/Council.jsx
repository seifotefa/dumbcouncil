import { useEffect, useReducer, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import styles from './Council.module.css'

const ROUND_LABELS = {
  1: 'Round I — Opening Arguments',
  2: 'Round II — Rebuttals',
  3: 'Round III — Closing Statements',
}

const initialState = {
  phase: 'connecting',
  round: 0,
  isLastRound: false,
  currentSide: null,
  entries: [],    // { side, agentName, title, color, round, content, isJudgment, streaming }
  winner: null,
  forAgent: null,
  againstAgent: null,
  question: '',
  error: null,
}

function reducer(state, action) {
  switch (action.type) {

    case 'init':
      return { ...state, question: action.question, forAgent: action.forAgent, againstAgent: action.againstAgent }

    case 'round_start':
      return { ...state, phase: 'debating', round: action.round }

    case 'turn_start':
      // Create the entry immediately — tokens will update it in-place
      return {
        ...state,
        currentSide: action.side,
        entries: [
          ...state.entries,
          {
            side: action.side,
            agentName: action.agentName,
            title: action.title,
            color: action.color,
            round: action.round,
            content: '',
            isJudgment: false,
            streaming: true,
          },
        ],
      }

    case 'token': {
      if (!state.entries.length) return state
      const entries = [...state.entries]
      const last = { ...entries[entries.length - 1] }
      last.content += action.content
      entries[entries.length - 1] = last
      return { ...state, entries }
    }

    case 'turn_end': {
      // Mark last entry as done; prefer frontend-accumulated content over backend's
      const entries = [...state.entries]
      const last = { ...entries[entries.length - 1] }
      last.streaming = false
      if (action.content && !last.content) last.content = action.content
      entries[entries.length - 1] = last
      return { ...state, currentSide: null, entries }
    }

    case 'round_complete':
      return { ...state, phase: 'round_complete', isLastRound: action.isLastRound }

    case 'judgment_start':
      return {
        ...state,
        phase: 'judgment',
        currentSide: 'judge',
        entries: [
          ...state.entries,
          {
            side: 'judge',
            agentName: 'Chief Justice Verdictus',
            title: 'Supreme Arbiter of the Council',
            color: '#c9a84c',
            round: 0,
            content: '',
            isJudgment: true,
            streaming: true,
          },
        ],
      }

    case 'judgment_token': {
      if (!state.entries.length) return state
      const entries = [...state.entries]
      const last = { ...entries[entries.length - 1] }
      last.content += action.content
      entries[entries.length - 1] = last
      return { ...state, entries }
    }

    case 'debate_complete': {
      const entries = [...state.entries]
      const last = { ...entries[entries.length - 1] }
      last.streaming = false
      if (action.judgment && !last.content) last.content = action.judgment
      entries[entries.length - 1] = last
      return { ...state, phase: 'complete', winner: action.winner, currentSide: null, entries }
    }

    case 'error':
      return { ...state, phase: 'error', error: action.message }

    case 'replay': {
      const s = action.session
      const entries = [
        ...s.transcript.map(t => ({
          side: t.side,
          agentName: t.agentName,
          title: t.title,
          color: t.side === 'for' ? s.forAgent?.color : s.againstAgent?.color,
          round: t.round,
          content: t.content,
          isJudgment: false,
          streaming: false,
        })),
        ...(s.judgment ? [{
          side: 'judge',
          agentName: 'Chief Justice Verdictus',
          title: 'Supreme Arbiter of the Council',
          color: '#c9a84c',
          round: 0,
          content: s.judgment,
          isJudgment: true,
          streaming: false,
        }] : []),
      ]
      return {
        ...state,
        phase: 'complete',
        question: s.question,
        forAgent: s.forAgent,
        againstAgent: s.againstAgent,
        entries,
        winner: s.winner,
      }
    }

    default:
      return state
  }
}

function AgentProfile({ agent, side, isActive, isWinner }) {
  if (!agent) return <div className={styles.agentPlaceholder} />
  const sideColor = side === 'for' ? 'var(--for)' : 'var(--against)'
  const label = side === 'for' ? 'FOR' : 'AGAINST'
  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2)

  return (
    <div
      className={`${styles.agentProfile} ${isActive ? styles.agentActive : ''} ${isWinner ? styles.agentWinner : ''}`}
      style={{ '--side-color': sideColor, '--agent-color': agent.color }}
    >
      <div className={styles.sideLabel} style={{ background: sideColor }}>{label}</div>
      <div className={styles.avatar} style={{ background: agent.color }}>{initials}</div>
      <div className={styles.agentName}>{agent.name}</div>
      <div className={styles.agentTitle}>{agent.title}</div>
      {isActive && <div className={styles.speakingRing} />}
      {isWinner && <div className={styles.winnerCrown}>WINNER</div>}
    </div>
  )
}

function SpeechBlock({ entry }) {
  const sideColor = entry.side === 'for' ? 'var(--for)' : entry.side === 'against' ? 'var(--against)' : 'var(--gold)'

  return (
    <div
      className={`${styles.speech} ${entry.side === 'for' ? styles.speechFor : ''} ${entry.isJudgment ? styles.speechJudge : ''}`}
      style={{ '--side-color': sideColor }}
    >
      <div className={styles.speechMeta}>
        <span className={styles.speechName} style={{ color: entry.color || sideColor }}>{entry.agentName}</span>
        {!entry.isJudgment && (
          <span className={styles.speechSide} style={{ color: sideColor }}>
            {entry.side === 'for' ? 'FOR' : 'AGAINST'}
          </span>
        )}
        {entry.isJudgment && <span className={styles.speechSide} style={{ color: 'var(--gold)' }}>VERDICT</span>}
        {entry.streaming && <span className={styles.speakingDot} style={{ background: sideColor }} />}
      </div>
      <p className={styles.speechText}>
        {entry.content || (entry.streaming ? <span className={styles.thinking}>deliberating…</span> : '')}
        {entry.streaming && entry.content && (
          <span className={styles.cursor} style={{ color: sideColor }}>▌</span>
        )}
      </p>
    </div>
  )
}

export default function Council() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, dispatch] = useReducer(reducer, initialState)
  const feedRef = useRef(null)

  useEffect(() => {
    const nav = location.state
    if (nav?.forAgent && nav?.againstAgent) {
      dispatch({ type: 'init', question: nav.question, forAgent: nav.forAgent, againstAgent: nav.againstAgent })
    } else {
      fetch(`/session/${sessionId}`)
        .then(r => r.json())
        .then(d => { if (d.forAgent) dispatch({ type: 'init', question: d.question, forAgent: d.forAgent, againstAgent: d.againstAgent }) })
        .catch(() => {})
    }

    const es = new EventSource(`/debate/${sessionId}/stream`)
    es.onmessage = e => {
      try {
        const event = JSON.parse(e.data)
        if (event.type === 'replay') dispatch({ type: 'replay', session: event.session })
        else dispatch(event)
      } catch {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [sessionId])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [state.entries])

  async function handleNext() {
    await fetch(`/debate/${sessionId}/next`, { method: 'POST' })
  }

  // Group non-judgment entries by round for display
  const byRound = []
  for (const entry of state.entries) {
    if (entry.isJudgment) continue
    const existing = byRound.find(r => r.round === entry.round)
    if (existing) existing.entries.push(entry)
    else byRound.push({ round: entry.round, entries: [entry] })
  }
  const judgmentEntry = state.entries.find(e => e.isJudgment)
  const isActiveFor = state.currentSide === 'for'
  const isActiveAgainst = state.currentSide === 'against'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo} onClick={() => navigate('/')}>⚖ Dumb Council</span>
        {state.question && <span className={styles.question}>"{state.question}"</span>}
        {state.round > 0 && (
          <span className={styles.roundPill}>
            {state.phase === 'judgment' ? 'Judgment'
              : state.phase === 'complete' ? 'Session Complete'
              : ROUND_LABELS[state.round]}
          </span>
        )}
      </header>

      <div className={styles.bench}>
        <AgentProfile agent={state.forAgent} side="for" isActive={isActiveFor} isWinner={state.winner?.side === 'for'} />
        <div className={styles.vs}>VS</div>
        <AgentProfile agent={state.againstAgent} side="against" isActive={isActiveAgainst} isWinner={state.winner?.side === 'against'} />
      </div>

      <div className={styles.feed} ref={feedRef}>
        {state.phase === 'connecting' && (
          <div className={styles.status}>The Council is convening. Stand by.</div>
        )}

        {byRound.map(({ round, entries }) => (
          <div key={round} className={styles.roundBlock}>
            <div className={styles.roundLabel}>{ROUND_LABELS[round]}</div>
            {entries.map((entry, i) => <SpeechBlock key={i} entry={entry} />)}
          </div>
        ))}

        {judgmentEntry && (
          <div className={styles.roundBlock}>
            <div className={styles.roundLabel} style={{ color: 'var(--gold)', borderColor: 'var(--gold-dim)' }}>
              Judgment
            </div>
            <SpeechBlock entry={judgmentEntry} />
            {state.phase === 'complete' && state.winner && (
              <div className={styles.verdictBanner}>
                The Council finds in favour of <strong>{state.winner.name}</strong>
              </div>
            )}
          </div>
        )}

        {state.phase === 'error' && (
          <div className={styles.error}>
            The Council cannot convene at this time. A quorum has not been reached.
            {state.error && <small>{state.error}</small>}
          </div>
        )}

        <div style={{ height: 8 }} />
      </div>

      {(state.phase === 'round_complete' || state.phase === 'complete') && (
        <div className={styles.actionBar}>
          {state.phase === 'round_complete' && (
            <button className="btn-primary" onClick={handleNext}>
              {state.isLastRound ? 'Summon the Judge →' : `${ROUND_LABELS[state.round + 1]} →`}
            </button>
          )}
          {state.phase === 'complete' && (
            <>
              <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/session/${sessionId}`)}>
                Copy Share Link
              </button>
              <button className="btn-ghost" onClick={() => navigate('/')}>New Session</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
