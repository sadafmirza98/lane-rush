import { useGameStore } from '../store'

export default function HUD({ moveLeft, moveRight }) {
  const score    = useGameStore(s => s.score)
  const speed    = useGameStore(s => s.speed)
  const combo    = useGameStore(s => s.combo)
  const highScore= useGameStore(s => s.highScore)
  const pauseGame= useGameStore(s => s.pauseGame)
  const isMobile = useGameStore(s => s.isMobile)

  const speedPct = Math.min(100, (speed / 264) * 100)
  const speedColor = speedPct > 80 ? '#ff2d78' : speedPct > 50 ? '#cc88ff' : '#00d4ff'

  return (
    <div style={s.hud}>

      {/* ── Top left: Score ── */}
      <div style={s.scorePanel}>
        <div style={s.panelLabel}>SCORE</div>
        <div style={{ ...s.panelValue, color: '#00d4ff', textShadow: '0 0 14px #00d4ff' }}>
          {score.toLocaleString()}
        </div>
      </div>

      {/* ── Top right: Best ── */}
      <div style={{ ...s.scorePanel, right: 16, left: 'auto', alignItems: 'flex-end' }}>
        <div style={s.panelLabel}>BEST</div>
        <div style={{ ...s.panelValue, color: '#cc88ff', textShadow: '0 0 14px #cc88ff88' }}>
          {highScore.toLocaleString()}
        </div>
      </div>

      {/* ── Combo badge ── */}
      {combo > 1 && (
        <div style={s.comboBadge}>
          <span style={{ color: '#ff2d78', fontWeight: 900 }}>×{combo}</span>
          <span style={{ color: '#ffffff88', fontSize: 10, letterSpacing: 3 }}> COMBO</span>
        </div>
      )}

      {/* ── Bottom: Speedometer ── */}
      <div style={s.speedo}>
        <div style={s.speedRow}>
          <span style={{ ...s.speedNum, color: speedColor, textShadow: `0 0 20px ${speedColor}` }}>
            {speed}
          </span>
          <span style={s.speedUnit}>km/h</span>
        </div>
        {/* Speed bar */}
        <div style={s.barTrack}>
          <div style={{
            ...s.barFill,
            width: `${speedPct}%`,
            background: `linear-gradient(90deg, #00d4ff, ${speedColor})`,
            boxShadow: `0 0 10px ${speedColor}`,
          }} />
        </div>
        {/* Tick marks */}
        <div style={s.ticks}>
          {[0,25,50,75,100].map(t => (
            <div key={t} style={{ ...s.tick, opacity: speedPct >= t ? 1 : 0.2 }} />
          ))}
        </div>
      </div>

      {/* ── Pause ── */}
      <button style={s.pauseBtn} onClick={pauseGame}>⏸</button>

      {/* ── Mobile controls ── */}
      {isMobile && (
        <div style={s.mobileRow}>
          <button style={s.mobileBtn} onTouchStart={moveLeft} onClick={moveLeft}>◀</button>
          <button style={s.mobileBtn} onTouchStart={moveRight} onClick={moveRight}>▶</button>
        </div>
      )}
    </div>
  )
}

const s = {
  hud: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    fontFamily: "'Orbitron', monospace", userSelect: 'none',
  },
  scorePanel: {
    position: 'absolute', top: 16, left: 16,
    display: 'flex', flexDirection: 'column', gap: 2,
    background: 'rgba(8,0,24,0.72)',
    border: '1px solid rgba(180,79,255,0.3)',
    borderRadius: 10, padding: '8px 16px',
    backdropFilter: 'blur(10px)',
  },
  panelLabel: { fontSize: 9, letterSpacing: 4, color: '#6633aa', fontWeight: 700 },
  panelValue: { fontSize: 24, fontWeight: 900, letterSpacing: 2 },
  comboBadge: {
    position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(255,45,120,0.15)',
    border: '1px solid rgba(255,45,120,0.5)',
    borderRadius: 8, padding: '6px 18px',
    fontSize: 16, fontWeight: 700, letterSpacing: 2,
    backdropFilter: 'blur(8px)',
    animation: 'pulse 0.6s ease infinite',
  },
  speedo: {
    position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    background: 'rgba(8,0,24,0.78)',
    border: '1px solid rgba(0,212,255,0.25)',
    borderRadius: 14, padding: '12px 28px 10px',
    backdropFilter: 'blur(12px)',
    minWidth: 180,
  },
  speedRow: { display: 'flex', alignItems: 'baseline', gap: 5 },
  speedNum: { fontSize: 38, fontWeight: 900, letterSpacing: 1, transition: 'color 0.3s' },
  speedUnit: { fontSize: 10, color: '#6633aa', letterSpacing: 3 },
  barTrack: {
    width: 160, height: 5, background: 'rgba(255,255,255,0.08)',
    borderRadius: 3, overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: 3,
    transition: 'width 0.12s linear, background 0.3s',
  },
  ticks: {
    display: 'flex', justifyContent: 'space-between', width: 160,
  },
  tick: {
    width: 2, height: 4, background: '#cc88ff', borderRadius: 1,
    transition: 'opacity 0.2s',
  },
  pauseBtn: {
    position: 'absolute', top: 16, right: 16,
    background: 'rgba(8,0,24,0.72)', border: '1px solid rgba(180,79,255,0.3)',
    color: '#cc88ff', fontSize: 16, borderRadius: 8, padding: '8px 14px',
    cursor: 'pointer', pointerEvents: 'all', fontFamily: 'inherit',
    backdropFilter: 'blur(10px)',
  },
  mobileRow: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    display: 'flex', justifyContent: 'space-between', padding: '0 16px',
    pointerEvents: 'all',
  },
  mobileBtn: {
    background: 'rgba(180,79,255,0.18)', border: '2px solid rgba(180,79,255,0.6)',
    color: '#cc88ff', fontSize: 30, borderRadius: 18,
    width: 88, height: 88, cursor: 'pointer',
    fontFamily: 'inherit', backdropFilter: 'blur(8px)',
    WebkitTapHighlightColor: 'transparent',
  },
}
