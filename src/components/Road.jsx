import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_WIDTH, ROAD_LENGTH, LANE_COUNT, LANE_WIDTH } from '../game/constants'

export default function Road({ speedRef }) {
  const dashOffsetRef   = useRef(0)
  const streakOffsetRef = useRef(0)
  const dashRefs        = useRef([])
  const streakRefs      = useRef([])

  const DASH_SPACING = 9
  const DASH_COUNT   = Math.ceil(ROAD_LENGTH / DASH_SPACING) + 2
  const DIVIDERS     = LANE_COUNT - 1

  const dashes = useMemo(() => {
    const items = []
    for (let d = 0; d < DIVIDERS; d++) {
      const x = (d - Math.floor(DIVIDERS / 2)) * LANE_WIDTH + LANE_WIDTH / 2
      for (let i = 0; i < DASH_COUNT; i++) {
        items.push({ x, baseZ: -i * DASH_SPACING })
      }
    }
    return items
  }, [])

  // Wet road reflection streaks — represent streetlight/headlight reflections
  const streaks = useMemo(() => [
    { x: -ROAD_WIDTH / 2 + 0.5, color: '#ff1a6e', op: 0.22, w: 0.25, len: 28 },
    { x:  ROAD_WIDTH / 2 - 0.5, color: '#ff1a6e', op: 0.22, w: 0.25, len: 28 },
    { x: -2.8, color: '#ffe8b0', op: 0.10, w: 0.4,  len: 35 },
    { x:  2.8, color: '#ffe8b0', op: 0.10, w: 0.4,  len: 35 },
    { x:  0.0, color: '#6688cc', op: 0.07, w: 1.0,  len: 45 },
    { x: -5.5, color: '#ffe8b0', op: 0.06, w: 0.3,  len: 22 },
    { x:  5.5, color: '#ffe8b0', op: 0.06, w: 0.3,  len: 22 },
  ], [])

  const STREAK_SPACING = 40

  useFrame((_, delta) => {
    if (!speedRef?.current) return
    const spd = speedRef.current

    dashOffsetRef.current = (dashOffsetRef.current + spd * delta * 60) % DASH_SPACING
    dashRefs.current.forEach((m, i) => {
      if (!m) return
      m.position.z = dashes[i].baseZ + dashOffsetRef.current
      if (m.position.z > 6) m.position.z -= DASH_COUNT * DASH_SPACING
    })

    streakOffsetRef.current += spd * delta * 60
    streakRefs.current.forEach((m, i) => {
      if (!m) return
      const base = -(i * (STREAK_SPACING / streaks.length))
      let z = base + (streakOffsetRef.current % STREAK_SPACING)
      if (z > 8) z -= STREAK_SPACING
      m.position.z = z
    })
  })

  return (
    <group>
      {/* ── Asphalt — dark blue-grey, catches directional light ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD_LENGTH / 2]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#18141e" roughness={0.28} metalness={0.0} />
      </mesh>

      {/* ── Wet specular layer — high metalness catches light colors ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#1a1428" roughness={0.03} metalness={0.85} transparent opacity={0.6} />
      </mesh>

      {/* ── Animated wet reflections — streetlights + headlights ── */}
      {streaks.map((st, i) => (
        <mesh
          key={i}
          ref={el => streakRefs.current[i] = el}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[st.x, 0.006, 0]}
        >
          <planeGeometry args={[st.w, st.len]} />
          <meshBasicMaterial color={st.color} transparent opacity={st.op} depthWrite={false} />
        </mesh>
      ))}

      {/* ── Lane dashes — light lavender-white, readable ── */}
      {dashes.map((d, i) => (
        <mesh
          key={i}
          ref={el => dashRefs.current[i] = el}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[d.x, 0.008, d.baseZ]}
        >
          <planeGeometry args={[0.12, 3.0]} />
          <meshBasicMaterial color="#d0c8f0" transparent opacity={0.8} />
        </mesh>
      ))}

      {/* ── Edge neon strips — hot pink, the road's identity ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2, 0.01, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[0.18, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ff1a6e" transparent opacity={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2, 0.01, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[0.18, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ff1a6e" transparent opacity={0.95} />
      </mesh>

      {/* ── Shoulder — slightly lighter than void ── */}
      <mesh position={[-ROAD_WIDTH / 2 - 1.0, 0, -ROAD_LENGTH / 2]}>
        <boxGeometry args={[2.0, 0.08, ROAD_LENGTH]} />
        <meshStandardMaterial color="#100c1c" roughness={0.95} />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 + 1.0, 0, -ROAD_LENGTH / 2]}>
        <boxGeometry args={[2.0, 0.08, ROAD_LENGTH]} />
        <meshStandardMaterial color="#100c1c" roughness={0.95} />
      </mesh>

      {/* ── Road lighting — warm pools from streetlights ── */}
      {/* These are the lights that make the wet road reflect */}
      <pointLight position={[-ROAD_WIDTH/2 - 1, 5, -8]}  color="#ffe8b0" intensity={18} distance={18} decay={2} />
      <pointLight position={[ ROAD_WIDTH/2 + 1, 5, -8]}  color="#ffe8b0" intensity={18} distance={18} decay={2} />
      <pointLight position={[-ROAD_WIDTH/2 - 1, 5, -28]} color="#ffe8b0" intensity={18} distance={18} decay={2} />
      <pointLight position={[ ROAD_WIDTH/2 + 1, 5, -28]} color="#ffe8b0" intensity={18} distance={18} decay={2} />
      <pointLight position={[-ROAD_WIDTH/2 - 1, 5, -50]} color="#c0b8ff" intensity={14} distance={18} decay={2} />
      <pointLight position={[ ROAD_WIDTH/2 + 1, 5, -50]} color="#c0b8ff" intensity={14} distance={18} decay={2} />
    </group>
  )
}
