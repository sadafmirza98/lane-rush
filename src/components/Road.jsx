import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_WIDTH, ROAD_LENGTH, LANE_COUNT, LANE_WIDTH } from '../game/constants'

/*
  Road design philosophy:
  - Dark wet asphalt — the hero surface
  - Lane markings: bright but thin — readable, not decorative
  - Two edge neon strips — the only "neon" on the road
  - Animated light reflections — fake wet road without extra geometry
  - NO random glowing shapes, NO extra point lights on road surface
*/
export default function Road({ speedRef }) {
  const dashOffsetRef  = useRef(0)
  const streakOffsetRef = useRef(0)
  const dashRefs  = useRef([])
  const streakRefs = useRef([])

  const DASH_SPACING = 9
  const DASH_COUNT   = Math.ceil(ROAD_LENGTH / DASH_SPACING) + 2
  const DIVIDERS     = LANE_COUNT - 1

  // Lane dash positions (static X, animated Z)
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

  // Reflection streaks — long thin planes that slide toward camera
  // Represent headlight/streetlight reflections on wet road
  const STREAK_COUNT = 6
  const streaks = useMemo(() => [
    { x: -5.2, color: '#ff2d78', opacity: 0.12, width: 0.3, len: 22 },
    { x:  5.2, color: '#ff2d78', opacity: 0.12, width: 0.3, len: 22 },
    { x: -2.1, color: '#8844ff', opacity: 0.07, width: 0.5, len: 30 },
    { x:  2.1, color: '#8844ff', opacity: 0.07, width: 0.5, len: 30 },
    { x:  0.0, color: '#224488', opacity: 0.06, width: 1.2, len: 40 },
    { x: -8.0, color: '#334466', opacity: 0.05, width: 0.8, len: 25 },
  ], [])

  const STREAK_SPACING = 35

  useFrame((_, delta) => {
    if (!speedRef?.current) return
    const spd = speedRef.current

    // Animate lane dashes
    dashOffsetRef.current = (dashOffsetRef.current + spd * delta * 60) % DASH_SPACING
    dashRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      mesh.position.z = dashes[i].baseZ + dashOffsetRef.current
      if (mesh.position.z > 6) mesh.position.z -= DASH_COUNT * DASH_SPACING
    })

    // Animate reflection streaks — move toward camera
    streakOffsetRef.current += spd * delta * 60
    streakRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const base = -(i * (STREAK_SPACING / STREAK_COUNT))
      let z = base + (streakOffsetRef.current % STREAK_SPACING)
      if (z > 8) z -= STREAK_SPACING
      mesh.position.z = z
    })
  })

  return (
    <group>
      {/* ── Asphalt base — dark charcoal with slight blue tint ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD_LENGTH / 2]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial
          color="#0e0a1a"
          roughness={0.22}
          metalness={0.45}
        />
      </mesh>

      {/* ── Wet specular layer — thin plane just above, high metalness ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial
          color="#0a0818"
          roughness={0.04}
          metalness={0.92}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* ── Animated light reflections on wet surface ── */}
      {streaks.map((st, i) => (
        <mesh
          key={i}
          ref={el => streakRefs.current[i] = el}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[st.x, 0.005, 0]}
        >
          <planeGeometry args={[st.width, st.len]} />
          <meshBasicMaterial
            color={st.color}
            transparent
            opacity={st.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* ── Lane dashes — white/light grey, clean and readable ── */}
      {dashes.map((d, i) => (
        <mesh
          key={i}
          ref={el => dashRefs.current[i] = el}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[d.x, 0.007, d.baseZ]}
        >
          <planeGeometry args={[0.1, 3.2]} />
          <meshBasicMaterial color="#c8c0e8" transparent opacity={0.75} />
        </mesh>
      ))}

      {/* ── Left edge strip — the ONLY neon on the road ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2, 0.008, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[0.16, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ff1a6e" transparent opacity={0.9} />
      </mesh>

      {/* ── Right edge strip ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2, 0.008, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[0.16, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ff1a6e" transparent opacity={0.9} />
      </mesh>

      {/* ── Edge glow bleed — very subtle, just a soft halo ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2 + 0.6, 0.004, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[1.4, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ff1a6e" transparent opacity={0.04} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2 - 0.6, 0.004, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[1.4, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ff1a6e" transparent opacity={0.04} depthWrite={false} />
      </mesh>

      {/* ── Shoulder — dark concrete ── */}
      <mesh position={[-ROAD_WIDTH / 2 - 0.8, 0, -ROAD_LENGTH / 2]}>
        <boxGeometry args={[1.6, 0.1, ROAD_LENGTH]} />
        <meshStandardMaterial color="#080614" roughness={0.95} />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 + 0.8, 0, -ROAD_LENGTH / 2]}>
        <boxGeometry args={[1.6, 0.1, ROAD_LENGTH]} />
        <meshStandardMaterial color="#080614" roughness={0.95} />
      </mesh>
    </group>
  )
}
