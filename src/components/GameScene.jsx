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

  const handleCrash = () => crash()

  return (
    <>
      {/*
        LIGHTING STRATEGY — cinematic restraint:
        - One soft hemisphere for ambient fill (no harsh shadows)
        - One directional key light from above-front (readable silhouettes)
        - NO point light spam — localized lights live inside car/obstacles only
        - Fog is the depth tool, not geometry
      */}
      <hemisphereLight args={['#1a0a3a', '#050010', 0.9]} />
      <directionalLight position={[2, 12, 8]} intensity={0.5} color="#8866cc" />
      {/* Subtle front fill — keeps car face readable */}
      <directionalLight position={[0, 3, 14]} intensity={0.25} color="#334466" />
      {/* Cinematic fog — starts close, fades to deep purple-black */}
      <fog attach="fog" args={['#06001a', 40, 120]} />

      <Road speedRef={speedRef} />
      <Environment speedRef={speedRef} />

      {phase !== 'menu' && (
        <>
          <PlayerCar
            targetLaneRef={targetLaneRef}
            carXRef={carXRef}
            shakeRef={shakeRef}
            crashedRef={crashedRef}
            speedRef={speedRef}
          />
          <Obstacles
            speedRef={speedRef}
            carXRef={carXRef}
            crashedRef={crashedRef}
            shakeRef={shakeRef}
            slowMoRef={slowMoRef}
            onCrash={handleCrash}
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
