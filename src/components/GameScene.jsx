import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store'
import { MAX_SPEED, SPEED_INCREMENT } from '../game/constants'
import Road from './Road'
import PlayerCar from './PlayerCar'
import Obstacles from './Obstacles'
import Environment from './Environment'
import CinematicCamera from './CinematicCamera'
import PostFX from './PostFX'

export default function GameScene({ targetLaneRef, carXRef, speedRef, shakeRef, crashedRef, slowMoRef }) {
  const phase    = useGameStore(s => s.phase)
  const crash    = useGameStore(s => s.crash)
  const setSpeed = useGameStore(s => s.setSpeed)
  const addScore = useGameStore(s => s.addScore)
  const scoreTimer = useRef(0)

  useFrame((_, delta) => {
    if (phase !== 'playing') return
    const dt = delta * slowMoRef.current
    speedRef.current = Math.min(MAX_SPEED, speedRef.current + SPEED_INCREMENT * 60 * dt)
    setSpeed(Math.round(speedRef.current * 120))
    scoreTimer.current += dt
    if (scoreTimer.current > 0.5) {
      scoreTimer.current = 0
      addScore(Math.round(speedRef.current * 5))
    }
  })

  return (
    <>
      {/*
        LIGHTING — night city, not void:
        Hemisphere sky = deep blue-purple city glow (NOT near-black)
        Ground = dark but not #000
        Directional = soft moonlight from upper-left
        Front fill = keeps car/obstacle faces readable
        Fog = pushed to z=60 so road is always fully visible
      */}
      <hemisphereLight args={['#1a1040', '#0a0820', 1.8]} />
      <directionalLight position={[-4, 16, 10]} intensity={0.9} color="#7060c0" />
      <directionalLight position={[0, 4, 16]}   intensity={0.5} color="#4466aa" />
      <fog attach="fog" args={['#08041a', 60, 140]} />

      <Road speedRef={speedRef} />
      <Environment speedRef={speedRef} />

      {phase !== 'menu' && (
        <>
          <PlayerCar
            targetLaneRef={targetLaneRef}
            carXRef={carXRef}
            shakeRef={shakeRef}
            speedRef={speedRef}
          />
          <Obstacles
            speedRef={speedRef}
            carXRef={carXRef}
            crashedRef={crashedRef}
            shakeRef={shakeRef}
            slowMoRef={slowMoRef}
            onCrash={crash}
          />
        </>
      )}

      <CinematicCamera
        carXRef={carXRef}
        speedRef={speedRef}
        shakeRef={shakeRef}
        crashedRef={crashedRef}
        phase={phase}
      />

      <PostFX speedRef={speedRef} />
    </>
  )
}
