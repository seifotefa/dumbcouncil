import styles from './AgentCard.module.css'

const COLORS = {
  senator_alarmus:      '#c0392b',
  professor_pedanticus: '#2980b9',
  lord_contrarius:      '#8e44ad',
  dame_doomsday:        '#16a085',
  sir_technobro:        '#f39c12',
}

const INITIALS = {
  senator_alarmus:      'SA',
  professor_pedanticus: 'PP',
  lord_contrarius:      'LC',
  dame_doomsday:        'DD',
  sir_technobro:        'ST',
}

export default function AgentCard({ agentKey, name, title, isActive, currentText, isWinner }) {
  const color = COLORS[agentKey] || '#c9a84c'
  const initials = INITIALS[agentKey] || '?'

  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : ''} ${isWinner ? styles.winner : ''}`}
      style={{ '--agent-color': color }}
    >
      <div className={styles.avatar} style={{ background: color }}>
        {initials}
      </div>
      <div className={styles.name}>{name}</div>
      <div className={styles.title}>{title}</div>

      {isActive && currentText && (
        <div className={styles.speech}>
          <span>{currentText}</span>
          <span className={styles.cursor}>▌</span>
        </div>
      )}

      {isWinner && (
        <div className={styles.winnerBadge}>WINNER</div>
      )}
    </div>
  )
}
