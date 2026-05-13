import { useEffect, useRef } from 'react'
import { useGameStore } from '../store'

export default function CrashScreen() {
  const score = useGameStore(s => s.score)
  const highScore = useGameStore(s => s.highScore)
  const startGame = useGameStore(s => s.startGame)
  const toMenu = useGameStore(s => s.toMenu)
  const isNewHigh = score >= highScore && score > 0
  const mountRef = useRef(false)

  useEffect(() => {
    mountRef.current = true
  }, [])

  return (
    <div style={styles.overlay}>
      <div style={styles.scanlines} />
      <div style={styles.content}>
        {/* Crash title */}
        <div style={styles.crashTitle}>
          <div style={styles.crashSub}>SYSTEM FAILURE</div>
          <h2 style={styles.crashHead}>CRASH</h2>
        </div>

        {/* Score */}
        <div style={styles.scoreBlock}>
          {isNewHigh && <div style={styles.newHigh}>✦ NEW RECORD ✦</div>}
          <div style={styles.finalScore}>{score.toLocaleString()}</div>
          <div style={styles.scoreLabel}>POINTS</div>
          {!isNewHigh && (
            <div style={styles.bestRow}>
              <span style={styles.bestLabel}>BEST</span>
              <span style={styles.bestVal}>{highScore.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.retryBtn} onClick={startGame}>
            RETRY
          </button>
          <button style={styles.menuBtn} onClick={toMenu}>
            MENU
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(255,45,120,0.12) 0%, rgba(5,0,16,0.95) 60%)',
    fontFamily: "'Orbitron', monospace",
    zIndex: 10,
    animation: 'fadeIn 0.4s ease',
  },
  scanlines: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
  },
  content: {
    position: 'relative', zIndex: 2,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
    padding: '40px 32px',
  },
  crashTitle: { textAlign: 'center' },
  crashSub: { fontSize: 10, letterSpacing: 6, color: '#ff2d78', marginBottom: 6 },
  crashHead: {
    fontSize: 'clamp(56px, 12vw, 96px)', fontWeight: 900, letterSpacing: 8,
    color: '#ff2d78', margin: 0,
    textShadow: '0 0 40px rgba(255,45,120,0.8), 0 0 80px rgba(255,45,120,0.4)',
    animation: 'glitch 2s infinite',
  },
  scoreBlock: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    background: 'rgba(255,45,120,0.06)', border: '1px solid rgba(255,45,120,0.2)',
    borderRadius: 14, padding: '20px 48px',
  },
  newHigh: {
    fontSize: 11, letterSpacing: 4, color: '#ff2d78',
    textShadow: '0 0 10px #ff2d78', marginBottom: 4,
  },
  finalScore: {
    fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 900,
    color: '#ffffff', letterSpacing: 4,
    textShadow: '0 0 20px rgba(255,255,255,0.3)',
  },
  scoreLabel: { fontSize: 10, letterSpacing: 4, color: '#6633aa' },
  bestRow: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 },
  bestLabel: { fontSize: 9, letterSpacing: 3, color: '#4a2080' },
  bestVal: { fontSize: 16, color: '#b44fff', fontWeight: 700 },
  actions: { display: 'flex', gap: 16 },
  retryBtn: {
    background: 'linear-gradient(135deg, #ff2d78, #b44fff)',
    border: 'none', borderRadius: 10, padding: '16px 48px',
    color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: 4,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 0 30px rgba(255,45,120,0.5)',
    transition: 'transform 0.1s',
  },
  menuBtn: {
    background: 'transparent', border: '1px solid #2a0060',
    borderRadius: 10, padding: '16px 32px',
    color: '#6633aa', fontSize: 12, fontWeight: 600, letterSpacing: 3,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'border-color 0.2s, color 0.2s',
  },
}
