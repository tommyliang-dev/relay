// Pack registry. Adding a pack = one file in this folder + one entry in PACKS + its tests.

import { cats } from './cats'
import { clawd } from './clawd'
import { dogs } from './dogs'
import { turkeys } from './turkeys'
import { christmas } from './christmas'
import { winter } from './winter'
import { adventurers } from './adventurers'
import type { Pack } from './types'

// Registry order is display order: the Characters group, then the Seasonal group, each alphabetical by id.
export const PACKS: readonly Pack[] = [adventurers, cats, clawd, dogs, christmas, turkeys, winter]

// The packs the list and the gallery group under "Seasonal"; every other pack is under "Characters". For display only: winter is not
// a holiday (packs/seasons.ts), so it stays a shuffle candidate and a valid everyday pack.
export const SEASONAL_IDS: readonly string[] = ['christmas', 'turkeys', 'winter']

export const isSeasonalPack = (id: string): boolean => SEASONAL_IDS.includes(id)

const byId = (a: Pack, b: Pack): number => a.id.localeCompare(b.id)

// Registered packs in the Characters group / the Seasonal group, each alphabetical by id (whatever the registry order).
export const characterPacks = (): Pack[] => PACKS.filter(p => !isSeasonalPack(p.id)).sort(byId)
export const seasonalPacks = (): Pack[] => PACKS.filter(p => isSeasonalPack(p.id)).sort(byId)

// The off-season pack (packs/seasons.ts OFF_SEASON) and the fallback for any unknown id.
export const DEFAULT_PACK = 'clawd'

export const packIds = (): string[] => PACKS.map(p => p.id)

export const packById = (id: string): Pack | undefined => PACKS.find(p => p.id === id)

// Any stored or user-supplied value: unknown ids fall back to the default pack.
export const resolvePack = (id: unknown): Pack =>
  (typeof id === 'string' ? packById(id) : undefined) ?? (packById(DEFAULT_PACK) as Pack)

// Every pack's <style> block, for a page that shows several packs at once.
export const allPackCss = (): string => PACKS.map(p => p.css).join('\n')
