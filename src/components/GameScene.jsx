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
        NFS-style night lighting:
        - Hemisphere: overcast night sky (blue-grey) / dark wet ground
        - Key: cool moonlight from upper-left, casts shadows
        - Fill: very soft warm from front-right, prevents pure black faces
        - Fog: dense, starts at 50, city disappears at 120
      */}
      <hemisphereLight args={['#1a2035', '#0a0c10', 2.5]} />
      <directionalLight
        position={[-8, 20, 6]} intensity={1.2} color="#8090c0"
        castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25} shadow-camera-right={25}
        shadow-camera-top={25}  shadow-camera-bottom={-25}
        shadow-camera-far={100} shadow-bias={-0.001}
      />
      <directionalLight position={[6, 4, 20]} intensity={0.3} color="#c0a060" />
      <fog attach="fog" args={['#080c14', 50, 120]} />

      <Road speedRef={speedRef} />
      <Environment speedRef={speedRef} />

      {phase !== 'menu' && (
        <>
          <PlayerCar targetLaneRef={targetLaneRef} carXRef={carXRef} shakeRef={shakeRef} speedRef={speedRef} />
          <Obstacles
            speedRef={speedRef} carXRef={carXRef}
            crashedRef={crashedRef} shakeRef={shakeRef}
            slowMoRef={slowMoRef} onCrash={crash}
          />
        </>
      )}

      <CinematicCamera carXRef={carXRef} speedRef={speedRef} shakeRef={shakeRef} crashedRef={crashedRef} phase={phase} />
      <PostFX speedRef={speedRef} />
    </>
  )
}
