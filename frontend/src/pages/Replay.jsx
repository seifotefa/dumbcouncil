import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AgentCard from '../components/AgentCard'
import styles from './Council.module.css'

const ROUND_LABELS = { 1: 'Opening Arguments', 2: 'Rebuttals', 3: 'Closing Statements' }

export default function Replay() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/session/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setSession(data)
      })
      .catch(err => setError(err.message))
  }, [sessionId])

  if (error) return (
    <div className={styles.page}>
      <div className={styles.error}>
        The Council cannot convene at this time. A quorum has not been reached.<br />
        <small>{error}</small>
      </div>
    </div>
  )

  if (!session) return (
    <div className={styles.page}>
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
        Retrieving records from the archive…
      </div>
    </div>
  )

  const agentMeta = {}
  for (const t of session.transcript) {
    agentMeta[t.agent] = { name: t.agentName, title: t.title }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo} onClick={() => navigate('/')}>⚖ Dumb Council</span>
        {session.question && (
          <span className={styles.question}>"{session.question}"</span>
        )}
        <div className={styles.roundBadge}>Archived Session</div>
      </header>

      <main className={styles.main}>
        <section className={styles.council}>
          {Object.entries(agentMeta).map(([key, meta]) => (
            <AgentCard
              key={key}
              agentKey={key}
              name={meta.name}
              title={meta.title}
              isActive={false}
              currentText=""
              isWinner={session.winner?.key === key}
            />
          ))}
        </section>

        {session.judgment && (
          <section className={styles.judgmentPanel}>
            <div className={styles.judgmentHeader}>
              <span className={styles.judgeAvatar}>CJ</span>
              <div>
                <div className={styles.judgeName}>Chief Justice Verdictus</div>
                <div className={styles.judgeTitle}>Supreme Arbiter of the Council</div>
              </div>
            </div>
            <p className={styles.judgmentText}>{session.judgment}</p>
            {session.winner && (
              <div className={styles.verdict}>
                The Council finds in favour of <strong>{session.winner.name}</strong>
              </div>
            )}
          </section>
        )}

        <section className={styles.transcriptPanel}>
          <div className={styles.transcriptTitle}>Record of Proceedings</div>
          {session.transcript.map((t, i) => (
            <div key={i} className={styles.entry}>
              <div className={styles.entryMeta}>
                <span className={styles.entryName}>{t.agentName}</span>
                <span className={styles.entryRound}>Round {t.round}</span>
              </div>
              <p className={styles.entryContent}>{t.content}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className={styles.footer}>
        <button className="btn-ghost" onClick={() => navigate('/')}>
          New Session
        </button>
      </footer>
    </div>
  )
}
