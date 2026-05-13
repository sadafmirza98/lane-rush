import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const LANE_POSITIONS = [-6.4, -3.2, 0, 3.2, 6.4]

export default function PlayerCar({ targetLaneRef, carXRef, shakeRef }) {
  const groupRef     = useRef()
  const bodyRef      = useRef()
  const tiltRef      = useRef(0)
  const bobbRef      = useRef(0)
  const rearLightRef = useRef()
  const pulseT       = useRef(0)
  const prevX        = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const targetX  = LANE_POSITIONS[targetLaneRef.current] ?? 0
    const currentX = groupRef.current.position.x
    const newX     = currentX + (targetX - currentX) * Math.min(delta * 11, 1)
    groupRef.current.position.x = newX
    carXRef.current = newX

    // Lean into lane change
    const lean = -(newX - prevX.current) * 20
    prevX.current = newX
    tiltRef.current += (lean - tiltRef.current) * Math.min(delta * 9, 1)
    if (bodyRef.current) bodyRef.current.rotation.z = Math.max(-0.2, Math.min(0.2, tiltRef.current))

    // Float
    bobbRef.current += delta * 1.6
    groupRef.current.position.y = 0.28 + Math.sin(bobbRef.current) * 0.015

    // Crash shake
    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - delta * 3.5)
      groupRef.current.position.x += (Math.random() - 0.5) * shakeRef.current * 0.4
      groupRef.current.position.y += (Math.random() - 0.5) * shakeRef.current * 0.18
    }

    // Taillight breathe
    pulseT.current += delta * 1.2
    if (rearLightRef.current) {
      rearLightRef.current.intensity = 12 + Math.sin(pulseT.current) * 3
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.28, -1.5]}>
      <group ref={bodyRef}>

        {/* ── Lower body / chassis — wide, flat, aggressive ── */}
        <mesh castShadow position={[0, 0.14, 0]}>
          <boxGeometry args={[1.72, 0.22, 4.0]} />
          <meshStandardMaterial color="#1a1428" roughness={0.08} metalness={0.95} />
        </mesh>

        {/* ── Upper body — slightly narrower ── */}
        <mesh castShadow position={[0, 0.32, 0.1]}>
          <boxGeometry args={[1.62, 0.18, 3.6]} />
          <meshStandardMaterial color="#1e1830" roughness={0.06} metalness={0.98} />
        </mesh>

        {/* ── Cabin ── */}
        <mesh castShadow position={[0, 0.52, 0.15]}>
          <boxGeometry args={[1.28, 0.28, 1.85]} />
          <meshStandardMaterial color="#0c0a1e" roughness={0.02} metalness={0.9} transparent opacity={0.9} />
        </mesh>

        {/* ── Windshield — blue-tinted glass ── */}
        <mesh position={[0, 0.52, 1.08]}>
          <boxGeometry args={[1.22, 0.24, 0.05]} />
          <meshStandardMaterial color="#1a2840" roughness={0.01} metalness={0.7} transparent opacity={0.55} />
        </mesh>

        {/* ── Rear window ── */}
        <mesh position={[0, 0.52, -0.78]}>
          <boxGeometry args={[1.18, 0.22, 0.05]} />
          <meshStandardMaterial color="#141e30" roughness={0.01} metalness={0.7} transparent opacity={0.45} />
        </mesh>

        {/* ── Hood ── */}
        <mesh position={[0, 0.42, 1.5]}>
          <boxGeometry args={[1.58, 0.07, 1.1]} />
          <meshStandardMaterial color="#1a1428" roughness={0.06} metalness={0.98} />
        </mesh>

        {/* ── Rear deck ── */}
        <mesh position={[0, 0.42, -1.5]}>
          <boxGeometry args={[1.58, 0.07, 0.9]} />
          <meshStandardMaterial color="#1a1428" roughness={0.06} metalness={0.98} />
        </mesh>

        {/* ── Spoiler ── */}
        <mesh position={[0, 0.56, -1.88]}>
          <boxGeometry args={[1.5, 0.07, 0.24]} />
          <meshStandardMaterial color="#14101e" roughness={0.1} metalness={0.95} />
        </mesh>
        <mesh position={[ 0.62, 0.42, -1.88]}>
          <boxGeometry args={[0.07, 0.28, 0.22]} />
          <meshStandardMaterial color="#14101e" roughness={0.1} metalness={0.9} />
        </mesh>
        <mesh position={[-0.62, 0.42, -1.88]}>
          <boxGeometry args={[0.07, 0.28, 0.22]} />
          <meshStandardMaterial color="#14101e" roughness={0.1} metalness={0.9} />
        </mesh>

        {/* ── Side sills ── */}
        <mesh position={[ 0.88, 0.08, 0]}>
          <boxGeometry args={[0.1, 0.16, 3.7]} />
          <meshStandardMaterial color="#201a34" roughness={0.12} metalness={0.9} />
        </mesh>
        <mesh position={[-0.88, 0.08, 0]}>
          <boxGeometry args={[0.1, 0.16, 3.7]} />
          <meshStandardMaterial color="#201a34" roughness={0.12} metalness={0.9} />
        </mesh>

        {/* ── Front headlights — white DRL ── */}
        <mesh position={[ 0.6, 0.22, 2.02]}>
          <boxGeometry args={[0.32, 0.1, 0.05]} />
          <meshBasicMaterial color="#e8f0ff" />
        </mesh>
        <mesh position={[-0.6, 0.22, 2.02]}>
          <boxGeometry args={[0.32, 0.1, 0.05]} />
          <meshBasicMaterial color="#e8f0ff" />
        </mesh>
        {/* DRL strip */}
        <mesh position={[0, 0.14, 2.02]}>
          <boxGeometry args={[1.35, 0.04, 0.04]} />
          <meshBasicMaterial color="#b0c8ff" transparent opacity={0.8} />
        </mesh>

        {/* ── Rear lights — full-width bar, hot pink ── */}
        <mesh position={[0, 0.22, -2.02]}>
          <boxGeometry args={[1.55, 0.1, 0.05]} />
          <meshBasicMaterial color="#ff1a5e" />
        </mesh>
        <mesh position={[0, 0.22, -2.01]}>
          <boxGeometry args={[1.25, 0.05, 0.03]} />
          <meshBasicMaterial color="#ff88aa" />
        </mesh>

        {/* ── Underglow — floor blush, purple ── */}
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[1.78, 0.03, 4.05]} />
          <meshBasicMaterial color="#6622bb" transparent opacity={0.55} />
        </mesh>

        {/* ── Wheels ── */}
        {[[-0.94, -0.1, 1.25], [0.94, -0.1, 1.25], [-0.94, -0.1, -1.25], [0.94, -0.1, -1.25]].map((pos, i) => (
          <group key={i} position={pos}>
            {/* Tyre */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.28, 16]} />
              <meshStandardMaterial color="#0a0810" roughness={0.92} metalness={0.05} />
            </mesh>
            {/* Alloy rim */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.19, 0.19, 0.3, 10]} />
              <meshStandardMaterial color="#2c2448" roughness={0.25} metalness={0.9} />
            </mesh>
            {/* Brake disc glow */}
            <mesh rotation={[0, 0, Math.PI / 2]} position={[i % 2 === 0 ? 0.15 : -0.15, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.02, 8]} />
              <meshBasicMaterial color="#ff4422" transparent opacity={0.4} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── Lights ── */}
      {/* Headlights — flood road ahead */}
      <pointLight position={[ 0.62, 0.28, 3.8]} color="#d0e8ff" intensity={35} distance={36} decay={2} />
      <pointLight position={[-0.62, 0.28, 3.8]} color="#d0e8ff" intensity={35} distance={36} decay={2} />
      {/* Wide road flood */}
      <pointLight position={[0, 0.5, 5.5]} color="#a0c0ff" intensity={15} distance={40} decay={2} />

      {/* Taillights — strong, visible from camera */}
      <pointLight ref={rearLightRef} position={[0, 0.28, -2.6]} color="#ff1a5e" intensity={12} distance={12} decay={2} />

      {/* Underglow */}
      <pointLight position={[0, -0.18, 0]} color="#5511aa" intensity={3} distance={5} decay={2} />
    </group>
  )
}
