import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/*
  NFS-style cinematic chase camera:
  - Low angle (y=1.8) — road fills the frame, car feels large
  - Inertia on X follow — camera lags behind lane changes
  - Speed pushback — camera pulls back slightly at high speed
  - FOV expands with speed (tunnel effect)
  - Crash: camera rises, slows, dramatic pull-back
  - Subtle breathing (very slow sine on Y)
*/
export default function CinematicCamera({ carXRef, speedRef, shakeRef, crashedRef, phase }) {
  const { camera } = useThree()

  // Smooth camera state — all lerped
  const posRef  = useRef(new THREE.Vector3(0, 1.8, 5.5))
  const lookRef = useRef(new THREE.Vector3(0, 0.8, -18))
  const fovRef  = useRef(68)
  const rollRef = useRef(0)   // subtle roll on lane change
  const timeRef = useRef(0)
  const prevXRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta

    const speed   = speedRef?.current  ?? 0.55
    const carX    = carXRef?.current   ?? 0
    const shake   = shakeRef?.current  ?? 0
    const crashed = crashedRef?.current ?? false

    // ── FOV: 65 idle → 82 max speed, 52 on crash ──
    const targetFov = crashed ? 52 : 65 + (speed / 2.2) * 17
    fovRef.current += (targetFov - fovRef.current) * Math.min(delta * 2.5, 1)
    camera.fov = fovRef.current
    camera.updateProjectionMatrix()

    // ── Camera position ──
    // X: follows car with heavy lag (inertia feel)
    const targetCamX = carX * 0.18
    posRef.current.x += (targetCamX - posRef.current.x) * Math.min(delta * 3.5, 1)

    // Y: low angle always; rises on crash; subtle breath
    const breath = Math.sin(timeRef.current * 0.4) * 0.04
    const targetCamY = crashed ? 4.5 : 1.75 + breath
    posRef.current.y += (targetCamY - posRef.current.y) * Math.min(delta * (crashed ? 1.5 : 4), 1)

    // Z: speed pushback — faster = camera pulls back slightly
    const targetCamZ = crashed ? 10 : 5.2 + (speed / 2.2) * 1.2
    posRef.current.z += (targetCamZ - posRef.current.z) * Math.min(delta * 3, 1)

    // ── Camera shake on crash ──
    let sx = 0, sy = 0
    if (shake > 0) {
      shakeRef.current = Math.max(0, shake - delta * 3.5)
      sx = (Math.random() - 0.5) * shake * 0.18
      sy = (Math.random() - 0.5) * shake * 0.12
    }

    camera.position.set(
      posRef.current.x + sx,
      posRef.current.y + sy,
      posRef.current.z
    )

    // ── Look target ──
    // X: slight lead ahead of car
    const targetLookX = carX * 0.12
    lookRef.current.x += (targetLookX - lookRef.current.x) * Math.min(delta * 5, 1)

    // Y: look slightly above road
    const targetLookY = crashed ? 2.0 : 0.65
    lookRef.current.y += (targetLookY - lookRef.current.y) * Math.min(delta * 3, 1)

    // Z: look far ahead — creates depth
    const targetLookZ = crashed ? -4 : -20
    lookRef.current.z += (targetLookZ - lookRef.current.z) * Math.min(delta * 4, 1)

    camera.lookAt(lookRef.current)

    // ── Subtle roll on lane change (drift feel) ──
    const dX = carX - prevXRef.current
    prevXRef.current = carX
    rollRef.current += (-dX * 0.012 - rollRef.current) * Math.min(delta * 6, 1)
    camera.rotation.z = rollRef.current
  })

  return null
}
