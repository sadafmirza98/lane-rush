import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_WIDTH, ROAD_LENGTH, LANE_COUNT, LANE_WIDTH } from '../game/constants'

/*
  NFS wet night road:
  - Dark grey asphalt, not purple
  - Wet specular layer catches warm streetlight colors
  - White lane markings (realistic, not neon)
  - Solid white edge lines (no neon strips)
  - Concrete barriers on shoulders
  - Animated warm-white streetlight reflections
*/
export default function Road({ speedRef }) {
  const dashOffsetRef   = useRef(0)
  const streakOffsetRef = useRef(0)
  const dashRefs        = useRef([])
  const streakRefs      = useRef([])

  const DASH_SPACING = 10
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

  // Wet road reflections — warm amber streetlights + cool headlight cone
  const streaks = useMemo(() => [
    // Streetlight reflections — warm amber, one per lane edge
    { x: -ROAD_WIDTH / 2 + 1.8, color: '#ffcc66', op: 0.18, w: 0.5,  len: 28, anim: true  },
    { x:  ROAD_WIDTH / 2 - 1.8, color: '#ffcc66', op: 0.18, w: 0.5,  len: 28, anim: true  },
    // Headlight cone — blue-white, narrow, ahead of car
    { x: -0.55,                  color: '#ddeeff', op: 0.20, w: 0.3,  len: 16, anim: true  },
    { x:  0.55,                  color: '#ddeeff', op: 0.20, w: 0.3,  len: 16, anim: true  },
    // Sky reflection — very wide, very faint blue-grey
    { x:  0,                     color: '#1a2030', op: 0.12, w: ROAD_WIDTH * 0.8, len: ROAD_LENGTH, anim: false },
  ], [])

  const STREAK_SPACING = 36

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
    streaks.forEach((st, i) => {
      if (!st.anim) return
      const m = streakRefs.current[i]
      if (!m) return
      const base = -(i * (STREAK_SPACING / 4))
      let z = base + (streakOffsetRef.current % STREAK_SPACING)
      if (z > 8) z -= STREAK_SPACING
      m.position.z = z
    })
  })

  return (
    <group>
      {/* ── Asphalt — dark grey, realistic road color ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD_LENGTH / 2]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#1c1c22" roughness={0.82} metalness={0.0} />
      </mesh>

      {/* ── Wet specular layer — catches streetlight colors ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#181820" roughness={0.05} metalness={0.9} transparent opacity={0.55} />
      </mesh>

      {/* ── Wet reflections ── */}
      {streaks.map((st, i) => (
        <mesh
          key={i}
          ref={el => streakRefs.current[i] = el}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[st.x, 0.005, st.anim ? 0 : -ROAD_LENGTH / 2]}
        >
          <planeGeometry args={[st.w, st.len]} />
          <meshBasicMaterial color={st.color} transparent opacity={st.op} depthWrite={false} />
        </mesh>
      ))}

      {/* ── Lane dashes — white, realistic ── */}
      {dashes.map((d, i) => (
        <mesh
          key={i}
          ref={el => dashRefs.current[i] = el}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[d.x, 0.007, d.baseZ]}
        >
          <planeGeometry args={[0.12, 3.5]} />
          <meshBasicMaterial color="#e8e8e0" transparent opacity={0.88} />
        </mesh>
      ))}

      {/* ── Solid edge lines — white, continuous ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2 + 0.15, 0.008, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[0.18, ROAD_LENGTH]} />
        <meshBasicMaterial color="#d8d8d0" transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2 - 0.15, 0.008, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[0.18, ROAD_LENGTH]} />
        <meshBasicMaterial color="#d8d8d0" transparent opacity={0.9} />
      </mesh>

      {/* ── Concrete barriers — Jersey barriers, realistic ── */}
      {/* Left barrier */}
      <group position={[-ROAD_WIDTH / 2 - 0.55, 0, -ROAD_LENGTH / 2]}>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.44, ROAD_LENGTH]} />
          <meshStandardMaterial color="#2a2a2e" roughness={0.85} metalness={0.05} />
        </mesh>
        {/* Top cap — slightly lighter */}
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[0.5, 0.06, ROAD_LENGTH]} />
          <meshStandardMaterial color="#363638" roughness={0.8} />
        </mesh>
        {/* Reflective paint stripe */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.28, 0.25, 0]}>
          <planeGeometry args={[0.06, ROAD_LENGTH]} />
          <meshBasicMaterial color="#ffcc44" transparent opacity={0.7} />
        </mesh>
      </group>
      {/* Right barrier */}
      <group position={[ROAD_WIDTH / 2 + 0.55, 0, -ROAD_LENGTH / 2]}>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.44, ROAD_LENGTH]} />
          <meshStandardMaterial color="#2a2a2e" roughness={0.85} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[0.5, 0.06, ROAD_LENGTH]} />
          <meshStandardMaterial color="#363638" roughness={0.8} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.28, 0.25, 0]}>
          <planeGeometry args={[0.06, ROAD_LENGTH]} />
          <meshBasicMaterial color="#ffcc44" transparent opacity={0.7} />
        </mesh>
      </group>

      {/* ── Shoulder — dark tarmac ── */}
      <mesh position={[-ROAD_WIDTH / 2 - 1.8, 0, -ROAD_LENGTH / 2]}>
        <boxGeometry args={[2.5, 0.06, ROAD_LENGTH]} />
        <meshStandardMaterial color="#161618" roughness={0.95} />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 + 1.8, 0, -ROAD_LENGTH / 2]}>
        <boxGeometry args={[2.5, 0.06, ROAD_LENGTH]} />
        <meshStandardMaterial color="#161618" roughness={0.95} />
      </mesh>

      {/* ── Streetlight pools — warm amber on wet road ── */}
      <pointLight position={[-ROAD_WIDTH/2 - 0.5, 6, -5]}  color="#ffcc66" intensity={28} distance={22} decay={2} />
      <pointLight position={[ ROAD_WIDTH/2 + 0.5, 6, -5]}  color="#ffcc66" intensity={28} distance={22} decay={2} />
      <pointLight position={[-ROAD_WIDTH/2 - 0.5, 6, -24]} color="#ffcc66" intensity={28} distance={22} decay={2} />
      <pointLight position={[ ROAD_WIDTH/2 + 0.5, 6, -24]} color="#ffcc66" intensity={28} distance={22} decay={2} />
      <pointLight position={[-ROAD_WIDTH/2 - 0.5, 6, -44]} color="#ffaa44" intensity={22} distance={22} decay={2} />
      <pointLight position={[ ROAD_WIDTH/2 + 0.5, 6, -44]} color="#ffaa44" intensity={22} distance={22} decay={2} />
    </group>
  )
}
