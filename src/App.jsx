import { Canvas } from '@react-three/fiber'
import { useGameStore } from './store'
import { useGameEngine } from './game/useGameEngine'
import GameScene from './components/GameScene'
import HUD from './components/HUD'
import MainMenu from './components/MainMenu'
import CrashScreen from './components/CrashScreen'
import PauseMenu from './components/PauseMenu'

export default function App() {
  const phase = useGameStore(s => s.phase)
  const {
    speedRef, targetLaneRef, carXRef,
    shakeRef, crashedRef, slowMoRef,
    moveLeft, moveRight,
  } = useGameEngine()

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#04000f' }}>
      <Canvas
        camera={{ position: [0, 1.8, 5.5], fov: 68, near: 0.1, far: 220 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <GameScene
          targetLaneRef={targetLaneRef}
          carXRef={carXRef}
          speedRef={speedRef}
          shakeRef={shakeRef}
          crashedRef={crashedRef}
          slowMoRef={slowMoRef}
        />
      </Canvas>

      {phase === 'menu'    && <MainMenu />}
      {phase === 'playing' && <HUD moveLeft={moveLeft} moveRight={moveRight} />}
      {phase === 'crashed' && <CrashScreen />}
      {phase === 'paused'  && <PauseMenu />}
    </div>
  )
}
