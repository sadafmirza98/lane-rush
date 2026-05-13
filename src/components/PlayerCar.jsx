import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const LANE_POSITIONS = [-6.4, -3.2, 0, 3.2, 6.4]

/*
  Realistic stylized sports car — NFS / Gran Turismo aesthetic
  Color: deep midnight blue metallic (not purple, not black)
  Proportions: wide, low, aggressive — proper sports car stance
  Materials: high metalness, low roughness — reflects environment
  Lights: white headlights, red taillights — realistic, not neon
*/
export default function PlayerCar({ targetLaneRef, carXRef, shakeRef }) {
  const groupRef      = useRef()
  const bodyRef       = useRef()
  const tiltRef       = useRef(0)
  const bobbRef       = useRef(0)
  const rearLightRef  = useRef()
  const rearLight2Ref = useRef()
  const pulseT        = useRef(0)
  const prevX         = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const targetX  = LANE_POSITIONS[targetLaneRef.current] ?? 0
    const currentX = groupRef.current.position.x
    const newX     = currentX + (targetX - currentX) * Math.min(delta * 10, 1)
    groupRef.current.position.x = newX
    carXRef.current = newX

    const lean = -(newX - prevX.current) * 20
    prevX.current = newX
    tiltRef.current += (lean - tiltRef.current) * Math.min(delta * 8, 1)
    if (bodyRef.current) bodyRef.current.rotation.z = Math.max(-0.2, Math.min(0.2, tiltRef.current))

    bobbRef.current += delta * 1.3
    groupRef.current.position.y = 0.28 + Math.sin(bobbRef.current) * 0.01

    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - delta * 3.5)
      groupRef.current.position.x += (Math.random() - 0.5) * shakeRef.current * 0.4
      groupRef.current.position.y += (Math.random() - 0.5) * shakeRef.current * 0.15
    }

    pulseT.current += delta * 0.9
    const pulse = 0.88 + Math.sin(pulseT.current) * 0.12
    if (rearLightRef.current)  rearLightRef.current.intensity  = 16 * pulse
    if (rearLight2Ref.current) rearLight2Ref.current.intensity = 5  * pulse
  })

  // Car color — deep midnight blue metallic
  const bodyMat  = { color: '#0e1428', roughness: 0.06, metalness: 0.96 }
  const bodyMat2 = { color: '#121830', roughness: 0.05, metalness: 0.98 }
  const glassMat = { color: '#0a1020', roughness: 0.02, metalness: 0.7, transparent: true, opacity: 0.85 }
  const darkMat  = { color: '#080c14', roughness: 0.08, metalness: 0.95 }
  const tyreMat  = { color: '#0c0c0e', roughness: 0.9,  metalness: 0.02 }
  const rimMat   = { color: '#303040', roughness: 0.2,  metalness: 0.95 }

  return (
    <group ref={groupRef} position={[0, 0.28, -1.5]}>
      <group ref={bodyRef}>

        {/* ── Floor / underbody ── */}
        <mesh castShadow position={[0, 0.06, 0]}>
          <boxGeometry args={[1.9, 0.12, 4.4]} />
          <meshStandardMaterial {...darkMat} />
        </mesh>

        {/* ── Lower body — main slab ── */}
        <mesh castShadow position={[0, 0.22, 0]}>
          <boxGeometry args={[1.82, 0.24, 4.2]} />
          <meshStandardMaterial {...bodyMat} />
        </mesh>

        {/* ── Upper body — slightly narrower, tapers to cabin ── */}
        <mesh castShadow position={[0, 0.38, 0.1]}>
          <boxGeometry args={[1.72, 0.2, 3.8]} />
          <meshStandardMaterial {...bodyMat2} />
        </mesh>

        {/* ── Cabin ── */}
        <mesh castShadow position={[0, 0.56, 0.2]}>
          <boxGeometry args={[1.36, 0.28, 1.95]} />
          <meshStandardMaterial {...glassMat} />
        </mesh>

        {/* ── Windshield ── */}
        <mesh position={[0, 0.56, 1.16]}>
          <boxGeometry args={[1.3, 0.24, 0.05]} />
          <meshStandardMaterial color="#0c1828" roughness={0.01} metalness={0.6} transparent opacity={0.45} />
        </mesh>

        {/* ── Rear window ── */}
        <mesh position={[0, 0.54, -0.78]}>
          <boxGeometry args={[1.26, 0.22, 0.05]} />
          <meshStandardMaterial color="#0a1420" roughness={0.01} metalness={0.6} transparent opacity={0.38} />
        </mesh>

        {/* ── Hood — long, flat ── */}
        <mesh castShadow position={[0, 0.44, 1.6]}>
          <boxGeometry args={[1.7, 0.06, 1.2]} />
          <meshStandardMaterial {...bodyMat2} />
        </mesh>

        {/* ── Rear deck ── */}
        <mesh castShadow position={[0, 0.44, -1.6]}>
          <boxGeometry args={[1.7, 0.06, 0.9]} />
          <meshStandardMaterial {...bodyMat2} />
        </mesh>

        {/* ── Spoiler — carbon-look ── */}
        <mesh position={[0, 0.6, -2.05]}>
          <boxGeometry args={[1.65, 0.07, 0.28]} />
          <meshStandardMaterial color="#0a0a0c" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[ 0.68, 0.44, -2.05]}>
          <boxGeometry args={[0.07, 0.32, 0.26]} />
          <meshStandardMaterial color="#0a0a0c" roughness={0.15} metalness={0.9} />
        </mesh>
        <mesh position={[-0.68, 0.44, -2.05]}>
          <boxGeometry args={[0.07, 0.32, 0.26]} />
          <meshStandardMaterial color="#0a0a0c" roughness={0.15} metalness={0.9} />
        </mesh>

        {/* ── Side sills ── */}
        <mesh position={[ 0.94, 0.1, 0]}>
          <boxGeometry args={[0.1, 0.2, 4.0]} />
          <meshStandardMaterial color="#0c1020" roughness={0.1} metalness={0.92} />
        </mesh>
        <mesh position={[-0.94, 0.1, 0]}>
          <boxGeometry args={[0.1, 0.2, 4.0]} />
          <meshStandardMaterial color="#0c1020" roughness={0.1} metalness={0.92} />
        </mesh>

        {/* ── Front bumper ── */}
        <mesh position={[0, 0.14, 2.18]}>
          <boxGeometry args={[1.75, 0.22, 0.12]} />
          <meshStandardMaterial color="#0a0e18" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Front splitter */}
        <mesh position={[0, 0.04, 2.2]}>
          <boxGeometry args={[1.6, 0.06, 0.18]} />
          <meshStandardMaterial color="#080808" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* ── Rear bumper ── */}
        <mesh position={[0, 0.14, -2.18]}>
          <boxGeometry args={[1.75, 0.22, 0.12]} />
          <meshStandardMaterial color="#0a0e18" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Diffuser */}
        <mesh position={[0, 0.04, -2.2]}>
          <boxGeometry args={[1.5, 0.08, 0.22]} />
          <meshStandardMaterial color="#080808" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* ── Headlights — white, modern LED style ── */}
        {/* Outer housing */}
        <mesh position={[ 0.65, 0.24, 2.22]}>
          <boxGeometry args={[0.38, 0.14, 0.06]} />
          <meshStandardMaterial color="#181828" roughness={0.1} metalness={0.9} />
        </mesh>
        <mesh position={[-0.65, 0.24, 2.22]}>
          <boxGeometry args={[0.38, 0.14, 0.06]} />
          <meshStandardMaterial color="#181828" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* LED element */}
        <mesh position={[ 0.65, 0.24, 2.23]}>
          <boxGeometry args={[0.28, 0.08, 0.04]} />
          <meshBasicMaterial color="#f0f4ff" />
        </mesh>
        <mesh position={[-0.65, 0.24, 2.23]}>
          <boxGeometry args={[0.28, 0.08, 0.04]} />
          <meshBasicMaterial color="#f0f4ff" />
        </mesh>
        {/* DRL strip */}
        <mesh position={[0, 0.14, 2.23]}>
          <boxGeometry args={[1.45, 0.04, 0.04]} />
          <meshBasicMaterial color="#d8e8ff" transparent opacity={0.9} />
        </mesh>

        {/* ── Taillights — red, full-width bar ── */}
        <mesh position={[0, 0.24, -2.22]}>
          <boxGeometry args={[1.7, 0.12, 0.06]} />
          <meshStandardMaterial color="#1a0808" roughness={0.1} metalness={0.8} />
        </mesh>
        {/* LED bar */}
        <mesh position={[0, 0.24, -2.23]}>
          <boxGeometry args={[1.5, 0.07, 0.04]} />
          <meshBasicMaterial color="#ff2200" />
        </mesh>
        {/* Inner bright strip */}
        <mesh position={[0, 0.24, -2.22]}>
          <boxGeometry args={[1.2, 0.04, 0.03]} />
          <meshBasicMaterial color="#ff8866" />
        </mesh>

        {/* ── Wheels — 4 corners ── */}
        {[[-0.97, -0.1, 1.35], [0.97, -0.1, 1.35], [-0.97, -0.1, -1.35], [0.97, -0.1, -1.35]].map((pos, i) => (
          <group key={i} position={pos}>
            {/* Tyre */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.32, 0.32, 0.3, 18]} />
              <meshStandardMaterial {...tyreMat} />
            </mesh>
            {/* Alloy rim — dark gunmetal */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.21, 0.21, 0.32, 12]} />
              <meshStandardMaterial {...rimMat} />
            </mesh>
            {/* Rim spokes — 5-spoke suggestion */}
            {[0, 1, 2, 3, 4].map(s => (
              <mesh key={s} rotation={[0, 0, Math.PI / 2]} position={[i % 2 === 0 ? 0.14 : -0.14, 0, 0]}>
                <boxGeometry args={[0.02, 0.04, 0.36]} />
                <meshStandardMaterial color="#404050" roughness={0.2} metalness={0.95} />
              </mesh>
            ))}
            {/* Brake caliper — red */}
            <mesh rotation={[0, 0, Math.PI / 2]} position={[i % 2 === 0 ? 0.12 : -0.12, 0.12, 0]}>
              <boxGeometry args={[0.06, 0.1, 0.14]} />
              <meshBasicMaterial color="#cc2200" transparent opacity={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── Lights ── */}
      {/* Headlights — white, flood road ahead */}
      <pointLight position={[ 0.65, 0.28, 4.0]} color="#e8f0ff" intensity={45} distance={42} decay={2} />
      <pointLight position={[-0.65, 0.28, 4.0]} color="#e8f0ff" intensity={45} distance={42} decay={2} />
      {/* Wide flood */}
      <pointLight position={[0, 0.4, 6.0]} color="#c0d8ff" intensity={20} distance={50} decay={2} />

      {/* Taillights — red, breathing */}
      <pointLight ref={rearLightRef}  position={[0, 0.28, -2.8]} color="#ff2200" intensity={16} distance={14} decay={2} />
      <pointLight ref={rearLight2Ref} position={[0, 0.1,  -2.2]} color="#cc1100" intensity={5}  distance={8}  decay={2} />
    </group>
  )
}
