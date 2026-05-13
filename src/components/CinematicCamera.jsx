import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function CinematicCamera({ carXRef, speedRef, shakeRef, crashedRef }) {
  const { camera } = useThree()

  const posRef   = useRef(new THREE.Vector3(0, 1.65, 5.2))
  const lookRef  = useRef(new THREE.Vector3(0, 0.55, -20))
  const fovRef   = useRef(66)
  const rollRef  = useRef(0)
  const timeRef  = useRef(0)
  const prevXRef = useRef(0)
  const velXRef  = useRef(0)  // camera X velocity for inertia

  useFrame((_, delta) => {
    timeRef.current += delta

    const speed   = speedRef?.current  ?? 0.55
    const carX    = carXRef?.current   ?? 0
    const crashed = crashedRef?.current ?? false

    // ── FOV — speed tunnel effect ──
    // 64 at rest → 80 at max speed, 50 on crash
    const speedT   = Math.min(speed / 2.2, 1)
    const targetFov = crashed ? 50 : 64 + speedT * 16
    fovRef.current += (targetFov - fovRef.current) * Math.min(delta * 2.2, 1)
    camera.fov = fovRef.current
    camera.updateProjectionMatrix()

    // ── Camera X — inertia-based follow ──
    // Velocity accumulates, then decays — feels like a heavy camera rig
    const targetCamX = carX * 0.16
    velXRef.current += (targetCamX - posRef.current.x) * delta * 4
    velXRef.current *= Math.pow(0.88, delta * 60)  // exponential decay
    posRef.current.x += velXRef.current * delta * 60

    // ── Camera Y — low angle, rises on crash ──
    const breathY    = Math.sin(timeRef.current * 0.35) * 0.03
    const targetCamY = crashed ? 4.8 : 1.62 + breathY
    posRef.current.y += (targetCamY - posRef.current.y) * Math.min(delta * (crashed ? 1.2 : 3.5), 1)

    // ── Camera Z — speed pushback ──
    const targetCamZ = crashed ? 11 : 5.0 + speedT * 1.4
    posRef.current.z += (targetCamZ - posRef.current.z) * Math.min(delta * 2.8, 1)

    // ── Crash shake ──
    let sx = 0, sy = 0
    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - delta * 3.2)
      const mag = shakeRef.current
      sx = (Math.random() - 0.5) * mag * 0.2
      sy = (Math.random() - 0.5) * mag * 0.14
    }

    camera.position.set(
      posRef.current.x + sx,
      posRef.current.y + sy,
      posRef.current.z
    )

    // ── Look target ──
    const targetLookX = carX * 0.1
    lookRef.current.x += (targetLookX - lookRef.current.x) * Math.min(delta * 4.5, 1)

    const targetLookY = crashed ? 2.2 : 0.55
    lookRef.current.y += (targetLookY - lookRef.current.y) * Math.min(delta * 2.8, 1)

    const targetLookZ = crashed ? -3 : -22
    lookRef.current.z += (targetLookZ - lookRef.current.z) * Math.min(delta * 3.5, 1)

    camera.lookAt(lookRef.current)

    // ── Roll — drift tilt on lane change ──
    const dX = carX - prevXRef.current
    prevXRef.current = carX
    rollRef.current += (-dX * 0.014 - rollRef.current) * Math.min(delta * 5.5, 1)
    camera.rotation.z = rollRef.current
  })

  return null
}
