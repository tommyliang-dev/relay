// The sprite-pack contract. Each pack is one module in this folder exporting a `Pack`;
// the panel draws only through the registry in ./index.ts.

export type Role = 'orchestrator' | 'planner' | 'architect' | 'developer' | 'designer' | 'explore' | 'other'
export type Tier = 'fable' | 'heavy' | 'careful' | 'medium' | 'light' | 'other'

export const ROLES: readonly Role[] = ['orchestrator', 'planner', 'architect', 'developer', 'designer', 'explore', 'other']
export const TIERS: readonly Tier[] = ['fable', 'heavy', 'careful', 'medium', 'light', 'other']

export type DrawOptions = {
  variant: string // from pack.variantOf(taskKey)
  accent: string // tier colour
  dim?: boolean // planned task
  isWalking?: boolean // running: CSS animation on
  scale?: number // default 1
  mirror?: boolean // RTL
}

export type Pack = {
  id: string // 'cats'
  name: string // 'British Shorthair cats' (sentence case)
  w: number // drawing grid in px at scale 1
  h: number
  css: string // one <style> block; selectors scoped under .p-<id>
  roles: readonly Role[] // costumes it draws; others fall back to 'other'
  variants: readonly string[] // coats / breeds / colours
  variantOf: (taskKey: string) => string // stable hash pick
  draw: (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions) => string // SVG <g>
}
