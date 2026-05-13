// ============================================================
//  LANE RUSH — Neon Velocity  |  Three.js Cinematic Engine
//  Pure static — no backend, no build step needed
//  Open index.html directly in browser
// ============================================================
import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';

// ── CONSTANTS ────────────────────────────────────────────────
const LANES       = 4;
const LANE_WIDTH  = 3.5;
const ROAD_WIDTH  = LANES * LANE_WIDTH;
const CAR_SPEED_BASE   = 0.28;
const CAR_SPEED_MAX    = 0.95;
const SPEED_INCREMENT  = 0.000035;
const NITRO_BOOST      = 0.38;
const NITRO_DRAIN      = 0.012;
const NITRO_REGEN      = 0.003;
const OBSTACLE_INTERVAL_START = 1800;
const OBSTACLE_INTERVAL_MIN   = 600;
const ROAD_SEGMENT_LENGTH     = 40;
const ROAD_SEGMENTS           = 8;
const FOG_COLOR   = 0x050818;

// ── STATE ────────────────────────────────────────────────────
const state = {
  phase: 'intro',   // intro | playing | paused | gameover
  score: 0,
  hiScore: parseInt(localStorage.getItem('lr_hi') || '0'),
  distance: 0,
  speed: CAR_SPEED_BASE,
  nitro: 1.0,
  nitroActive: false,
  multiplier: 1,
  nearMissStreak: 0,
  topSpeed: 0,
  carLane: 1,          // 0-3
  carTargetX: 0,
  carCurrentX: 0,
  keys: {},
  lastObstacleTime: 0,
  obstacleInterval: OBSTACLE_INTERVAL_START,
  crashTime: 0,
  shakeIntensity: 0,
  slowMo: false,
  slowMoTimer: 0,
};

// ── DOM REFS ─────────────────────────────────────────────────
const canvas        = document.getElementById('game-canvas');
const introScreen   = document.getElementById('intro-screen');
const hud           = document.getElementById('hud');
const pauseMenu     = document.getElementById('pause-menu');
const gameOverScreen= document.getElementById('game-over-screen');
const scorePopups   = document.getElementById('score-popups');

const elSpeed       = document.getElementById('hud-speed');
const elSpeedBar    = document.getElementById('hud-speed-bar');
const elScore       = document.getElementById('hud-score');
const elMultiplier  = document.getElementById('hud-multiplier');
const elNitroBar    = document.getElementById('hud-nitro-bar');
const elDistance    = document.getElementById('hud-distance');
const elCombo       = document.getElementById('hud-combo');
const elGoScore     = document.getElementById('go-score');
const elGoDistance  = document.getElementById('go-distance');
const elGoSpeed     = document.getElementById('go-speed');
const elGoHiScore   = document.getElementById('go-hi-score');
const elIntroHi     = document.getElementById('intro-hi-score');

// ── RENDERER ─────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── SCENE ────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.038);
scene.background = new THREE.Color(FOG_COLOR);

// ── CAMERA ───────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 4.5, 10);
camera.lookAt(0, 0, -10);

// ── POST PROCESSING ──────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.4,   // strength
  0.5,   // radius
  0.2    // threshold
);
composer.addPass(bloomPass);

// Custom vignette + chromatic aberration shader
const vignetteShader = {
  uniforms: {
    tDiffuse:   { value: null },
    uIntensity: { value: 0.5 },
    uChrAb:     { value: 0.0 },
    uTime:      { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uChrAb;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      // Chromatic aberration
      float ca = uChrAb * 0.008;
      vec4 r = texture2D(tDiffuse, uv + vec2(ca, 0.0));
      vec4 g = texture2D(tDiffuse, uv);
      vec4 b = texture2D(tDiffuse, uv - vec2(ca, 0.0));
      vec4 col = vec4(r.r, g.g, b.b, 1.0);
      // Vignette
      vec2 d = uv - 0.5;
      float vig = 1.0 - dot(d, d) * uIntensity * 2.8;
      col.rgb *= clamp(vig, 0.0, 1.0);
      // Scanlines subtle
      float scan = sin(uv.y * 800.0) * 0.015;
      col.rgb -= scan;
      gl_FragColor = col;
    }
  `
};
const vignettePass = new ShaderPass(vignetteShader);
composer.addPass(vignettePass);


// ── LIGHTING ─────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x0a0a1a, 0.8);
scene.add(ambientLight);

// Main directional (moon-like)
const moonLight = new THREE.DirectionalLight(0x4466ff, 0.6);
moonLight.position.set(10, 30, 10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 0.1;
moonLight.shadow.camera.far = 200;
moonLight.shadow.camera.left = -30;
moonLight.shadow.camera.right = 30;
moonLight.shadow.camera.top = 30;
moonLight.shadow.camera.bottom = -30;
scene.add(moonLight);

// Neon road lights — cyan left, pink right
const neonLeft  = new THREE.PointLight(0x00f5ff, 3.0, 25);
neonLeft.position.set(-ROAD_WIDTH * 0.5 - 1, 1.5, 0);
scene.add(neonLeft);

const neonRight = new THREE.PointLight(0xff0080, 3.0, 25);
neonRight.position.set(ROAD_WIDTH * 0.5 + 1, 1.5, 0);
scene.add(neonRight);

// Car headlight
const headLight = new THREE.SpotLight(0xffffff, 8, 40, Math.PI * 0.12, 0.4, 1.5);
headLight.position.set(0, 2, 8);
headLight.target.position.set(0, 0, -20);
scene.add(headLight);
scene.add(headLight.target);

// ── ROAD SYSTEM ──────────────────────────────────────────────
const roadMat = new THREE.MeshStandardMaterial({
  color: 0x111118,
  roughness: 0.3,
  metalness: 0.6,
  envMapIntensity: 0.8,
});

const roadSegments = [];
const segGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT_LENGTH);

for (let i = 0; i < ROAD_SEGMENTS; i++) {
  const mesh = new THREE.Mesh(segGeo, roadMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.z = -i * ROAD_SEGMENT_LENGTH + ROAD_SEGMENT_LENGTH * 0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
  roadSegments.push(mesh);
}

// Road edge neon strips
function makeEdgeStrip(x) {
  const geo = new THREE.PlaneGeometry(0.18, ROAD_SEGMENT_LENGTH * ROAD_SEGMENTS);
  const mat = new THREE.MeshBasicMaterial({
    color: x < 0 ? 0x00f5ff : 0xff0080,
    transparent: true, opacity: 0.9
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.01, -ROAD_SEGMENT_LENGTH * ROAD_SEGMENTS * 0.5 + ROAD_SEGMENT_LENGTH * 0.5);
  scene.add(mesh);
}
makeEdgeStrip(-ROAD_WIDTH * 0.5);
makeEdgeStrip( ROAD_WIDTH * 0.5);

// Lane dividers
const dividerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
const dividerGeo = new THREE.PlaneGeometry(0.08, 2.5);
const dividers = [];
for (let lane = 1; lane < LANES; lane++) {
  const x = -ROAD_WIDTH * 0.5 + lane * LANE_WIDTH;
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(dividerGeo, dividerMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.01, -i * 5);
    scene.add(m);
    dividers.push(m);
  }
}

// ── CITY ENVIRONMENT ─────────────────────────────────────────
const buildingColors = [0x00f5ff, 0xff0080, 0x9d00ff, 0xff6a00, 0x00ff88];

function makeBuildingCluster(side) {
  const group = new THREE.Group();
  const count = 12;
  for (let i = 0; i < count; i++) {
    const w = 2 + Math.random() * 4;
    const h = 8 + Math.random() * 40;
    const d = 2 + Math.random() * 4;
    const geo = new THREE.BoxGeometry(w, h, d);

    // Dark building body
    const mat = new THREE.MeshStandardMaterial({
      color: 0x080c18,
      roughness: 0.8,
      metalness: 0.2,
      emissive: 0x010208,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;

    const xOff = side * (ROAD_WIDTH * 0.5 + 4 + Math.random() * 18);
    const zOff = -i * 18 - Math.random() * 8;
    mesh.position.set(xOff, h * 0.5, zOff);
    group.add(mesh);

    // Neon window strips
    const winColor = buildingColors[Math.floor(Math.random() * buildingColors.length)];
    const winMat = new THREE.MeshBasicMaterial({ color: winColor, transparent: true, opacity: 0.7 });
    const winGeo = new THREE.PlaneGeometry(w * 0.8, 0.15);
    const winCount = Math.floor(h / 2.5);
    for (let j = 0; j < winCount; j++) {
      if (Math.random() > 0.4) {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(xOff, j * 2.5 + 1, zOff + d * 0.5 + 0.01);
        group.add(win);
      }
    }

    // Rooftop light
    if (Math.random() > 0.5) {
      const light = new THREE.PointLight(winColor, 1.5, 12);
      light.position.set(xOff, h + 1, zOff);
      group.add(light);
    }
  }
  return group;
}

const cityLeft  = makeBuildingCluster(-1);
const cityRight = makeBuildingCluster(1);
scene.add(cityLeft, cityRight);

// ── PLAYER CAR ───────────────────────────────────────────────
function buildCar() {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.6, 0.55, 3.4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a14,
    roughness: 0.15,
    metalness: 0.95,
    envMapIntensity: 1.0,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.3, 0.45, 1.8);
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x050510,
    roughness: 0.05,
    metalness: 0.9,
    transparent: true,
    opacity: 0.85,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 1.0, -0.1);
  group.add(cabin);

  // Neon underglow
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.8 });
  const glowGeo = new THREE.PlaneGeometry(1.4, 3.0);
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.05;
  group.add(glow);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.3 });
  const wheelPositions = [
    [-0.85, 0.32, 1.1], [0.85, 0.32, 1.1],
    [-0.85, 0.32, -1.1], [0.85, 0.32, -1.1]
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    w.castShadow = true;
    group.add(w);
  });

  // Headlights
  const hlGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-0.5, 0.5].forEach(x => {
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(x, 0.6, 1.72);
    group.add(hl);
  });

  // Tail lights
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  [-0.5, 0.5].forEach(x => {
    const tl = new THREE.Mesh(hlGeo, tlMat);
    tl.position.set(x, 0.6, -1.72);
    group.add(tl);
  });

  return group;
}

const playerCar = buildCar();
playerCar.position.set(0, 0, 6);
scene.add(playerCar);

// ── OBSTACLE CARS ────────────────────────────────────────────
const obstaclePool = [];
const activeObstacles = [];

const obstacleMats = [
  new THREE.MeshStandardMaterial({ color: 0xff2200, roughness: 0.3, metalness: 0.7 }),
  new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.3, metalness: 0.7 }),
  new THREE.MeshStandardMaterial({ color: 0x2244ff, roughness: 0.3, metalness: 0.7 }),
  new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.3, metalness: 0.7 }),
];

function buildObstacleCar(matIndex) {
  const group = new THREE.Group();
  const mat = obstacleMats[matIndex % obstacleMats.length];

  const bodyGeo = new THREE.BoxGeometry(1.5, 0.5, 3.2);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  const cabinGeo = new THREE.BoxGeometry(1.2, 0.4, 1.6);
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.8 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 0.95, -0.1);
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  [[-0.8, 0.3, 1.0], [0.8, 0.3, 1.0], [-0.8, 0.3, -1.0], [0.8, 0.3, -1.0]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
  });

  // Tail lights glow
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
  const tlGeo = new THREE.BoxGeometry(0.28, 0.1, 0.05);
  [-0.45, 0.45].forEach(x => {
    const tl = new THREE.Mesh(tlGeo, tlMat);
    tl.position.set(x, 0.55, 1.62);
    group.add(tl);
  });

  group.visible = false;
  scene.add(group);
  return group;
}

// Pre-pool 12 obstacle cars
for (let i = 0; i < 12; i++) {
  obstaclePool.push(buildObstacleCar(i));
}

function getObstacleFromPool() {
  return obstaclePool.find(o => !o.visible) || null;
}


// ── PARTICLE SYSTEM ──────────────────────────────────────────
const MAX_PARTICLES = 800;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(MAX_PARTICLES * 3);
const particleColors    = new Float32Array(MAX_PARTICLES * 3);
const particleSizes     = new Float32Array(MAX_PARTICLES);
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particleGeo.setAttribute('color',    new THREE.BufferAttribute(particleColors, 3));
particleGeo.setAttribute('size',     new THREE.BufferAttribute(particleSizes, 1));

const particleMat = new THREE.PointsMaterial({
  size: 0.18,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const particleSystem = new THREE.Points(particleGeo, particleMat);
scene.add(particleSystem);

const particles = [];

function spawnParticles(x, y, z, count, colorHex, speed) {
  const c = new THREE.Color(colorHex);
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * speed,
      vy: Math.random() * speed * 0.8 + 0.05,
      vz: (Math.random() - 0.5) * speed,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.04,
      r: c.r, g: c.g, b: c.b,
      size: 0.1 + Math.random() * 0.25,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.z += p.vz * dt * 60;
    p.vy -= 0.003 * dt * 60; // gravity
    p.life -= p.decay * dt * 60;
    if (p.life <= 0) particles.splice(i, 1);
  }

  const count = Math.min(particles.length, MAX_PARTICLES);
  for (let i = 0; i < count; i++) {
    const p = particles[i];
    particlePositions[i * 3]     = p.x;
    particlePositions[i * 3 + 1] = p.y;
    particlePositions[i * 3 + 2] = p.z;
    particleColors[i * 3]     = p.r * p.life;
    particleColors[i * 3 + 1] = p.g * p.life;
    particleColors[i * 3 + 2] = p.b * p.life;
    particleSizes[i] = p.size * p.life;
  }
  // Clear unused slots
  for (let i = count; i < MAX_PARTICLES; i++) {
    particlePositions[i * 3 + 1] = -9999;
  }
  particleGeo.attributes.position.needsUpdate = true;
  particleGeo.attributes.color.needsUpdate    = true;
  particleGeo.attributes.size.needsUpdate     = true;
}

// ── RAIN SYSTEM ──────────────────────────────────────────────
const RAIN_COUNT = 1200;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_COUNT * 3);
for (let i = 0; i < RAIN_COUNT; i++) {
  rainPos[i * 3]     = (Math.random() - 0.5) * 60;
  rainPos[i * 3 + 1] = Math.random() * 30;
  rainPos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.PointsMaterial({
  color: 0x88ccff,
  size: 0.06,
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const rain = new THREE.Points(rainGeo, rainMat);
scene.add(rain);

function updateRain(dt, speed) {
  const pos = rainGeo.attributes.position.array;
  const fallSpeed = (0.4 + speed * 0.6) * dt * 60;
  for (let i = 0; i < RAIN_COUNT; i++) {
    pos[i * 3 + 1] -= fallSpeed;
    pos[i * 3 + 2] += fallSpeed * 0.15;
    if (pos[i * 3 + 1] < -2) {
      pos[i * 3 + 1] = 28 + Math.random() * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
    }
  }
  rainGeo.attributes.position.needsUpdate = true;
}

// ── SPEED LINES ──────────────────────────────────────────────
const SPEED_LINE_COUNT = 60;
const speedLineGeo = new THREE.BufferGeometry();
const slPos = new Float32Array(SPEED_LINE_COUNT * 6); // 2 points per line
for (let i = 0; i < SPEED_LINE_COUNT; i++) {
  const x = (Math.random() - 0.5) * 30;
  const y = Math.random() * 8;
  const z = -Math.random() * 60 - 5;
  slPos[i * 6]     = x; slPos[i * 6 + 1] = y; slPos[i * 6 + 2] = z;
  slPos[i * 6 + 3] = x; slPos[i * 6 + 4] = y; slPos[i * 6 + 5] = z + 2;
}
speedLineGeo.setAttribute('position', new THREE.BufferAttribute(slPos, 3));
const speedLineMat = new THREE.LineBasicMaterial({
  color: 0x00f5ff,
  transparent: true,
  opacity: 0.0,
  blending: THREE.AdditiveBlending,
});
const speedLines = new THREE.LineSegments(speedLineGeo, speedLineMat);
scene.add(speedLines);

function updateSpeedLines(speed) {
  const t = Math.max(0, (speed - 0.5) / (CAR_SPEED_MAX - 0.5));
  speedLineMat.opacity = t * 0.6;
  const pos = speedLineGeo.attributes.position.array;
  for (let i = 0; i < SPEED_LINE_COUNT; i++) {
    pos[i * 6 + 2] += speed * 1.2;
    pos[i * 6 + 5] += speed * 1.2;
    if (pos[i * 6 + 2] > 12) {
      const x = (Math.random() - 0.5) * 30;
      const y = Math.random() * 8;
      const z = -60 - Math.random() * 20;
      pos[i * 6]     = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x; pos[i * 6 + 4] = y; pos[i * 6 + 5] = z + 2;
    }
  }
  speedLineGeo.attributes.position.needsUpdate = true;
}


// ── LANE HELPERS ─────────────────────────────────────────────
function laneToX(lane) {
  return -ROAD_WIDTH * 0.5 + lane * LANE_WIDTH + LANE_WIDTH * 0.5;
}

// ── SPAWN OBSTACLE ───────────────────────────────────────────
function spawnObstacle() {
  const car = getObstacleFromPool();
  if (!car) return;

  const lane = Math.floor(Math.random() * LANES);
  car.position.set(laneToX(lane), 0, -80);
  car.userData.lane = lane;
  car.userData.speed = state.speed * (0.3 + Math.random() * 0.3);
  car.userData.passed = false;
  car.visible = true;
  activeObstacles.push(car);
}

// ── CRASH EFFECT ─────────────────────────────────────────────
function triggerCrash(x, y, z) {
  // Big explosion burst
  spawnParticles(x, y + 0.5, z, 120, 0xff4400, 0.35);
  spawnParticles(x, y + 0.5, z, 80,  0xffaa00, 0.28);
  spawnParticles(x, y + 0.5, z, 60,  0xffffff, 0.22);
  spawnParticles(x, y + 0.5, z, 40,  0xff0080, 0.18);

  // Camera shake
  state.shakeIntensity = 1.0;

  // Slow motion
  state.slowMo = true;
  state.slowMoTimer = 2.5;

  // Bloom spike
  bloomPass.strength = 3.5;

  // Chromatic aberration spike
  vignettePass.uniforms.uChrAb.value = 8.0;
}

// ── NEAR MISS ────────────────────────────────────────────────
function triggerNearMiss() {
  state.nearMissStreak++;
  state.multiplier = Math.min(8, 1 + state.nearMissStreak);
  const bonus = 50 * state.multiplier;
  state.score += bonus;

  showCombo(`NEAR MISS  ×${state.multiplier}`);
  showScorePopup(`+${bonus}`, playerCar.position.x, playerCar.position.y + 2);
  spawnParticles(playerCar.position.x, 1, playerCar.position.z, 20, 0x00ff88, 0.15);
}

// ── SCORE POPUP ──────────────────────────────────────────────
function showScorePopup(text, wx, wy) {
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = text;
  // Project 3D to 2D
  const v = new THREE.Vector3(wx, wy, playerCar.position.z);
  v.project(camera);
  const x = (v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  scorePopups.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// ── COMBO DISPLAY ────────────────────────────────────────────
let comboTimeout = null;
function showCombo(text) {
  elCombo.textContent = text;
  elCombo.classList.remove('hidden');
  // Re-trigger animation
  elCombo.style.animation = 'none';
  elCombo.offsetHeight; // reflow
  elCombo.style.animation = '';
  clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => elCombo.classList.add('hidden'), 1300);
}

// ── HUD UPDATE ───────────────────────────────────────────────
function updateHUD() {
  const kmh = Math.round(state.speed * 320);
  elSpeed.textContent = String(kmh).padStart(3, '0');
  elSpeedBar.style.width = (state.speed / CAR_SPEED_MAX * 100) + '%';
  elSpeed.classList.toggle('danger', state.speed > CAR_SPEED_MAX * 0.85);

  elScore.textContent = String(Math.floor(state.score)).padStart(6, '0');
  elMultiplier.textContent = `×${state.multiplier}`;

  const nitroW = Math.max(0, state.nitro * 100);
  elNitroBar.style.width = nitroW + '%';
  elNitroBar.classList.toggle('empty', state.nitro < 0.05);

  elDistance.textContent = (state.distance / 1000).toFixed(2) + ' KM';

  if (kmh > state.topSpeed) state.topSpeed = kmh;
}

// ── GAME OVER ────────────────────────────────────────────────
function doGameOver() {
  state.phase = 'gameover';

  if (state.score > state.hiScore) {
    state.hiScore = Math.floor(state.score);
    localStorage.setItem('lr_hi', state.hiScore);
  }

  elGoScore.textContent    = String(Math.floor(state.score)).padStart(6, '0');
  elGoDistance.textContent = (state.distance / 1000).toFixed(2) + ' KM';
  elGoSpeed.textContent    = state.topSpeed + ' KM/H';
  elGoHiScore.textContent  = String(state.hiScore).padStart(6, '0');

  hud.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');
}

// ── START GAME ───────────────────────────────────────────────
function startGame() {
  // Reset state
  state.phase          = 'playing';
  state.score          = 0;
  state.distance       = 0;
  state.speed          = CAR_SPEED_BASE;
  state.nitro          = 1.0;
  state.nitroActive    = false;
  state.multiplier     = 1;
  state.nearMissStreak = 0;
  state.topSpeed       = 0;
  state.carLane        = 1;
  state.carTargetX     = laneToX(1);
  state.carCurrentX    = laneToX(1);
  state.lastObstacleTime = 0;
  state.obstacleInterval = OBSTACLE_INTERVAL_START;
  state.shakeIntensity   = 0;
  state.slowMo           = false;
  state.slowMoTimer      = 0;

  // Clear obstacles
  activeObstacles.forEach(o => { o.visible = false; });
  activeObstacles.length = 0;
  particles.length = 0;

  // Reset car
  playerCar.position.set(laneToX(1), 0, 6);
  playerCar.rotation.set(0, 0, 0);

  // Reset post processing
  bloomPass.strength = 1.4;
  vignettePass.uniforms.uChrAb.value = 0;

  // Show HUD
  hud.classList.remove('hidden');
  pauseMenu.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
}

// ── PAUSE / RESUME ───────────────────────────────────────────
function pauseGame() {
  if (state.phase !== 'playing') return;
  state.phase = 'paused';
  pauseMenu.classList.remove('hidden');
}
function resumeGame() {
  if (state.phase !== 'paused') return;
  state.phase = 'playing';
  pauseMenu.classList.add('hidden');
}
function goToMainMenu() {
  state.phase = 'intro';
  hud.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  introScreen.classList.remove('fade-out');
  introScreen.style.display = 'flex';
  elIntroHi.textContent = String(state.hiScore).padStart(6, '0');
  // Clear obstacles
  activeObstacles.forEach(o => { o.visible = false; });
  activeObstacles.length = 0;
}


// ── INPUT ────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  state.keys[e.code] = true;
  if (state.phase !== 'playing') return;

  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    if (state.carLane > 0) {
      state.carLane--;
      state.carTargetX = laneToX(state.carLane);
    }
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    if (state.carLane < LANES - 1) {
      state.carLane++;
      state.carTargetX = laneToX(state.carLane);
    }
  }
  if (e.code === 'Escape') {
    state.phase === 'playing' ? pauseGame() : resumeGame();
  }
});
document.addEventListener('keyup', e => { state.keys[e.code] = false; });

// Touch / swipe support
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => {
  if (state.phase !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) {
    if (dx < 0 && state.carLane > 0)            { state.carLane--; state.carTargetX = laneToX(state.carLane); }
    if (dx > 0 && state.carLane < LANES - 1)    { state.carLane++; state.carTargetX = laneToX(state.carLane); }
  }
}, { passive: true });

// ── BUTTON WIRING ────────────────────────────────────────────
document.getElementById('btn-play').addEventListener('click', () => {
  introScreen.classList.add('fade-out');
  setTimeout(() => {
    introScreen.style.display = 'none';
    startGame();
  }, 800);
});
document.getElementById('btn-play-again').addEventListener('click', () => {
  gameOverScreen.classList.add('hidden');
  startGame();
});
document.getElementById('btn-resume').addEventListener('click', resumeGame);
document.getElementById('btn-restart-pause').addEventListener('click', () => {
  pauseMenu.classList.add('hidden');
  startGame();
});
document.getElementById('btn-main-menu-pause').addEventListener('click', goToMainMenu);
document.getElementById('btn-main-menu-go').addEventListener('click', goToMainMenu);
document.getElementById('hud-pause-btn').addEventListener('click', pauseGame);

// ── RESIZE ───────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ── ROAD SCROLL ──────────────────────────────────────────────
let roadOffset = 0;

function scrollRoad(speed) {
  roadOffset += speed;
  roadSegments.forEach((seg, i) => {
    seg.position.z = -i * ROAD_SEGMENT_LENGTH + (roadOffset % ROAD_SEGMENT_LENGTH) + ROAD_SEGMENT_LENGTH * 0.5;
  });
  // Scroll lane dividers
  dividers.forEach((d, i) => {
    d.position.z = -(Math.floor(i / (LANES - 1)) * 5) + (roadOffset % 5) + 2;
    if (d.position.z > 14) d.position.z -= 30 * Math.ceil(ROAD_SEGMENTS / 2);
  });
}

// ── CITY SCROLL ──────────────────────────────────────────────
function scrollCity(speed) {
  [cityLeft, cityRight].forEach(city => {
    city.children.forEach(child => {
      child.position.z += speed;
      if (child.position.z > 30) child.position.z -= 220;
    });
  });
}

// ── COLLISION DETECTION ──────────────────────────────────────
const playerBox = new THREE.Box3();
const obstBox   = new THREE.Box3();

function checkCollisions() {
  playerBox.setFromObject(playerCar);
  // Shrink hitbox slightly for fairness
  playerBox.min.x += 0.3;
  playerBox.max.x -= 0.3;
  playerBox.min.z += 0.4;
  playerBox.max.z -= 0.4;

  for (let i = activeObstacles.length - 1; i >= 0; i--) {
    const obs = activeObstacles[i];
    obstBox.setFromObject(obs);

    if (playerBox.intersectsBox(obstBox)) {
      triggerCrash(playerCar.position.x, playerCar.position.y, playerCar.position.z);
      setTimeout(doGameOver, 2200);
      state.phase = 'crashing';
      return;
    }

    // Near miss detection — same lane, just passed
    if (!obs.userData.passed && obs.position.z > playerCar.position.z + 2.5) {
      obs.userData.passed = true;
      const dist = Math.abs(obs.position.x - playerCar.position.x);
      if (dist < LANE_WIDTH * 1.2) {
        triggerNearMiss();
      } else {
        // Normal pass — score
        state.score += 10 * state.multiplier;
        state.nearMissStreak = 0;
        state.multiplier = 1;
      }
    }

    // Remove off-screen
    if (obs.position.z > 20) {
      obs.visible = false;
      activeObstacles.splice(i, 1);
    }
  }
}

// ── MAIN LOOP ────────────────────────────────────────────────
const clock = new THREE.Clock();
let lastTime = 0;

function animate(timestamp) {
  requestAnimationFrame(animate);

  const rawDt = clock.getDelta();
  const dt = state.slowMo ? rawDt * 0.25 : rawDt;

  vignettePass.uniforms.uTime.value = timestamp * 0.001;

  if (state.phase === 'playing' || state.phase === 'crashing') {
    // ── Speed ──
    if (state.phase === 'playing') {
      state.nitroActive = state.keys['Space'] && state.nitro > 0.01;
      if (state.nitroActive) {
        state.speed = Math.min(CAR_SPEED_MAX, state.speed + NITRO_BOOST * dt);
        state.nitro = Math.max(0, state.nitro - NITRO_DRAIN * dt * 60);
      } else {
        state.speed = Math.min(CAR_SPEED_MAX, state.speed + SPEED_INCREMENT * dt * 60);
        state.nitro = Math.min(1.0, state.nitro + NITRO_REGEN * dt * 60);
      }
      state.distance += state.speed * dt * 60 * 0.5;
    }

    const effectiveSpeed = state.phase === 'crashing' ? state.speed * 0.1 : state.speed;

    // ── Road & city scroll ──
    scrollRoad(effectiveSpeed * dt * 60 * 0.5);
    scrollCity(effectiveSpeed * dt * 60 * 0.5);

    // ── Car lateral movement ──
    state.carCurrentX += (state.carTargetX - state.carCurrentX) * Math.min(1, 12 * dt);
    playerCar.position.x = state.carCurrentX;

    // Tilt on lane change
    const tiltTarget = (state.carTargetX - state.carCurrentX) * 0.18;
    playerCar.rotation.z += (tiltTarget - playerCar.rotation.z) * 8 * dt;

    // ── Neon lights follow car ──
    neonLeft.position.z  = playerCar.position.z - 5;
    neonRight.position.z = playerCar.position.z - 5;
    headLight.position.set(playerCar.position.x, 2.5, playerCar.position.z + 2);
    headLight.target.position.set(playerCar.position.x, 0, playerCar.position.z - 20);
    headLight.target.updateMatrixWorld();

    // ── Obstacle spawning ──
    if (state.phase === 'playing') {
      if (timestamp - state.lastObstacleTime > state.obstacleInterval) {
        spawnObstacle();
        state.lastObstacleTime = timestamp;
        state.obstacleInterval = Math.max(
          OBSTACLE_INTERVAL_MIN,
          state.obstacleInterval - 18
        );
      }

      // Move obstacles
      activeObstacles.forEach(obs => {
        obs.position.z += (effectiveSpeed - obs.userData.speed) * dt * 60 * 0.5;
      });

      checkCollisions();
    }

    // ── Particles ──
    updateParticles(dt);

    // ── Rain ──
    updateRain(dt, effectiveSpeed);

    // ── Speed lines ──
    updateSpeedLines(effectiveSpeed);

    // ── Camera shake ──
    if (state.shakeIntensity > 0) {
      const s = state.shakeIntensity;
      camera.position.x = Math.sin(timestamp * 0.05) * s * 0.4;
      camera.position.y = 4.5 + Math.cos(timestamp * 0.07) * s * 0.3;
      state.shakeIntensity = Math.max(0, state.shakeIntensity - 1.8 * dt * 60);
    } else {
      camera.position.x += (-playerCar.position.x * 0.08 - camera.position.x) * 4 * dt;
      camera.position.y += (4.5 - camera.position.y) * 3 * dt;
    }
    camera.lookAt(playerCar.position.x * 0.3, 1.5, playerCar.position.z - 12);

    // ── Slow-mo timer ──
    if (state.slowMo) {
      state.slowMoTimer -= rawDt;
      if (state.slowMoTimer <= 0) state.slowMo = false;
    }

    // ── Post FX recovery ──
    bloomPass.strength += (1.4 - bloomPass.strength) * 2 * rawDt;
    vignettePass.uniforms.uChrAb.value += (0 - vignettePass.uniforms.uChrAb.value) * 3 * rawDt;

    // ── Nitro bloom ──
    if (state.nitroActive) {
      bloomPass.strength = Math.min(2.2, bloomPass.strength + 0.05);
      vignettePass.uniforms.uChrAb.value = 1.5;
    }

    // ── Score increment ──
    if (state.phase === 'playing') {
      state.score += state.speed * dt * 60 * 0.8 * state.multiplier;
    }

    // ── HUD ──
    updateHUD();
  }

  // ── Render ──
  composer.render();
}

// ── INIT ─────────────────────────────────────────────────────
elIntroHi.textContent = String(state.hiScore).padStart(6, '0');
state.carTargetX  = laneToX(1);
state.carCurrentX = laneToX(1);
playerCar.position.x = laneToX(1);

animate(0);

