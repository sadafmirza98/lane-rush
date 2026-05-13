import { useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../store'
import { LANE_COUNT, BASE_SPEED } from './constants'

// NOTE: No useFrame here — this hook lives outside Canvas.
// All frame logic lives inside GameScene / child components.

export function useGameEngine() {
  const phase = useGameStore(s => s.phase)

  const speedRef      = useRef(BASE_SPEED)
  const targetLaneRef = useRef(2)
  const carXRef       = useRef(0)
  // crashedRef: false = alive, true = crashed
  // Start false — gets set correctly when phase changes
  const crashedRef    = useRef(false)
  const shakeRef      = useRef(0)
  const slowMoRef     = useRef(1)

  const lastInputRef  = useRef(0)
  const keysRef       = useRef({})

  // Sync crashedRef with phase
  useEffect(() => {
    if (phase === 'playing') {
      crashedRef.current    = false
      speedRef.current      = BASE_SPEED
      targetLaneRef.current = 2
      carXRef.current       = 0
      shakeRef.current      = 0
      slowMoRef.current     = 1
    } else if (phase === 'crashed' || phase === 'menu') {
      crashedRef.current = true
    }
    // 'paused' — leave crashedRef as-is so game state is preserved
  }, [phase])

  const moveLeft = useCallback(() => {
    const now = Date.now()
    if (now - lastInputRef.current < 160) return
    lastInputRef.current = now
    if (targetLaneRef.current > 0) targetLaneRef.current -= 1
  }, [])

  const moveRight = useCallback(() => {
    const now = Date.now()
    if (now - lastInputRef.current < 160) return
    lastInputRef.current = now
    if (targetLaneRef.current < LANE_COUNT - 1) targetLaneRef.current += 1
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.type === 'keydown') {
        const k = e.key
        if ((k === 'ArrowLeft'  || k === 'a' || k === 'A') && !keysRef.current.left) {
          keysRef.current.left = true
          if (useGameStore.getState().phase === 'playing') moveLeft()
        }
        if ((k === 'ArrowRight' || k === 'd' || k === 'D') && !keysRef.current.right) {
          keysRef.current.right = true
          if (useGameStore.getState().phase === 'playing') moveRight()
        }
        if (k === 'Escape' || k === 'p' || k === 'P') {
          const p = useGameStore.getState().phase
          if (p === 'playing') useGameStore.getState().pauseGame()
          else if (p === 'paused') useGameStore.getState().resumeGame()
        }
      }
      if (e.type === 'keyup') {
        keysRef.current.left  = false
        keysRef.current.right = false
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup',   onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup',   onKey)
    }
  }, [moveLeft, moveRight])

  return {
    speedRef, targetLaneRef, carXRef,
    crashedRef, shakeRef, slowMoRef,
    moveLeft, moveRight,
  }
}
