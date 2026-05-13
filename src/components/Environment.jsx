import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_WIDTH, ROAD_LENGTH } from '../game/constants'

function seededRand(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

export default function Environment({ speedRef }) {
  const nearRef  = useRef([])
  const farRef   = useRef([])
  const lightRef = useRef([])
  const offNear  = useRef(0)
  const offFar   = useRef(0)
  const timeRef  = useRef(0)

  const NEAR_REPEAT = 88
  const FAR_REPEAT  = 130
  const SIDE = ROAD_WIDTH / 2

  // Near buildings — visible, lit, believable
  const nearBuildings = useMemo(() => {
    const rng = seededRand(42)
    return Array.from({ length: 14 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const x    = side * (SIDE + 5 + rng() * 5)
      const h    = 6 + rng() * 14
      const w    = 3.5 + rng() * 4
      const d    = 3 + rng() * 3
      const z    = -(i * 12) % NEAR_REPEAT
      // Window grid — rows of lit windows
      const winRows = Math.floor(h / 2.2)
      const winCols = Math.floor(w / 1.4)
      const wins = []
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          if (rng() > 0.45) { // ~55% of windows lit
            wins.push({
              x: (c - (winCols - 1) / 2) * 1.3,
              y: 1.2 + r * 2.1,
              lit: rng() > 0.3,
              warm: rng() > 0.5,
            })
          }
        }
      }
      return { x, h, w, d, z, wins, side }
    })
  }, [])

  // Far buildings — silhouettes with occasional lit tops
  const farBuildings = useMemo(() => {
    const rng = seededRand(77)
    return Array.from({ length: 18 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const x    = side * (SIDE + 20 + rng() * 18)
      const h    = 15 + rng() * 30
      const w    = 5 + rng() * 9
      const z    = -(i * 14) % FAR_REPEAT
      const topColor = ['#ff1a6e', '#4466ff', '#aa44ff', '#ff8800'][Math.floor(rng() * 4)]
      return { x, h, w, z, topColor }
    })
  }, [])

  // Streetlights — warm white, evenly spaced
  const streetlights = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      return { x: side * (SIDE + 1.6), z: -(i * 14) % NEAR_REPEAT, side }
    })
  }, [])

  useFrame((_, delta) => {
    if (!speedRef?.current) return
    timeRef.current += delta
    const spd = speedRef.current

    offNear.current = (offNear.current + spd * delta * 60) % NEAR_REPEAT
    offFar.current  = (offFar.current  + spd * delta * 28) % FAR_REPEAT

    nearRef.current.forEach((m, i) => {
      if (!m) return
      let z = nearBuildings[i].z + offNear.current
      while (z > 10) z -= NEAR_REPEAT
      m.position.z = z
    })
    farRef.current.forEach((m, i) => {
      if (!m) return
      let z = farBuildings[i].z + offFar.current
      while (z > 10) z -= FAR_REPEAT
      m.position.z = z
    })
    lightRef.current.forEach((m, i) => {
      if (!m) return
      let z = streetlights[i].z + offNear.current
      while (z > 10) z -= NEAR_REPEAT
      m.position.z = z
    })
  })

  return (
    <group>
      {/* ── Sky — deep blue-purple, NOT black ── */}
      <mesh position={[0, 22, -70]}>
        <planeGeometry args={[400, 90]} />
        <meshBasicMaterial color="#0c0828" side={THREE.DoubleSide} />
      </mesh>

      {/* ── City ambient glow on horizon — makes sky feel inhabited ── */}
      <mesh position={[0, 8, -100]}>
        <planeGeometry args={[400, 20]} />
        <meshBasicMaterial color="#1a1040" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 3, -100]}>
        <planeGeometry args={[400, 8]} />
        <meshBasicMaterial color="#2a1060" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1, -100]}>
        <planeGeometry args={[400, 3]} />
        <meshBasicMaterial color="#ff1a6e" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Ground — dark tarmac, not void ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[300, ROAD_LENGTH]} />
        <meshStandardMaterial color="#0e0c18" roughness={0.92} />
      </mesh>

      {/* ── Far buildings — silhouettes with lit tops ── */}
      {farBuildings.map((b, i) => (
        <group key={i} ref={el => farRef.current[i] = el} position={[b.x, 0, b.z]}>
          {/* Body */}
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, 1.5]} />
            <meshStandardMaterial color="#0e0c20" roughness={0.8} emissive="#0a0818" emissiveIntensity={0.3} />
          </mesh>
          {/* Lit rooftop edge — gives skyline definition */}
          <mesh position={[0, b.h + 0.08, 0]}>
            <boxGeometry args={[b.w + 0.1, 0.12, 1.6]} />
            <meshBasicMaterial color={b.topColor} transparent opacity={0.7} />
          </mesh>
          {/* Antenna */}
          {b.h > 25 && (
            <mesh position={[0, b.h + 1.5, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 3, 4]} />
              <meshBasicMaterial color={b.topColor} transparent opacity={0.6} />
            </mesh>
          )}
        </group>
      ))}

      {/* ── Near buildings — visible, with window grids ── */}
      {nearBuildings.map((b, i) => (
        <group key={i} ref={el => nearRef.current[i] = el} position={[b.x, 0, b.z]}>
          {/* Building body — dark but visible */}
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color="#14102a"
              roughness={0.65}
              metalness={0.2}
              emissive="#0c0a1e"
              emissiveIntensity={0.4}
            />
          </mesh>
          {/* Window grid — the key to making buildings feel real */}
          {b.wins.map((win, j) => (
            <mesh
              key={j}
              position={[
                win.x,
                win.y,
                b.side > 0 ? -b.d / 2 - 0.02 : b.d / 2 + 0.02,
              ]}
            >
              <planeGeometry args={[0.55, 0.75]} />
              <meshBasicMaterial
                color={win.warm ? '#ffe8c0' : '#c8d8ff'}
                transparent
                opacity={win.lit ? 0.75 : 0.15}
              />
            </mesh>
          ))}
          {/* Rooftop neon edge — one per building, subtle */}
          <mesh position={[0, b.h + 0.06, 0]}>
            <boxGeometry args={[b.w + 0.08, 0.1, b.d + 0.08]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? '#ff1a6e' : i % 3 === 1 ? '#4466ff' : '#aa44ff'}
              transparent opacity={0.55}
            />
          </mesh>
        </group>
      ))}

      {/* ── Streetlights — warm white, functional ── */}
      {streetlights.map((sl, i) => (
        <group key={i} ref={el => lightRef.current[i] = el} position={[sl.x, 0, sl.z]}>
          <mesh position={[0, 2.8, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 5.6, 6]} />
            <meshStandardMaterial color="#1c1830" roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh position={[sl.side * -0.6, 5.6, 0]} rotation={[0, 0, sl.side * 0.2]}>
            <cylinderGeometry args={[0.04, 0.04, 1.4, 5]} />
            <meshStandardMaterial color="#1c1830" roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh position={[sl.side * -1.1, 5.6, 0]}>
            <boxGeometry args={[0.32, 0.16, 0.32]} />
            <meshBasicMaterial color="#fff8e8" />
          </mesh>
          <pointLight color="#ffe8b0" intensity={20} distance={16} decay={2} position={[sl.side * -1.1, 5.4, 0]} />
        </group>
      ))}

      {/* ── Distant skyline — 3 depth layers, zero scroll cost ── */}
      {/* Layer A — closest, tallest */}
      {[-48, -32, -18, 18, 32, 48].map((x, i) => (
        <group key={`a${i}`} position={[x, 0, -88]}>
          <mesh position={[0, 11 + (i % 3) * 5, 0]}>
            <boxGeometry args={[6 + (i % 2) * 3, 22 + (i % 3) * 10, 1]} />
            <meshStandardMaterial color="#100e22" roughness={0.8} emissive="#0c0a1c" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 22 + (i % 3) * 5 + 0.1, 0]}>
            <boxGeometry args={[6.1 + (i % 2) * 3, 0.14, 1.1]} />
            <meshBasicMaterial color={['#ff1a6e','#4466ff','#aa44ff'][i % 3]} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      {/* Layer B — mid distance */}
      {[-70, -52, -35, 35, 52, 70].map((x, i) => (
        <group key={`b${i}`} position={[x, 0, -94]}>
          <mesh position={[0, 18 + (i % 2) * 8, 0]}>
            <boxGeometry args={[7 + (i % 3) * 2, 36 + (i % 2) * 12, 1]} />
            <meshStandardMaterial color="#0c0a1e" roughness={0.9} emissive="#080618" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
      {/* Layer C — farthest, just silhouettes */}
      {[-90, -65, -42, 42, 65, 90].map((x, i) => (
        <mesh key={`c${i}`} position={[x, 22 + (i % 3) * 6, -99]}>
          <boxGeometry args={[8 + (i % 2) * 4, 44 + (i % 3) * 14, 0.5]} />
          <meshBasicMaterial color="#080618" transparent opacity={0.95} />
        </mesh>
      ))}

      {/* ── City ambient fill lights — illuminate near buildings ── */}
      <pointLight position={[-ROAD_WIDTH/2 - 8, 12, -30]} color="#3322aa" intensity={6} distance={40} decay={1.5} />
      <pointLight position={[ ROAD_WIDTH/2 + 8, 12, -30]} color="#2233aa" intensity={6} distance={40} decay={1.5} />
      <pointLight position={[0, 10, -60]} color="#221144" intensity={5} distance={50} decay={1.5} />
    </group>
  )
}
