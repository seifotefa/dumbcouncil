import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

const MEMBERS = ['Tech Bro Tim', 'Doomer Dave', 'Conspiracy Carl', 'Philosopher Phil', 'Guru Gary']

export default function Landing() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError(null)

    try {
      const API = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${API}/debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      navigate(`/council/${data.sessionId}`, {
        state: { question: question.trim(), forAgent: data.forAgent, againstAgent: data.againstAgent }
      })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.crest}>⚖</div>
        <h1 className={styles.title}>Dumb Council</h1>
        <p className={styles.subtitle}>
          Bring your question before the Council.<br />
          They will deliberate. It will not help.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            placeholder="e.g. Is water healthy?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            disabled={loading}
            autoFocus
            maxLength={300}
          />
          <button className={styles.submitBtn} type="submit" disabled={loading || !question.trim()}>
            {loading ? '[ CONVENING... ]' : '[ CONVENE THE COUNCIL ]'}
          </button>
        </form>

        {error && <p className={styles.error}>COUNCIL ERROR: {error}</p>}

        <div className={styles.roster}>
          <div className={styles.rosterLabel}>COUNCIL MEMBERS</div>
          <div className={styles.members}>
            {MEMBERS.map(name => (
              <span key={name} className={styles.member}>{name}</span>
            ))}
          </div>
        </div>

        <p className={styles.presiding}>PRESIDED OVER BY THE JUDGE — DEFINITELY IMPARTIAL</p>
      </div>
    </div>
  )
}
