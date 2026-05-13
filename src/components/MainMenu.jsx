import { useEffect, useRef } from 'react'
import { useGameStore } from '../store'

export default function MainMenu() {
  const startGame = useGameStore(s => s.startGame)
  const highScore = useGameStore(s => s.highScore)
  const glowRef = useRef(null)

  useEffect(() => {
    let frame
    let t = 0
    const animate = () => {
      t += 0.02
      if (glowRef.current) {
        const pulse = 0.7 + Math.sin(t) * 0.3
        glowRef.current.style.opacity = pulse
      }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div style={styles.overlay}>
      {/* Scanlines */}
      <div style={styles.scanlines} />

      <div style={styles.content}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div ref={glowRef} style={styles.logoGlow} />
          <div style={styles.logoSub}>NEON VELOCITY</div>
          <h1 style={styles.logo}>LANE RUSH</h1>
          <div style={styles.logoTagline}>drive fast. survive longer.</div>
        </div>

        {/* Stats */}
        {highScore > 0 && (
          <div style={styles.highScore}>
            <span style={styles.hsLabel}>BEST RUN</span>
            <span style={styles.hsVal}>{highScore.toLocaleString()}</span>
          </div>
        )}

        {/* Controls hint */}
        <div style={styles.controls}>
          <div style={styles.controlRow}>
            <kbd style={styles.key}>←</kbd>
            <kbd style={styles.key}>→</kbd>
            <span style={styles.controlLabel}>or</span>
            <kbd style={styles.key}>A</kbd>
            <kbd style={styles.key}>D</kbd>
            <span style={styles.controlLabel}>to dodge</span>
          </div>
        </div>

        {/* Start button */}
        <button style={styles.startBtn} onClick={startGame}>
          <span style={styles.startBtnInner}>IGNITE</span>
        </button>

        <div style={styles.footer}>
          <span style={{ color: '#3a0080' }}>ESC / P</span>
          <span style={{ color: '#2a0060' }}> — pause</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #0d0030 0%, #050010 70%)',
    fontFamily: "'Orbitron', monospace",
    zIndex: 10,
  },
  scanlines: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
    zIndex: 1,
  },
  content: {
    position: 'relative', zIndex: 2,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
    padding: '40px 32px',
  },
  logoWrap: { position: 'relative', textAlign: 'center' },
  logoGlow: {
    position: 'absolute', inset: '-40px -60px',
    background: 'radial-gradient(ellipse, rgba(180,79,255,0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  logoSub: {
    fontSize: 11, letterSpacing: 8, color: '#b44fff',
    marginBottom: 8, fontWeight: 600,
  },
  logo: {
    fontSize: 'clamp(48px, 10vw, 88px)',
    fontWeight: 900, letterSpacing: 6,
    background: 'linear-gradient(135deg, #ff2d78 0%, #b44fff 50%, #00d4ff 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    textShadow: 'none',
    margin: 0, lineHeight: 1,
    filter: 'drop-shadow(0 0 30px rgba(180,79,255,0.6))',
  },
  logoTagline: {
    fontSize: 12, letterSpacing: 4, color: '#6633aa',
    marginTop: 10, fontWeight: 400,
  },
  highScore: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    background: 'rgba(180,79,255,0.08)', border: '1px solid #2a0060',
    borderRadius: 10, padding: '10px 28px',
  },
  hsLabel: { fontSize: 9, letterSpacing: 4, color: '#6633aa' },
  hsVal: { fontSize: 28, color: '#b44fff', fontWeight: 700, textShadow: '0 0 12px #b44fff88' },
  controls: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  controlRow: { display: 'flex', alignItems: 'center', gap: 8 },
  key: {
    background: 'rgba(180,79,255,0.15)', border: '1px solid #3a0080',
    color: '#b44fff', borderRadius: 6, padding: '4px 10px',
    fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
  },
  controlLabel: { fontSize: 11, color: '#4a2080', letterSpacing: 2 },
  startBtn: {
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, #ff2d78, #b44fff)',
    border: 'none', borderRadius: 12,
    padding: '18px 64px', cursor: 'pointer',
    fontFamily: "'Orbitron', monospace",
    boxShadow: '0 0 40px rgba(255,45,120,0.5), 0 0 80px rgba(180,79,255,0.3)',
    transition: 'transform 0.1s, box-shadow 0.2s',
  },
  startBtnInner: {
    fontSize: 18, fontWeight: 900, letterSpacing: 6, color: '#fff',
    textShadow: '0 0 10px rgba(255,255,255,0.5)',
  },
  footer: { fontSize: 10, letterSpacing: 2, marginTop: -8 },
}
