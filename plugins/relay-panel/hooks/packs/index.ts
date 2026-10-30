// Pack registry. Adding a pack = one file in this folder + one entry in PACKS + its tests.

import { cats } from './cats'
import { crabs } from './crabs'
import type { Pack } from './types'

export const PACKS: readonly Pack[] = [cats, crabs]

export const DEFAULT_PACK = 'cats'

export const packIds = (): string[] => PACKS.map(p => p.id)

export const packById = (id: string): Pack | undefined => PACKS.find(p => p.id === id)

// Any stored or user-supplied value: unknown ids fall back to the default pack.
export const resolvePack = (id: unknown): Pack =>
  (typeof id === 'string' ? packById(id) : undefined) ?? (packById(DEFAULT_PACK) as Pack)

// Every pack's <style> block, for a page that shows several packs at once.
export const allPackCss = (): string => PACKS.map(p => p.css).join('\n')
