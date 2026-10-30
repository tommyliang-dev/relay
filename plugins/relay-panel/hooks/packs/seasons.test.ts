import { expect, test } from 'claude-code/testing'
import { OFF_SEASON, SEASONS, nextChangeAt, nextSeasonAt, seasonalPackAt } from './seasons'

const all = () => true
const noChristmas = (id: string) => id !== 'christmas'
// Local time, as the seasons are.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min)
const same = (a: Date, b: Date) => expect(a.getTime()).toBe(b.getTime())

test('seasons: the table and the off-season pack', () => {
  expect(OFF_SEASON).toBe('crabs')
  expect(SEASONS.map(s => s.id)).toEqual(['turkeys', 'christmas'])
})

test('seasonalPackAt: each boundary day', () => {
  expect(seasonalPackAt(at(2026, 11, 14, 23, 59), all)).toBe('crabs')
  expect(seasonalPackAt(at(2026, 11, 15), all)).toBe('turkeys')
  expect(seasonalPackAt(at(2026, 11, 30, 23, 59), all)).toBe('turkeys')
  expect(seasonalPackAt(at(2026, 12, 1), all)).toBe('christmas')
  expect(seasonalPackAt(at(2026, 12, 1), noChristmas)).toBe('crabs')
  expect(seasonalPackAt(at(2026, 12, 31, 23, 59), all)).toBe('christmas')
  expect(seasonalPackAt(at(2027, 1, 1), all)).toBe('crabs')
  expect(seasonalPackAt(at(2026, 6, 1), all)).toBe('crabs')
})

test('seasonalPackAt: a season whose pack is not registered falls back to the off-season pack', () => {
  expect(seasonalPackAt(at(2026, 11, 20), () => false)).toBe('crabs')
})

test('nextChangeAt: the next season start or the day after a season end, at local midnight', () => {
  same(nextChangeAt(at(2026, 11, 14, 12)), at(2026, 11, 15))
  same(nextChangeAt(at(2026, 11, 15)), at(2026, 12, 1))
  same(nextChangeAt(at(2026, 11, 30, 23, 59)), at(2026, 12, 1))
  same(nextChangeAt(at(2026, 12, 31, 23, 59)), at(2027, 1, 1))
  same(nextChangeAt(at(2027, 1, 1)), at(2027, 11, 15))
  same(nextChangeAt(at(2026, 6, 1)), at(2026, 11, 15))
})

test('nextChangeAt and seasonalPackAt: leap-year February is safe', () => {
  expect(seasonalPackAt(at(2028, 2, 29), all)).toBe('crabs')
  same(nextChangeAt(at(2028, 2, 28)), at(2028, 11, 15))
  same(nextChangeAt(at(2028, 2, 29, 12)), at(2028, 11, 15))
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
