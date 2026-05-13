import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_WIDTH, ROAD_LENGTH } from '../game/constants'

function seededRand(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

/*
  NFS-style night city environment:
  - Color palette: dark steel, concrete grey, amber streetlights, cool blue sky
  - NO purple/pink neon — only amber, white, and occasional blue-white
  - Buildings: dark glass + concrete, lit windows (warm yellow/white)
  - Skyline: realistic tower silhouettes, not glowing cubes
  - Streetlights: sodium-vapor amber (like real highways)
  - Ground: dark wet tarmac
*/
export default function Environment({ speedRef }) {
  const nearRef  = useRef([])
  const farRef   = useRef([])
  const lightRef = useRef([])
  const offNear  = useRef(0)
  const offFar   = useRef(0)
  const timeRef  = useRef(0)

  const NEAR_REPEAT = 90
  const FAR_REPEAT  = 150
  const SIDE = ROAD_WIDTH / 2

  // Near buildings — realistic urban architecture
  const nearBuildings = useMemo(() => {
    const rng = seededRand(42)
    // Realistic building types
    const types = [
      { hMin: 5,  hMax: 10, wMin: 8,  wMax: 14, dMin: 6, dMax: 10, name: 'warehouse'  },
      { hMin: 12, hMax: 22, wMin: 6,  wMax: 10, dMin: 5, dMax: 8,  name: 'office'     },
      { hMin: 24, hMax: 40, wMin: 5,  wMax: 9,  dMin: 5, dMax: 7,  name: 'tower'      },
      { hMin: 8,  hMax: 14, wMin: 10, wMax: 16, dMin: 8, dMax: 12, name: 'commercial' },
    ]
    return Array.from({ length: 14 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const type = types[i % types.length]
      const h    = type.hMin + rng() * (type.hMax - type.hMin)
      const w    = type.wMin + rng() * (type.wMax - type.wMin)
      const d    = type.dMin + rng() * (type.dMax - type.dMin)
      // Stagger distance from road — creates depth
      const dist = 5 + (i % 3) * 4 + rng() * 3
      const x    = side * (SIDE + dist)
      const z    = -(i * 12) % NEAR_REPEAT

      // Window grid — realistic office building density
      const floorH   = type.name === 'tower' ? 2.8 : 3.2
      const winRows  = Math.floor((h - 2) / floorH)
      const winCols  = Math.floor(w / 2.2)
      const wins = []
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const lit = rng() > 0.38  // ~62% lit at night
          wins.push({
            x: (c - (winCols - 1) / 2) * 2.0,
            y: 2.2 + r * floorH,
            lit,
            warm: rng() > 0.3,  // most windows warm (office lights)
          })
        }
      }

      // Realistic building colors — concrete, glass, steel
      const bodyColors = ['#1e1e22', '#1a1e24', '#202020', '#1c1c20']
      const bodyColor  = bodyColors[Math.floor(rng() * bodyColors.length)]

      return { x, h, w, d, z, wins, side, bodyColor, typeName: type.name }
    })
  }, [])

  // Far buildings — pure silhouettes, realistic skyline
  const farBuildings = useMemo(() => {
    const rng = seededRand(77)
    return Array.from({ length: 22 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const x    = side * (SIDE + 25 + rng() * 22)
      const h    = 20 + rng() * 45
      const w    = 6 + rng() * 12
      const z    = -(i * 13) % FAR_REPEAT
      // Realistic tower tops — some have antenna, some flat, some tapered
      const topType = Math.floor(rng() * 3)  // 0=flat, 1=antenna, 2=tapered
      return { x, h, w, z, topType }
    })
  }, [])

  // Streetlights — sodium vapor amber, highway style
  const streetlights = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      return { x: side * (SIDE + 1.8), z: -(i * 12) % NEAR_REPEAT, side }
    })
  }, [])

  useFrame((_, delta) => {
    if (!speedRef?.current) return
    timeRef.current += delta
    const spd = speedRef.current

    offNear.current = (offNear.current + spd * delta * 60) % NEAR_REPEAT
    offFar.current  = (offFar.current  + spd * delta * 20) % FAR_REPEAT

    nearRef.current.forEach((m, i) => {
      if (!m || !nearBuildings[i]) return
      let z = nearBuildings[i].z + offNear.current
      while (z > 12) z -= NEAR_REPEAT
      m.position.z = z
    })
    farRef.current.forEach((m, i) => {
      if (!m || !farBuildings[i]) return
      let z = farBuildings[i].z + offFar.current
      while (z > 12) z -= FAR_REPEAT
      m.position.z = z
    })
    lightRef.current.forEach((m, i) => {
      if (!m || !streetlights[i]) return
      let z = streetlights[i].z + offNear.current
      while (z > 12) z -= NEAR_REPEAT
      m.position.z = z
    })
  })

  return (
    <group>
      {/* ── Night sky — overcast, city-lit from below ── */}
      <mesh position={[0, 30, -70]}>
        <planeGeometry args={[600, 120]} />
        <meshBasicMaterial color="#0a0e18" side={THREE.DoubleSide} />
      </mesh>

      {/* ── City light pollution on horizon — amber/orange glow ── */}
      <mesh position={[0, 10, -105]}>
        <planeGeometry args={[600, 24]} />
        <meshBasicMaterial color="#1a1408" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 4, -105]}>
        <planeGeometry args={[600, 10]} />
        <meshBasicMaterial color="#2a1c08" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.5, -105]}>
        <planeGeometry args={[600, 4]} />
        <meshBasicMaterial color="#3a2408" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Ground — dark wet tarmac ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[300, ROAD_LENGTH]} />
        <meshStandardMaterial color="#111114" roughness={0.9} />
      </mesh>

      {/* ── Far buildings — realistic silhouettes ── */}
      {farBuildings.map((b, i) => (
        <group key={i} ref={el => farRef.current[i] = el} position={[b.x, 0, b.z]}>
          {/* Main tower body */}
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, 2]} />
            <meshStandardMaterial color="#141418" roughness={0.8} emissive="#0c0c10" emissiveIntensity={0.15} />
          </mesh>
          {/* Antenna */}
          {b.topType === 1 && (
            <mesh position={[0, b.h + 3, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 6, 4]} />
              <meshStandardMaterial color="#202024" roughness={0.7} />
            </mesh>
          )}
          {/* Tapered top */}
          {b.topType === 2 && (
            <mesh position={[0, b.h + 2, 0]}>
              <coneGeometry args={[b.w * 0.3, 4, 4]} />
              <meshStandardMaterial color="#181818" roughness={0.8} />
            </mesh>
          )}
          {/* A few lit windows on far buildings */}
          {i % 3 === 0 && (
            <mesh position={[0, b.h * 0.6, b.w > 0 ? -1.01 : 1.01]}>
              <planeGeometry args={[b.w * 0.4, b.h * 0.25]} />
              <meshBasicMaterial color="#ffe8a0" transparent opacity={0.12} />
            </mesh>
          )}
        </group>
      ))}

      {/* ── Near buildings — detailed, realistic ── */}
      {nearBuildings.map((b, i) => (
        <group key={i} ref={el => nearRef.current[i] = el} position={[b.x, 0, b.z]}>
          {/* Main body — dark concrete/glass */}
          <mesh position={[0, b.h / 2, 0]} receiveShadow castShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color={b.bodyColor}
              roughness={0.55}
              metalness={0.3}
            />
          </mesh>

          {/* Concrete base — slightly lighter, ground-level detail */}
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[b.w + 0.3, 2.4, b.d + 0.3]} />
            <meshStandardMaterial color="#282828" roughness={0.9} metalness={0.0} />
          </mesh>

          {/* Window grid — warm yellow/white office lights */}
          {b.wins.map((win, j) => (
            <mesh
              key={j}
              position={[win.x, win.y, b.side > 0 ? -b.d / 2 - 0.01 : b.d / 2 + 0.01]}
            >
              <planeGeometry args={[0.9, 1.2]} />
              <meshBasicMaterial
                color={win.warm ? '#ffe8a0' : '#e8f0ff'}
                transparent
                opacity={win.lit ? 0.72 : 0.06}
              />
            </mesh>
          ))}

          {/* Rooftop — flat with mechanical equipment suggestion */}
          <mesh position={[0, b.h + 0.15, 0]}>
            <boxGeometry args={[b.w, 0.3, b.d]} />
            <meshStandardMaterial color="#252525" roughness={0.9} />
          </mesh>
          {/* HVAC unit suggestion */}
          {b.typeName !== 'warehouse' && (
            <mesh position={[b.w * 0.25, b.h + 0.6, 0]}>
              <boxGeometry args={[b.w * 0.3, 0.6, b.d * 0.3]} />
              <meshStandardMaterial color="#202020" roughness={0.85} />
            </mesh>
          )}
        </group>
      ))}

      {/* ── Streetlights — sodium vapor amber, highway style ── */}
      {streetlights.map((sl, i) => (
        <group key={i} ref={el => lightRef.current[i] = el} position={[sl.x, 0, sl.z]}>
          {/* Pole — galvanized steel */}
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 7, 6]} />
            <meshStandardMaterial color="#2a2a2e" roughness={0.6} metalness={0.8} />
          </mesh>
          {/* Arm */}
          <mesh position={[sl.side * -0.8, 7.1, 0]} rotation={[0, 0, sl.side * 0.15]}>
            <cylinderGeometry args={[0.04, 0.04, 1.8, 5]} />
            <meshStandardMaterial color="#2a2a2e" roughness={0.6} metalness={0.8} />
          </mesh>
          {/* Cobra-head fixture */}
          <mesh position={[sl.side * -1.5, 7.1, 0]}>
            <boxGeometry args={[0.5, 0.18, 0.4]} />
            <meshStandardMaterial color="#222224" roughness={0.5} metalness={0.7} />
          </mesh>
          {/* Lens — warm amber */}
          <mesh position={[sl.side * -1.5, 7.0, 0]}>
            <boxGeometry args={[0.42, 0.06, 0.34]} />
            <meshBasicMaterial color="#ffcc44" transparent opacity={0.9} />
          </mesh>
          {/* Light */}
          <pointLight color="#ffcc44" intensity={25} distance={20} decay={2} position={[sl.side * -1.5, 6.8, 0]} />
        </group>
      ))}

      {/* ── Skyline — 4 depth layers, realistic tower shapes ── */}
      {/* Layer 1 — z=-80, closest */}
      {[
        { x: -42, h: 28, w: 8  }, { x: -28, h: 18, w: 12 }, { x: -14, h: 35, w: 7  },
        { x:  14, h: 22, w: 10 }, { x:  28, h: 40, w: 6  }, { x:  42, h: 16, w: 14 },
      ].map((b, i) => (
        <group key={`s1_${i}`} position={[b.x, 0, -80]}>
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, 1.5]} />
            <meshStandardMaterial color="#161618" roughness={0.8} emissive="#0e0e10" emissiveIntensity={0.12} />
          </mesh>
          {/* Lit windows — sparse */}
          <mesh position={[0, b.h * 0.55, -0.76]}>
            <planeGeometry args={[b.w * 0.5, b.h * 0.3]} />
            <meshBasicMaterial color="#ffe8a0" transparent opacity={0.1} />
          </mesh>
        </group>
      ))}
      {/* Layer 2 — z=-90 */}
      {[
        { x: -58, h: 42, w: 9  }, { x: -40, h: 28, w: 13 }, { x: -22, h: 55, w: 7  },
        { x:  22, h: 35, w: 11 }, { x:  40, h: 48, w: 8  }, { x:  58, h: 22, w: 15 },
      ].map((b, i) => (
        <mesh key={`s2_${i}`} position={[b.x, b.h / 2, -90]}>
          <boxGeometry args={[b.w, b.h, 1.2]} />
          <meshStandardMaterial color="#121214" roughness={0.85} emissive="#0a0a0c" emissiveIntensity={0.1} />
        </mesh>
      ))}
      {/* Layer 3 — z=-98 */}
      {[-75, -52, -32, 32, 52, 75].map((x, i) => (
        <mesh key={`s3_${i}`} position={[x, 30 + (i % 3) * 12, -98]}>
          <boxGeometry args={[10 + (i % 2) * 4, 60 + (i % 3) * 16, 1]} />
          <meshBasicMaterial color="#0e0e10" transparent opacity={0.95} />
        </mesh>
      ))}
      {/* Layer 4 — z=-105, farthest */}
      {[-95, -68, -44, 44, 68, 95].map((x, i) => (
        <mesh key={`s4_${i}`} position={[x, 38 + (i % 2) * 14, -105]}>
          <boxGeometry args={[12 + (i % 3) * 4, 76 + (i % 2) * 20, 0.5]} />
          <meshBasicMaterial color="#0a0a0c" transparent opacity={0.9} />
        </mesh>
      ))}

      {/* ── City ambient — warm amber from below, cool blue from above ── */}
      <pointLight position={[-SIDE - 12, 8,  -20]} color="#cc8822" intensity={5} distance={50} decay={1.5} />
      <pointLight position={[ SIDE + 12, 8,  -20]} color="#cc8822" intensity={5} distance={50} decay={1.5} />
      <pointLight position={[-SIDE - 10, 15, -55]} color="#1a2840" intensity={4} distance={55} decay={1.5} />
      <pointLight position={[ SIDE + 10, 15, -55]} color="#1a2840" intensity={4} distance={55} decay={1.5} />
    </group>
  )
}
