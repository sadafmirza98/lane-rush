import { CAR_SPEED_BASE, OBSTACLE_INTERVAL_START } from './constants.js';

export function createInitialState() {
  return {
    phase: 'intro',       // intro | playing | paused | crashing | gameover
    score: 0,
    hiScore: parseInt(localStorage.getItem('lr_hi') || '0'),
    distance: 0,
    speed: CAR_SPEED_BASE,
    nitro: 1.0,
    nitroActive: false,
    multiplier: 1,
    nearMissStreak: 0,
    topSpeed: 0,
    carLane: 1,
    carTargetX: 0,
    carCurrentX: 0,
    keys: {},
    lastObstacleTime: 0,
    obstacleInterval: OBSTACLE_INTERVAL_START,
    shakeIntensity: 0,
    slowMo: false,
    slowMoTimer: 0,
  };
}
