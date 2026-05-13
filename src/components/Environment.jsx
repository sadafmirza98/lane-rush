import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_WIDTH, ROAD_LENGTH } from '../game/constants'

/*
  Environment philosophy:
  - City silhouettes: dark, massive, atmospheric — NOT neon blocks
  - Sparse window lights: a few bright dots, not glowing surfaces
  - Two streetlight rows: warm-white cones on road, nothing else
  - One distant skyline layer: depth illusion, zero geometry cost
  - NO holographic billboards, NO rooftop neon, NO random point lights
  - Parallax: near buildings scroll faster than far skyline
*/

// Seeded random for consistent layout
function seededRand(seed) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

export default function Environment({ speedRef }) {
  const nearBuildRef = useRef([])
  const farBuildRef  = useRef([])
  const lightRef     = useRef([])
  const offsetNear   = useRef(0)
  const offsetFar    = useRef(0)
  const timeRef      = useRef(0)

  const NEAR_REPEAT = 80
  const FAR_REPEAT  = 120
  const SIDE = ROAD_WIDTH / 2

  // Near buildings — closer, scroll faster, more detail
  const nearBuildings = useMemo(() => {
    const rng = seededRand(42)
    return Array.from({ length: 16 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const x    = side * (SIDE + 4 + rng() * 6)
      const h    = 5 + rng() * 12
      const w    = 3 + rng() * 5
      const d    = 3 + rng() * 4
      const z    = -(i * 10) % NEAR_REPEAT
      // Windows: 2-4 lit windows per building
      const wins = Array.from({ length: Math.floor(rng() * 3) + 1 }, () => ({
        wx: (rng() - 0.5) * (w - 0.6),
        wy: rng() * h * 0.7 + h * 0.15,
        wc: rng() > 0.5 ? '#ffe8c0' : '#c0d8ff',
      }))
      return { x, h, w, d, z, wins, side }
    })
  }, [])

  // Far buildings — distant, slow parallax, just silhouettes
  const farBuildings = useMemo(() => {
    const rng = seededRand(99)
    return Array.from({ length: 20 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const x    = side * (SIDE + 18 + rng() * 20)
      const h    = 12 + rng() * 28
      const w    = 4 + rng() * 8
      const z    = -(i * 12) % FAR_REPEAT
      return { x, h, w, z, side }
    })
  }, [])

  // Streetlights — simple, functional, warm
  const streetlights = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const x    = side * (SIDE + 1.5)
      const z    = -(i * 11) % NEAR_REPEAT
      return { x, z, side }
    })
  }, [])

  useFrame((_, delta) => {
    if (!speedRef?.current) return
    timeRef.current += delta
    const spd = speedRef.current

    offsetNear.current = (offsetNear.current + spd * delta * 60) % NEAR_REPEAT
    offsetFar.current  = (offsetFar.current  + spd * delta * 30) % FAR_REPEAT  // half speed = parallax

    nearBuildRef.current.forEach((mesh, i) => {
      if (!mesh) return
      let z = nearBuildings[i].z + offsetNear.current
      while (z > 8) z -= NEAR_REPEAT
      mesh.position.z = z
    })

    farBuildRef.current.forEach((mesh, i) => {
      if (!mesh) return
      let z = farBuildings[i].z + offsetFar.current
      while (z > 8) z -= FAR_REPEAT
      mesh.position.z = z
    })

    lightRef.current.forEach((mesh, i) => {
      if (!mesh) return
      let z = streetlights[i].z + offsetNear.current
      while (z > 8) z -= NEAR_REPEAT
      mesh.position.z = z
    })
  })

  return (
    <group>
      {/* ── Sky — deep near-black purple ── */}
      <mesh position={[0, 20, -60]} rotation={[0.08, 0, 0]}>
        <planeGeometry args={[300, 80]} />
        <meshBasicMaterial color="#04000f" side={THREE.DoubleSide} />
      </mesh>

      {/* ── Horizon glow — single soft band, not multiple layers ── */}
      <mesh position={[0, 2.5, -98]}>
        <planeGeometry args={[300, 8]} />
        <meshBasicMaterial color="#1a0040" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.8, -98]}>
        <planeGeometry args={[300, 2.5]} />
        <meshBasicMaterial color="#3a0060" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Ground plane — dark, slightly reflective ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[300, ROAD_LENGTH]} />
        <meshStandardMaterial color="#060412" roughness={0.9} />
      </mesh>

      {/* ── Far buildings — pure silhouettes, no lights ── */}
      {farBuildings.map((b, i) => (
        <mesh
          key={i}
          ref={el => farBuildRef.current[i] = el}
          position={[b.x, b.h / 2, b.z]}
        >
          <boxGeometry args={[b.w, b.h, 2]} />
          <meshStandardMaterial
            color="#0c0820"
            roughness={0.9}
            metalness={0.1}
            emissive="#0c0820"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}

      {/* ── Near buildings — dark with sparse window lights ── */}
      {nearBuildings.map((b, i) => (
        <group key={i} ref={el => nearBuildRef.current[i] = el} position={[b.x, 0, b.z]}>
          {/* Building body */}
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color="#100c22"
              roughness={0.7}
              metalness={0.3}
              emissive="#0a0818"
              emissiveIntensity={0.2}
            />
          </mesh>
          {/* Sparse window lights — small bright dots only */}
          {b.wins.map((win, j) => (
            <mesh key={j} position={[win.wx, win.wy, b.side > 0 ? -b.d / 2 - 0.01 : b.d / 2 + 0.01]}>
              <planeGeometry args={[0.35, 0.5]} />
              <meshBasicMaterial color={win.wc} transparent opacity={0.7} />
            </mesh>
          ))}
          {/* Rooftop antenna — single thin line, no glow */}
          {b.h > 12 && (
            <mesh position={[0, b.h + 0.8, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 1.6, 4]} />
              <meshStandardMaterial color="#1a1430" roughness={0.8} />
            </mesh>
          )}
        </group>
      ))}

      {/* ── Streetlights — warm white cone, minimal geometry ── */}
      {streetlights.map((sl, i) => (
        <group key={i} ref={el => lightRef.current[i] = el} position={[sl.x, 0, sl.z]}>
          {/* Pole */}
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.055, 0.07, 5, 5]} />
            <meshStandardMaterial color="#1a1430" roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Arm */}
          <mesh
            position={[sl.side * -0.55, 5.1, 0]}
            rotation={[0, 0, sl.side * 0.22]}
          >
            <cylinderGeometry args={[0.04, 0.04, 1.3, 5]} />
            <meshStandardMaterial color="#1a1430" roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Light head — small, warm white */}
          <mesh position={[sl.side * -1.0, 5.1, 0]}>
            <boxGeometry args={[0.28, 0.14, 0.28]} />
            <meshBasicMaterial color="#fff4e0" />
          </mesh>
          {/* Cone light on road — the ONLY point light in environment */}
          <pointLight
            color="#ffe8b0"
            intensity={12}
            distance={14}
            decay={2}
            position={[sl.side * -1.0, 4.9, 0]}
          />
        </group>
      ))}

      {/* ── Distant skyline — flat planes, zero draw cost ── */}
      {/* Layer 1: mid-distance towers */}
      {[-55, -38, -22, 22, 38, 55].map((x, i) => (
        <mesh key={i} position={[x, 10 + (i % 3) * 6, -92]}>
          <boxGeometry args={[5 + (i % 2) * 3, 20 + (i % 3) * 12, 0.5]} />
          <meshBasicMaterial color="#0a0620" transparent opacity={0.95} />
        </mesh>
      ))}
      {/* Layer 2: far background towers */}
      {[-80, -60, -40, 40, 60, 80].map((x, i) => (
        <mesh key={i} position={[x, 16 + (i % 2) * 8, -96]}>
          <boxGeometry args={[6 + (i % 3) * 2, 32 + (i % 2) * 14, 0.5]} />
          <meshBasicMaterial color="#070418" transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  )
}
