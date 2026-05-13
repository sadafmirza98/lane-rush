import { useGameStore } from '../store'

export default function PauseMenu() {
  const resumeGame = useGameStore(s => s.resumeGame)
  const toMenu = useGameStore(s => s.toMenu)
  const score = useGameStore(s => s.score)

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.title}>PAUSED</div>
        <div style={styles.score}>{score.toLocaleString()} pts</div>
        <div style={styles.actions}>
          <button style={styles.resumeBtn} onClick={resumeGame}>RESUME</button>
          <button style={styles.menuBtn} onClick={toMenu}>MENU</button>
        </div>
        <div style={styles.hint}>ESC / P to resume</div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(5,0,16,0.88)',
    fontFamily: "'Orbitron', monospace",
    zIndex: 10,
    backdropFilter: 'blur(6px)',
  },
  panel: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    background: 'rgba(10,0,32,0.9)', border: '1px solid #2a0060',
    borderRadius: 16, padding: '40px 56px',
    boxShadow: '0 0 60px rgba(180,79,255,0.2)',
  },
  title: {
    fontSize: 36, fontWeight: 900, letterSpacing: 8,
    color: '#b44fff', textShadow: '0 0 20px #b44fff88',
  },
  score: { fontSize: 18, color: '#6633aa', letterSpacing: 3 },
  actions: { display: 'flex', gap: 14, marginTop: 8 },
  resumeBtn: {
    background: 'linear-gradient(135deg, #b44fff, #00d4ff)',
    border: 'none', borderRadius: 10, padding: '14px 40px',
    color: '#fff', fontSize: 13, fontWeight: 900, letterSpacing: 4,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 0 24px rgba(180,79,255,0.4)',
  },
  menuBtn: {
    background: 'transparent', border: '1px solid #2a0060',
    borderRadius: 10, padding: '14px 28px',
    color: '#6633aa', fontSize: 11, fontWeight: 600, letterSpacing: 3,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  hint: { fontSize: 9, letterSpacing: 3, color: '#2a0060' },
}
