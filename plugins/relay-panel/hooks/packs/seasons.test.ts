import { expect, test } from 'claude-code/testing'
import {
  OFF_SEASON,
  SEASONS,
  SHUFFLE,
  isHoliday,
  nextSeasonAt,
  pickShuffle,
  resolvePack,
  seasonAt,
  seasonEndAt,
  seasonKey,
  seasonalPackAt,
  shuffleCandidates,
} from './seasons'
import type { PackState } from './seasons'

const all = () => true
const noChristmas = (id: string) => id !== 'christmas'
// Local time, as the seasons are.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min)
const same = (a: Date, b: Date) => expect(a.getTime()).toBe(b.getTime())

test('seasons: the table and the off-season pack', () => {
  expect(OFF_SEASON).toBe('clawd')
  expect(SEASONS.map(s => s.id)).toEqual(['turkeys', 'christmas'])
})

test('seasonalPackAt: each boundary day', () => {
  expect(seasonalPackAt(at(2026, 11, 14, 23, 59), all)).toBe('clawd')
  expect(seasonalPackAt(at(2026, 11, 15), all)).toBe('turkeys')
  expect(seasonalPackAt(at(2026, 11, 30, 23, 59), all)).toBe('turkeys')
  expect(seasonalPackAt(at(2026, 12, 1), all)).toBe('christmas')
  expect(seasonalPackAt(at(2026, 12, 1), noChristmas)).toBe('clawd')
  expect(seasonalPackAt(at(2026, 12, 31, 23, 59), all)).toBe('christmas')
  expect(seasonalPackAt(at(2027, 1, 1), all)).toBe('clawd')
  expect(seasonalPackAt(at(2026, 6, 1), all)).toBe('clawd')
})

test('seasonalPackAt: a season whose pack is not registered falls back to the off-season pack', () => {
  expect(seasonalPackAt(at(2026, 11, 20), () => false)).toBe('clawd')
})

test('seasonalPackAt: leap-year February is safe', () => {
  expect(seasonalPackAt(at(2028, 2, 29), all)).toBe('clawd')
})

test('nextSeasonAt: the next registered season after now', () => {
  const n = nextSeasonAt(at(2026, 6, 1), all)
  expect(n?.id).toBe('turkeys')
  same(n?.from ?? new Date(0), at(2026, 11, 15))
  expect(nextSeasonAt(at(2026, 11, 20), all)?.id).toBe('christmas')
  const wrap = nextSeasonAt(at(2026, 11, 20), noChristmas)
  expect(wrap?.id).toBe('turkeys')
  same(wrap?.from ?? new Date(0), at(2027, 11, 15))
  expect(nextSeasonAt(at(2026, 6, 1), () => false)).toBeUndefined()
})

// --- resolvePack: the everyday pack, the seasons, skips and shuffles.

const REG = ['cats', 'clawd', 'dogs', 'turkeys', 'christmas'] as const
const JUNE = at(2026, 6, 1, 12)
const TURKEY_DAY = at(2026, 11, 20, 12)
const DEC = at(2026, 12, 10, 12)
const st = (o: Partial<PackState> = {}): PackState => ({
  now: JUNE,
  everyday: 'cats',
  shuffleList: [],
  seasons: true,
  registered: REG,
  random: () => 0,
  ...o,
})

test('holiday packs are the seasons\' packs', () => {
  expect(isHoliday('turkeys')).toBe(true)
  expect(isHoliday('christmas')).toBe(true)
  expect(isHoliday('cats')).toBe(false)
  expect(SHUFFLE).toBe('shuffle')
})

test('resolvePack rule 1: seasons on and a registered season holds: the season\'s pack', () => {
  expect(resolvePack(st({ now: TURKEY_DAY }))).toMatchObject({ id: 'turkeys', isSeasonal: true, isSkipped: false })
  expect(resolvePack(st({ now: DEC })).id).toBe('christmas')
  expect(resolvePack(st({ now: DEC, everyday: SHUFFLE })).id).toBe('christmas')
})

test('resolvePack rule 2: out of season, seasons off, or the season\'s pack missing: the everyday pack', () => {
  expect(resolvePack(st()).id).toBe('cats')
  expect(resolvePack(st({ now: DEC, seasons: false }))).toMatchObject({ id: 'cats', isSeasonal: false, season: { id: 'christmas' } })
  const noXmas = REG.filter(id => id !== 'christmas')
  expect(resolvePack(st({ now: DEC, registered: noXmas }))).toMatchObject({ id: 'cats', season: undefined })
  // A holiday pack is a valid fixed everyday pick.
  expect(resolvePack(st({ everyday: 'turkeys' })).id).toBe('turkeys')
})

test('resolvePack: an unregistered everyday pack falls back to OFF_SEASON, then the fallback', () => {
  expect(resolvePack(st({ everyday: 'dodos' })).id).toBe(OFF_SEASON)
  expect(resolvePack(st({ everyday: 'dodos', registered: ['cats'], fallback: 'cats' })).id).toBe('cats')
  expect(resolvePack(st({ everyday: 'dodos', registered: ['cats'] })).id).toBe(OFF_SEASON)
})

test('seasonKey: one key per season per year, by the year the season starts', () => {
  const xmas = SEASONS.find(s => s.id === 'christmas')
  const turkeys = SEASONS.find(s => s.id === 'turkeys')
  if (!xmas || !turkeys) throw new Error('missing season')
  expect(seasonKey(xmas, DEC)).toBe('christmas:2026')
  expect(seasonKey(xmas, at(2027, 12, 31, 23))).toBe('christmas:2027')
  expect(seasonKey(turkeys, TURKEY_DAY)).toBe('turkeys:2026')
  same(seasonEndAt(xmas, DEC), at(2026, 12, 31))
  same(seasonEndAt(turkeys, TURKEY_DAY), at(2026, 11, 30))
  expect(seasonAt(DEC)?.id).toBe('christmas')
})

test('resolvePack: a skipped season draws the everyday pack; the skip holds for that year only', () => {
  expect(resolvePack(st({ now: DEC, skipSeason: 'christmas:2026' }))).toMatchObject({ id: 'cats', isSkipped: true, isSeasonal: false })
  // Next year's Christmas is not skipped by this year's key.
  expect(resolvePack(st({ now: at(2027, 12, 10), skipSeason: 'christmas:2026' }))).toMatchObject({ id: 'christmas', isSkipped: false })
  // Skipping turkeys does not skip Christmas.
  expect(resolvePack(st({ now: DEC, skipSeason: 'turkeys:2026' })).id).toBe('christmas')
})

test('resolvePack: a stale skip (its season over) is ignored', () => {
  expect(resolvePack(st({ skipSeason: 'christmas:2025' }))).toMatchObject({ id: 'cats', isSkipped: false })
  expect(resolvePack(st({ now: TURKEY_DAY, skipSeason: 'turkeys:2025' })).id).toBe('turkeys')
})

test('shuffleCandidates: the list, registered, never a holiday pack; empty means every everyday pack', () => {
  expect(shuffleCandidates([], REG)).toEqual(['cats', 'clawd', 'dogs'])
  expect(shuffleCandidates(['dogs', 'cats'], REG)).toEqual(['cats', 'dogs'])
  expect(shuffleCandidates(['turkeys', 'dogs'], REG)).toEqual(['dogs'])
  expect(shuffleCandidates(['dodos'], REG)).toEqual([])
  expect(shuffleCandidates([], ['cats', 'christmas'])).toEqual(['cats'])
})

test('pickShuffle: no back-to-back repeat, a single candidate may repeat, none draws OFF_SEASON', () => {
  const pick = (o: { shuffleList?: string[]; lastShuffle?: string; random?: () => number; registered?: readonly string[] }) =>
    pickShuffle({ shuffleList: o.shuffleList ?? [], registered: o.registered ?? REG, lastShuffle: o.lastShuffle, random: o.random ?? (() => 0) })
  expect(pick({})).toBe('cats')
  expect(pick({ lastShuffle: 'cats' })).toBe('clawd')
  expect(pick({ lastShuffle: 'cats', random: () => 0.99 })).toBe('dogs')
  expect(pick({ random: () => 0.5 })).toBe('clawd')
  // Never a holiday pack, whatever the random draw.
  for (const r of [0, 0.2, 0.4, 0.6, 0.8, 0.999]) expect(isHoliday(pick({ random: () => r }))).toBe(false)
  expect(pick({ shuffleList: ['dogs'], lastShuffle: 'dogs' })).toBe('dogs')
  expect(pick({ shuffleList: ['cats', 'dogs'], lastShuffle: 'cats' })).toBe('dogs')
  expect(pick({ shuffleList: ['turkeys'] })).toBe(OFF_SEASON)
  expect(pick({ registered: ['turkeys', 'christmas'] })).toBe(OFF_SEASON)
})

test('resolvePack: shuffle draws the session\'s pick, or makes one with random', () => {
  expect(resolvePack(st({ everyday: SHUFFLE, shuffled: 'dogs' }))).toMatchObject({ id: 'dogs', shuffled: 'dogs' })
  expect(resolvePack(st({ everyday: SHUFFLE, lastShuffle: 'cats' }))).toMatchObject({ id: 'clawd', shuffled: 'clawd' })
  expect(resolvePack(st({ everyday: SHUFFLE, shuffleList: ['dogs'] })).id).toBe('dogs')
  // In a skipped season the shuffle pick shows.
  expect(resolvePack(st({ now: DEC, everyday: SHUFFLE, shuffled: 'dogs', skipSeason: 'christmas:2026' })).id).toBe('dogs')
})
