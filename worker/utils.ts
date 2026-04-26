// worker/utils.ts
// Shared utilities for the auto-apply worker

export function randomDelay(minMs = 2000, maxMs = 6000): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs)
  return new Promise(r => setTimeout(r, ms))
}

export function humanDelay(): Promise<void> {
  // 30–90 seconds between applies to simulate human behavior
  return randomDelay(30000, 90000)
}

export function log(level: 'info' | 'warn' | 'error', msg: string, data?: unknown) {
  const ts = new Date().toISOString()
  const prefix = { info: '✅', warn: '⚠️', error: '❌' }[level]
  console.log(`${ts} ${prefix} [worker] ${msg}`, data ? JSON.stringify(data, null, 2) : '')
}

// Detect if a job requires multiple steps (more complex flow)
export function isSimpleApply(pageContent: string): boolean {
  const multiStepSignals = ['step 1 of', 'step 2', 'additional questions', 'screening questions']
  return !multiStepSignals.some(s => pageContent.toLowerCase().includes(s))
}

// Generate a human-like mouse movement path
export function randomMousePath(startX: number, startY: number, endX: number, endY: number) {
  const steps = Math.floor(Math.random() * 5) + 3
  const points = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const jitterX = (Math.random() - 0.5) * 20
    const jitterY = (Math.random() - 0.5) * 20
    points.push({
      x: Math.round(startX + (endX - startX) * t + jitterX),
      y: Math.round(startY + (endY - startY) * t + jitterY),
    })
  }
  return points
}

export function getDailyApplyCount(appliedAtList: string[]): number {
  const today = new Date().toISOString().split('T')[0]
  return appliedAtList.filter(d => d.startsWith(today)).length
}
