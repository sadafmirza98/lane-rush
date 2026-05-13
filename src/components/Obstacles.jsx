import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store'
import { LANE_COUNT } from '../game/constants'

const LANE_POSITIONS = [-6.4, -3.2, 0, 3.2, 6.4]
const SPAWN_Z  = -95
const DESPAWN_Z = 8
const POOL_SIZE = 10

/*
  Obstacle philosophy:
  - Each type has a DISTINCT silhouette readable at speed
  - Color identity: one accent color per type, used sparingly
  - ONE point light per obstacle — not three
  - Dark bodies with bright edges/lights only
  - Headlights face the player (rear of obstacle = front of player view)
*/
const TYPES = [
  { id: 'sedan',   w: 1.5, h: 0.68, d: 3.2, body: '#0e0c20', accent: '#00aaff', light: '#0088ff' },
  { id: 'truck',   w: 1.8, h: 1.15, d: 5.0, body: '#180a04', accent: '#ff6600', light: '#ff5500' },
  { id: 'barrier', w: 3.4, h: 0.5,  d: 0.65, body: '#1a0008', accent: '#ff1a1a', light: '#ff0000' },
  { id: 'suv',     w: 1.65, h: 0.85, d: 3.6, body: '#0a0c18', accent: '#cc44ff', light: '#aa22ff' },
]

function rndLane() { return Math.floor(Math.random() * LANE_COUNT) }
function rndType() { return TYPES[Math.floor(Math.random() * TYPES.length)] }
function mkObs()   { return { active: false, lane: 0, z: SPAWN_Z, type: TYPES[0], id: 0 } }

export default function Obstacles({ speedRef, carXRef, crashedRef, shakeRef, slowMoRef, onCrash }) {
  const phase    = useGameStore(s => s.phase)
  const addScore = useGameStore(s => s.addScore)
  const setCombo = useGameStore(s => s.setCombo)

  const pool        = useRef(Array.from({ length: POOL_SIZE }, mkObs))
  const meshRefs    = useRef([])
  const spawnTimer  = useRef(0)
  const spawnGap    = useRef(1.8)
  const comboRef    = useRef(0)
  const passedSet   = useRef(new Set())

  useEffect(() => {
    if (phase === 'playing') {
      pool.current.forEach(o => { o.active = false })
      passedSet.current.clear()
      comboRef.current = 0
      spawnTimer.current = 0
      spawnGap.current = 1.8
    }
  }, [phase])

  useFrame((_, delta) => {
    if (phase !== 'playing' || crashedRef.current) return
    const spd = speedRef.current
    const dt  = delta * slowMoRef.current

    // Spawn
    spawnTimer.current += dt
    if (spawnTimer.current >= spawnGap.current) {
      spawnTimer.current = 0
      spawnGap.current = Math.max(0.65, 1.8 - spd * 0.38)
      const slot = pool.current.find(o => !o.active)
      if (slot) {
        slot.active = true
        slot.lane   = rndLane()
        slot.z      = SPAWN_Z
        slot.type   = rndType()
        slot.id     = Math.random()
        passedSet.current.delete(slot.id)
      }
    }

    pool.current.forEach((obs, i) => {
      if (!obs.active) return
      obs.z += spd * dt * 60

      const mesh = meshRefs.current[i]
      if (mesh) {
        mesh.position.z = obs.z
        mesh.position.x = LANE_POSITIONS[obs.lane]
        mesh.visible    = true
      }

      // Score
      if (obs.z > 3 && !passedSet.current.has(obs.id)) {
        passedSet.current.add(obs.id)
        comboRef.current += 1
        setCombo(comboRef.current)
        addScore(10 * comboRef.current)
      }

      // Despawn
      if (obs.z > DESPAWN_Z + 2) {
        obs.active = false
        if (mesh) mesh.visible = false
      }

      // Collision
      if (!crashedRef.current) {
        const dx = Math.abs(carXRef.current - LANE_POSITIONS[obs.lane])
        const dz = Math.abs(obs.z - (-1.5))
        if (dx < 1.2 && dz < 2.4) {
          crashedRef.current = true
          shakeRef.current   = 3.5
          slowMoRef.current  = 0.12
          setTimeout(() => { slowMoRef.current = 1; onCrash?.() }, 1400)
        }
      }
    })
  })

  return (
    <group>
      {pool.current.map((obs, i) => (
        <ObstacleMesh key={i} index={i} obs={obs} meshRefs={meshRefs} />
      ))}
    </group>
  )
}

function ObstacleMesh({ index, obs, meshRefs }) {
  const ref = useRef()
  useEffect(() => { meshRefs.current[index] = ref.current }, [])
  const { type } = obs
  const { id, w, h, d, body, accent, light } = type

  return (
    <group ref={ref} visible={false} position={[0, 0, SPAWN_Z]}>
      {id === 'barrier' ? (
        // Barrier — wide, low, high-contrast warning stripes
        <group position={[0, h / 2, 0]}>
          <mesh>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#1a0008" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Warning chevrons — alternating red/yellow */}
          {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]}>
              <boxGeometry args={[0.22, h + 0.02, d + 0.02]} />
              <meshBasicMaterial color={i % 2 === 0 ? '#ff1a1a' : '#ffcc00'} transparent opacity={0.92} />
            </mesh>
          ))}
          <pointLight color={light} intensity={8} distance={8} decay={2} position={[0, 0.8, 0]} />
        </group>

      ) : id === 'truck' ? (
        // Truck — tall, imposing, orange cab
        <group>
          {/* Trailer */}
          <mesh position={[0, h * 0.5, -0.8]} castShadow>
            <boxGeometry args={[w, h, d - 1.2]} />
            <meshStandardMaterial color={body} roughness={0.25} metalness={0.75} />
          </mesh>
          {/* Cab */}
          <mesh position={[0, h * 0.55, d / 2 - 0.5]} castShadow>
            <boxGeometry args={[w, h * 0.9, 1.4]} />
            <meshStandardMaterial color="#100804" roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Cab accent stripe */}
          <mesh position={[0, h * 0.9, d / 2 - 0.5]}>
            <boxGeometry args={[w + 0.05, 0.1, 1.42]} />
            <meshBasicMaterial color={accent} transparent opacity={0.85} />
          </mesh>
          {/* Headlights facing player */}
          <mesh position={[0.55, h * 0.5, -d / 2 - 0.02]}>
            <boxGeometry args={[0.3, 0.12, 0.04]} />
            <meshBasicMaterial color="#ffe8c0" />
          </mesh>
          <mesh position={[-0.55, h * 0.5, -d / 2 - 0.02]}>
            <boxGeometry args={[0.3, 0.12, 0.04]} />
            <meshBasicMaterial color="#ffe8c0" />
          </mesh>
          <pointLight color={light} intensity={10} distance={10} decay={2} position={[0, h, 0]} />
        </group>

      ) : (
        // Sedan / SUV — sleek dark car
        <group>
          {/* Body */}
          <mesh position={[0, h * 0.45, 0]} castShadow>
            <boxGeometry args={[w, h * 0.55, d]} />
            <meshStandardMaterial color={body} roughness={0.08} metalness={0.95} />
          </mesh>
          {/* Cabin */}
          <mesh position={[0, h * 0.88, 0.05]}>
            <boxGeometry args={[w * 0.82, h * 0.42, d * 0.52]} />
            <meshStandardMaterial color="#080618" roughness={0.04} metalness={0.9} transparent opacity={0.9} />
          </mesh>
          {/* Accent strip — bottom edge only */}
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[w + 0.06, 0.06, d + 0.06]} />
            <meshBasicMaterial color={accent} transparent opacity={0.85} />
          </mesh>
          {/* Headlights facing player (rear of obstacle) */}
          <mesh position={[0.48, h * 0.42, -d / 2 - 0.02]}>
            <boxGeometry args={[0.26, 0.09, 0.04]} />
            <meshBasicMaterial color="#ddeeff" />
          </mesh>
          <mesh position={[-0.48, h * 0.42, -d / 2 - 0.02]}>
            <boxGeometry args={[0.26, 0.09, 0.04]} />
            <meshBasicMaterial color="#ddeeff" />
          </mesh>
          {/* Taillights (facing away) */}
          <mesh position={[0, h * 0.42, d / 2 + 0.02]}>
            <boxGeometry args={[w * 0.7, 0.08, 0.04]} />
            <meshBasicMaterial color={accent} />
          </mesh>
          <pointLight color={light} intensity={8} distance={9} decay={2} position={[0, h * 0.6, -d / 2 - 1]} />
        </group>
      )}
    </group>
  )
}
