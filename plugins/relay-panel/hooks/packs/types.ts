// The sprite-pack contract. Each pack is one module in this folder exporting a `Pack`;
// the panel draws only through the registry in ./index.ts.

// conductor: the main session. builder, fixer, tester, scout: a relay worker's job, set by the
// orchestrator per task. scout is also the built-in Explore agent; plain is any other subagent.
export type Role = 'conductor' | 'builder' | 'fixer' | 'tester' | 'scout' | 'plain'
// `expert` is the top tier, formerly `fable`; register.tsx and clawd.ts still accept that alias.
export type Tier = 'expert' | 'heavy' | 'careful' | 'medium' | 'light' | 'other'

export const ROLES: readonly Role[] = ['conductor', 'builder', 'fixer', 'tester', 'scout', 'plain']
// The roles a planned relay task may carry; a worker with none is a builder.
export const TASK_ROLES: readonly Role[] = ['builder', 'fixer', 'tester', 'scout']
export const TIERS: readonly Tier[] = ['expert', 'heavy', 'careful', 'medium', 'light', 'other']

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
  roles: readonly Role[] // costumes it draws; others fall back to 'plain'
  variants: readonly string[] // coats / breeds / colours
  variantOf: (taskKey: string) => string // stable hash pick
  draw: (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions) => string // SVG <g>
}
