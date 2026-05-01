import { useEffect, useReducer, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import styles from './Council.module.css'

const ROUND_LABELS = { 1: 'ROUND I', 2: 'ROUND II', 3: 'ROUND III' }

function strip(text) {
  if (!text) return text
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim()
}

const initialState = {
  phase: 'connecting',
  round: 0,
  isLastRound: false,
  currentSide: null,
  entries: [],
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
      const entries = [...state.entries]
      const last = { ...entries[entries.length - 1] }
      last.streaming = false
      last.content = strip(last.content || action.content || '')
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
            agentName: 'The Judge',
            title: 'Definitely Impartial',
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
      last.content = strip(last.content || action.judgment || '')
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
          agentName: 'The Judge',
          title: 'Definitely Impartial',
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

function Bubble({ entry, side }) {
  if (!entry) return null
  return (
    <div className={`${styles.bubble} ${side === 'judge' ? styles.bubbleJudge : ''}`}
         style={{ '--side-color': side === 'for' ? 'var(--for)' : side === 'against' ? 'var(--against)' : '#c9a84c' }}>
      <div className={styles.bubbleText}>
        {entry.content
          ? <>{entry.content}{entry.streaming && <span className={styles.cursor}>▌</span>}</>
          : entry.streaming
            ? <span className={styles.ellipsis}>▪ ▪ ▪</span>
            : null}
      </div>
    </div>
  )
}

function AgentAvatar({ agentKey, agentColor, agentName, large }) {
  const [failed, setFailed] = useState(false)
  const initials = agentName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  if (!failed) {
    return (
      <img
        src={`/sprites/${agentKey}.png`}
        className={large ? styles.avatarImgLarge : styles.avatarImg}
        alt={agentName}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className={large ? styles.avatarLarge : styles.avatar} style={{ background: agentColor }}>
      <span className={styles.avatarInitials}>{initials}</span>
    </div>
  )
}

function Character({ agent, side, isActive, isDimmed, isWinner, speech }) {
  if (!agent) return null
  const sideColor = side === 'for' ? 'var(--for)' : 'var(--against)'

  return (
    <div
      className={[
        styles.character,
        side === 'for' ? styles.charFor : styles.charAgainst,
        isActive ? styles.charActive : '',
        isDimmed && !isWinner ? styles.charDimmed : '',
        isWinner ? styles.charWinner : '',
      ].filter(Boolean).join(' ')}
      style={{ '--agent-color': agent.color, '--side-color': sideColor }}
    >
      <Bubble entry={speech} side={side} />

      <div className={styles.sprite}>
        <AgentAvatar agentKey={agent.key} agentColor={agent.color} agentName={agent.name} />
        {isActive && <div className={styles.speakingGlow} />}
      </div>

      <div className={styles.spriteMeta}>
        <div className={styles.sideTag} style={{ background: sideColor }}>
          {side === 'for' ? 'FOR' : 'AGAINST'}
        </div>
        <div className={styles.spriteName}>{agent.name}</div>
        <div className={styles.spriteTitle}>{agent.title}</div>
      </div>

      {isWinner && <div className={styles.winnerBadge}>★ WINNER ★</div>}
    </div>
  )
}

function JudgeCharacter({ isActive }) {
  return (
    <div
      className={[
        styles.judge,
        isActive ? styles.judgeActive : '',
      ].filter(Boolean).join(' ')}
      style={{ '--side-color': '#c9a84c' }}
    >
      <div className={styles.sprite}>
        <AgentAvatar agentKey="judge" agentColor="#c9a84c" agentName="The Judge" large />
        {isActive && <div className={styles.speakingGlow} />}
      </div>
      <div className={styles.spriteMeta}>
        <div className={styles.sideTag} style={{ background: '#c9a84c', color: '#1a1208' }}>VERDICT</div>
        <div className={styles.spriteName}>The Judge</div>
        <div className={styles.spriteTitle}>Definitely Impartial</div>
      </div>
    </div>
  )
}

export default function Council() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const nav = location.state
    if (nav?.forAgent && nav?.againstAgent) {
      dispatch({ type: 'init', question: nav.question, forAgent: nav.forAgent, againstAgent: nav.againstAgent })
    } else {
      const API = import.meta.env.VITE_API_URL || ''
      fetch(`${API}/session/${sessionId}`)
        .then(r => r.json())
        .then(d => { if (d.forAgent) dispatch({ type: 'init', question: d.question, forAgent: d.forAgent, againstAgent: d.againstAgent }) })
        .catch(() => {})
    }

    const API = import.meta.env.VITE_API_URL || ''
    const es = new EventSource(`${API}/debate/${sessionId}/stream`)
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

  async function handleNext() {
    const API = import.meta.env.VITE_API_URL || ''
    await fetch(`${API}/debate/${sessionId}/next`, { method: 'POST' })
  }

  async function handleDownloadVerdict() {
    const { question, winner, entries, forAgent, againstAgent } = state
    const judgment = entries.find(e => e.isJudgment)?.content || ''

    await document.fonts.load('bold 16px "Press Start 2P"')

    const W = 900, H = 600
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const c = canvas.getContext('2d')

    // Background
    c.fillStyle = '#0d0f14'
    c.fillRect(0, 0, W, H)

    // Outer gold border
    c.strokeStyle = '#c9a84c'
    c.lineWidth = 5
    c.strokeRect(18, 18, W - 36, H - 36)
    // Inner dim border
    c.strokeStyle = '#4a3a1a'
    c.lineWidth = 1
    c.strokeRect(28, 28, W - 56, H - 56)

    const cx = W / 2
    c.textAlign = 'center'

    // Title
    c.fillStyle = '#c9a84c'
    c.font = 'bold 18px "Press Start 2P", monospace'
    c.fillText('⚖  THE DUMB COUNCIL  ⚖', cx, 80)

    // Divider
    const div = (y) => { c.strokeStyle = '#4a3a1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(60, y); c.lineTo(W - 60, y); c.stroke() }
    div(100)

    // "has deliberated on"
    c.fillStyle = '#666'
    c.font = '8px "Press Start 2P", monospace'
    c.fillText('THE COUNCIL HAS DELIBERATED ON:', cx, 130)

    // Question
    c.fillStyle = '#e8e6e0'
    c.font = 'italic 17px Georgia, serif'
    drawWrapped(c, `"${question}"`, cx, 162, W - 140, 26)

    div(230)

    // Winner declaration
    c.fillStyle = '#888'
    c.font = '8px "Press Start 2P", monospace'
    c.fillText('AND HEREBY DECLARES THE WINNER:', cx, 260)

    const winColor = winner?.side === 'for' ? '#27ae60' : '#e74c3c'
    c.fillStyle = winColor
    c.font = 'bold 22px "Press Start 2P", monospace'
    c.fillText((winner?.name || 'UNKNOWN').toUpperCase(), cx, 302)

    div(325)

    // Judgment quote
    c.fillStyle = '#777'
    c.font = '9px "Press Start 2P", monospace'
    c.fillText('THE JUDGE RULED:', cx, 352)

    c.fillStyle = '#bbb'
    c.font = 'italic 14px Georgia, serif'
    const shortJudgment = judgment.length > 220 ? judgment.slice(0, 220) + '…' : judgment
    drawWrapped(c, `"${shortJudgment}"`, cx, 380, W - 120, 24)

    div(510)

    // Footer
    c.fillStyle = '#4a3a1a'
    c.font = '8px "Press Start 2P", monospace'
    c.fillText('dumbcouncil.app', cx, 545)

    // Wax seal placeholder
    c.beginPath()
    c.arc(W - 80, H - 80, 36, 0, Math.PI * 2)
    c.fillStyle = '#1a0a00'
    c.fill()
    c.strokeStyle = '#c9a84c'
    c.lineWidth = 2
    c.stroke()
    c.fillStyle = '#c9a84c'
    c.font = 'bold 14px "Press Start 2P", monospace'
    c.fillText('⚖', W - 80, H - 73)

    const link = document.createElement('a')
    link.download = 'dumb-council-verdict.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function drawWrapped(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ')
    let line = ''
    let curY = y
    for (const word of words) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), x, curY)
        line = word + ' '
        curY += lineH
      } else {
        line = test
      }
    }
    ctx.fillText(line.trim(), x, curY)
  }

  const { round, phase, currentSide, forAgent, againstAgent, winner, question, error } = state

  const forSpeech = [...state.entries].reverse().find(e => e.side === 'for' && e.round === round) || null
  const againstSpeech = [...state.entries].reverse().find(e => e.side === 'against' && e.round === round) || null
  const judgmentEntry = state.entries.find(e => e.isJudgment)

  const someoneSpeaking = !!currentSide
  const isJudgmentPhase = phase === 'judgment' || !!judgmentEntry

  return (
    <div className={styles.page}>
      <header className={styles.hud}>
        <span className={styles.hudLogo} onClick={() => navigate('/')}>⚖ Dumb Council</span>
        {question && <span className={styles.hudQuestion}>"{question}"</span>}
        <span className={styles.hudRound}>
          {phase === 'connecting' ? 'CONVENING'
            : isJudgmentPhase && phase !== 'complete' ? 'JUDGMENT'
            : phase === 'complete' ? 'SESSION COMPLETE'
            : ROUND_LABELS[round] || ''}
        </span>
      </header>

      <div className={styles.scene}>
        {phase === 'connecting' && (
          <div className={styles.convening}>THE COUNCIL CONVENES...</div>
        )}

        {error && (
          <div className={styles.convening} style={{ color: '#c0392b' }}>
            COUNCIL CANNOT CONVENE<br />
            <span style={{ fontSize: '7px' }}>{error}</span>
          </div>
        )}

        <Character
          agent={forAgent}
          side="for"
          isActive={currentSide === 'for'}
          isDimmed={someoneSpeaking && currentSide !== 'for'}
          isWinner={winner?.side === 'for'}
          speech={isJudgmentPhase ? null : forSpeech}
        />

        {judgmentEntry && (
          <>
            <div className={styles.judgeBubbleWrap}>
              <Bubble entry={judgmentEntry} side="judge" />
            </div>
            <JudgeCharacter isActive={currentSide === 'judge'} />
          </>
        )}

        <Character
          agent={againstAgent}
          side="against"
          isActive={currentSide === 'against'}
          isDimmed={someoneSpeaking && currentSide !== 'against'}
          isWinner={winner?.side === 'against'}
          speech={isJudgmentPhase ? null : againstSpeech}
        />

        {phase === 'complete' && winner && (
          <div className={styles.verdictBanner}>
            THE COUNCIL FINDS IN FAVOUR OF&nbsp;
            <span style={{ color: winner.side === 'for' ? 'var(--for)' : 'var(--against)' }}>
              {winner.name}
            </span>
          </div>
        )}
      </div>

      {(phase === 'round_complete' || phase === 'complete') && (
        <div className={styles.actionBar}>
          {phase === 'round_complete' && (
            <button className={styles.pixelBtn} onClick={handleNext}>
              {state.isLastRound ? '[ SUMMON THE JUDGE ]' : `[ ${ROUND_LABELS[round + 1] || 'NEXT'} → ]`}
            </button>
          )}
          {phase === 'complete' && (
            <>
              <button className={styles.pixelBtn} onClick={handleDownloadVerdict}>
                [ DOWNLOAD VERDICT ]
              </button>
              <button className={styles.pixelBtnGhost}
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/session/${sessionId}`)}>
                [ COPY LINK ]
              </button>
              <button className={styles.pixelBtnGhost} onClick={() => navigate('/')}>
                [ NEW SESSION ]
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
