import { create } from 'zustand'

// Game phases: 'menu' | 'playing' | 'crashed' | 'paused'
export const useGameStore = create((set, get) => ({
  phase: 'menu',
  score: 0,
  highScore: parseInt(localStorage.getItem('lr_hs') || '0'),
  speed: 0,
  combo: 0,
  isMobile: window.innerWidth < 768,

  startGame: () => set({ phase: 'playing', score: 0, speed: 60, combo: 0 }),
  pauseGame: () => set({ phase: 'paused' }),
  resumeGame: () => set({ phase: 'playing' }),

  crash: () => {
    const { score, highScore } = get()
    const newHigh = Math.max(score, highScore)
    localStorage.setItem('lr_hs', newHigh)
    set({ phase: 'crashed', highScore: newHigh })
  },

  addScore: (pts) => set(s => ({ score: s.score + pts })),
  setSpeed: (v) => set({ speed: v }),
  setCombo: (v) => set({ combo: v }),
  toMenu: () => set({ phase: 'menu', score: 0, speed: 0, combo: 0 }),
}))
