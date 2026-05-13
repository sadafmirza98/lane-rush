import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const LANE_POSITIONS = [-6.4, -3.2, 0, 3.2, 6.4]

/*
  Car design philosophy:
  - Wide, low, aggressive silhouette
  - Reflective dark body — metalness does the work
  - Strong taillights — the visual anchor from camera angle
  - Subtle underglow only — not a light show
  - Headlights illuminate road ahead (functional, not decorative)
  - NO rim glow, NO random emissive strips, NO neon everywhere
*/
export default function PlayerCar({ targetLaneRef, carXRef, shakeRef, speedRef }) {
  const groupRef    = useRef()
  const bodyRef     = useRef()
  const tiltRef     = useRef(0)
  const bobbRef     = useRef(0)
  const rearLightRef = useRef()
  const underRef    = useRef()
  const pulseT      = useRef(0)
  const prevX       = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const targetX  = LANE_POSITIONS[targetLaneRef.current] ?? 0
    const currentX = groupRef.current.position.x
    const dx       = targetX - currentX
    const newX     = currentX + dx * Math.min(delta * 11, 1)
    groupRef.current.position.x = newX
    carXRef.current = newX

    // Body tilt — lean into lane change
    const leanTarget = -(newX - prevX.current) * 18
    prevX.current = newX
    tiltRef.current += (leanTarget - tiltRef.current) * Math.min(delta * 8, 1)
    if (bodyRef.current) bodyRef.current.rotation.z = Math.max(-0.18, Math.min(0.18, tiltRef.current))

    // Subtle float
    bobbRef.current += delta * 1.8
    groupRef.current.position.y = 0.3 + Math.sin(bobbRef.current) * 0.018

    // Crash shake
    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - delta * 3.5)
      groupRef.current.position.x += (Math.random() - 0.5) * shakeRef.current * 0.45
      groupRef.current.position.y += (Math.random() - 0.5) * shakeRef.current * 0.2
    }

    // Taillight pulse — slow, breathing
    pulseT.current += delta * 1.4
    const pulse = 0.82 + Math.sin(pulseT.current) * 0.18
    if (rearLightRef.current) rearLightRef.current.intensity = 10 * pulse
    if (underRef.current)     underRef.current.intensity     = 2.5 * pulse
  })

  return (
    <group ref={groupRef} position={[0, 0.3, -1.5]}>
      <group ref={bodyRef}>

        {/* ── Body — wide, low, dark metallic ── */}
        <mesh castShadow position={[0, 0.22, 0]}>
          <boxGeometry args={[1.7, 0.32, 3.8]} />
          <meshStandardMaterial
            color="#12082a"
            roughness={0.06}
            metalness={0.98}
          />
        </mesh>

        {/* ── Side body panels — slightly lighter ── */}
        <mesh position={[0.9, 0.18, 0]}>
          <boxGeometry args={[0.08, 0.28, 3.6]} />
          <meshStandardMaterial color="#1a0e38" roughness={0.1} metalness={0.95} />
        </mesh>
        <mesh position={[-0.9, 0.18, 0]}>
          <boxGeometry args={[0.08, 0.28, 3.6]} />
          <meshStandardMaterial color="#1a0e38" roughness={0.1} metalness={0.95} />
        </mesh>

        {/* ── Cabin — dark tinted glass ── */}
        <mesh castShadow position={[0, 0.52, 0.1]}>
          <boxGeometry args={[1.3, 0.3, 1.8]} />
          <meshStandardMaterial
            color="#0a0620"
            roughness={0.02}
            metalness={0.9}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* ── Windshield — faint blue tint, not glowing ── */}
        <mesh position={[0, 0.52, 1.0]}>
          <boxGeometry args={[1.25, 0.26, 0.04]} />
          <meshStandardMaterial color="#1a2a44" roughness={0.02} metalness={0.8} transparent opacity={0.6} />
        </mesh>

        {/* ── Hood — flat, slightly angled ── */}
        <mesh position={[0, 0.38, 1.4]}>
          <boxGeometry args={[1.6, 0.06, 1.0]} />
          <meshStandardMaterial color="#0e0622" roughness={0.08} metalness={0.98} />
        </mesh>

        {/* ── Spoiler ── */}
        <mesh position={[0, 0.5, -1.8]}>
          <boxGeometry args={[1.55, 0.07, 0.22]} />
          <meshStandardMaterial color="#0e0622" roughness={0.1} metalness={0.95} />
        </mesh>
        <mesh position={[0.65, 0.38, -1.8]}>
          <boxGeometry args={[0.06, 0.26, 0.2]} />
          <meshStandardMaterial color="#0e0622" roughness={0.1} metalness={0.9} />
        </mesh>
        <mesh position={[-0.65, 0.38, -1.8]}>
          <boxGeometry args={[0.06, 0.26, 0.2]} />
          <meshStandardMaterial color="#0e0622" roughness={0.1} metalness={0.9} />
        </mesh>

        {/* ── Front headlights — clean white, functional ── */}
        <mesh position={[0.58, 0.22, 1.92]}>
          <boxGeometry args={[0.3, 0.1, 0.05]} />
          <meshBasicMaterial color="#ddeeff" />
        </mesh>
        <mesh position={[-0.58, 0.22, 1.92]}>
          <boxGeometry args={[0.3, 0.1, 0.05]} />
          <meshBasicMaterial color="#ddeeff" />
        </mesh>
        {/* DRL strip */}
        <mesh position={[0, 0.16, 1.92]}>
          <boxGeometry args={[1.3, 0.04, 0.04]} />
          <meshBasicMaterial color="#aaccff" transparent opacity={0.7} />
        </mesh>

        {/* ── Rear lights — THE visual anchor, strong pink/red ── */}
        <mesh position={[0, 0.22, -1.92]}>
          <boxGeometry args={[1.5, 0.1, 0.05]} />
          <meshBasicMaterial color="#ff1a5e" />
        </mesh>
        {/* Inner bright strip */}
        <mesh position={[0, 0.22, -1.91]}>
          <boxGeometry args={[1.2, 0.05, 0.03]} />
          <meshBasicMaterial color="#ff88aa" />
        </mesh>

        {/* ── Underglow — subtle, just a floor blush ── */}
        <mesh position={[0, -0.01, 0]}>
          <boxGeometry args={[1.75, 0.03, 3.9]} />
          <meshBasicMaterial color="#7722cc" transparent opacity={0.6} />
        </mesh>

        {/* ── Wheels — dark rubber, no glow ── */}
        {[[-0.92, -0.08, 1.2], [0.92, -0.08, 1.2], [-0.92, -0.08, -1.2], [0.92, -0.08, -1.2]].map((pos, i) => (
          <group key={i} position={pos}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.26, 14]} />
              <meshStandardMaterial color="#080610" roughness={0.9} metalness={0.1} />
            </mesh>
            {/* Rim — dark alloy, no neon */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.17, 0.17, 0.28, 8]} />
              <meshStandardMaterial color="#2a2040" roughness={0.3} metalness={0.85} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── Lights — minimal, purposeful ── */}
      {/* Headlights: illuminate road ahead */}
      <pointLight position={[0.6, 0.3, 4.0]} color="#cce8ff" intensity={28} distance={32} decay={2} />
      <pointLight position={[-0.6, 0.3, 4.0]} color="#cce8ff" intensity={28} distance={32} decay={2} />

      {/* Taillights: strong pink glow visible from camera */}
      <pointLight ref={rearLightRef} position={[0, 0.3, -2.4]} color="#ff1a5e" intensity={10} distance={10} decay={2} />

      {/* Underglow: floor blush only */}
      <pointLight ref={underRef} position={[0, -0.15, 0]} color="#6611bb" intensity={2.5} distance={5} decay={2} />
    </group>
  )
}
