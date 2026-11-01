// Pack registry. Adding a pack = one file in this folder + one entry in PACKS + its tests.

import { cats } from './cats'
import { clawd } from './clawd'
import { dogs } from './dogs'
import { turkeys } from './turkeys'
import { christmas } from './christmas'
import { winter } from './winter'
import { adventurers } from './adventurers'
import type { Pack } from './types'

// Registry order is display order: the everyday packs, then the seasonal ones.
export const PACKS: readonly Pack[] = [clawd, cats, dogs, adventurers, winter, turkeys, christmas]

// The packs the list and the gallery group under "Seasonal". For display only: winter is not
// a holiday (packs/seasons.ts), so it stays a shuffle candidate and a valid everyday pack.
export const SEASONAL_IDS: readonly string[] = ['winter', 'turkeys', 'christmas']

export const isSeasonalPack = (id: string): boolean => SEASONAL_IDS.includes(id)

// Registered packs outside / inside the seasonal group, each in registry order.
export const everydayPacks = (): Pack[] => PACKS.filter(p => !isSeasonalPack(p.id))
export const seasonalPacks = (): Pack[] => PACKS.filter(p => isSeasonalPack(p.id))

// The off-season pack (packs/seasons.ts OFF_SEASON) and the fallback for any unknown id.
export const DEFAULT_PACK = 'clawd'

export const packIds = (): string[] => PACKS.map(p => p.id)

export const packById = (id: string): Pack | undefined => PACKS.find(p => p.id === id)

// Any stored or user-supplied value: unknown ids fall back to the default pack.
export const resolvePack = (id: unknown): Pack =>
  (typeof id === 'string' ? packById(id) : undefined) ?? (packById(DEFAULT_PACK) as Pack)

// Every pack's <style> block, for a page that shows several packs at once.
export const allPackCss = (): string => PACKS.map(p => p.css).join('\n')
