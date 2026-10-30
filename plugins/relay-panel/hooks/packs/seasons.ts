// Seasonal packs: which pack auto mode draws on a given day. Pure, no engine calls.
// Dates are [month, day], 1-based, inclusive, in local time.

export type MonthDay = readonly [month: number, day: number]
export type Season = { readonly id: string; readonly from: MonthDay; readonly to: MonthDay }

export const SEASONS: readonly Season[] = [
  { id: 'turkeys', from: [11, 15], to: [11, 30] },
  { id: 'christmas', from: [12, 1], to: [12, 31] },
]

export const OFF_SEASON = 'crabs'

const key = (m: number, d: number) => m * 100 + d

const inSeason = (s: Season, date: Date): boolean => {
  const k = key(date.getMonth() + 1, date.getDate())
  const from = key(...s.from)
  const to = key(...s.to)
  // A season that wraps the year end (Dec 20 to Jan 5) holds on either side of it.
  return from <= to ? k >= from && k <= to : k >= from || k <= to
}

// The season `date` falls in, if any.
export const seasonAt = (date: Date): Season | undefined => SEASONS.find(s => inSeason(s, date))

// The pack auto mode draws on `date`: the season's, if that pack is registered, else OFF_SEASON.
export const seasonalPackAt = (date: Date, isRegistered: (id: string) => boolean): string => {
  const s = seasonAt(date)
  return s && isRegistered(s.id) ? s.id : OFF_SEASON
}

// Local midnight of each season's first day and of the day after its last, for one year.
const boundaries = (year: number): Date[] =>
  SEASONS.flatMap(s => {
    const end = new Date(year, s.to[0] - 1, s.to[1] + 1)
    // A wrapping season ends in the year after it starts.
    if (key(...s.from) > key(...s.to)) end.setFullYear(end.getFullYear() + 1)
    return [new Date(year, s.from[0] - 1, s.from[1]), end]
  })

// Local midnight of the next day on which the seasonal answer could change, strictly after `date`.
export const nextChangeAt = (date: Date): Date => {
  const y = date.getFullYear()
  const t = date.getTime()
  const later = [y - 1, y, y + 1].flatMap(boundaries).filter(d => d.getTime() > t)
  return later.reduce((a, b) => (b.getTime() < a.getTime() ? b : a))
}

// The next season after `date` whose pack is registered: its id and local start.
export const nextSeasonAt = (date: Date, isRegistered: (id: string) => boolean): { id: string; from: Date } | undefined => {
  const y = date.getFullYear()
  const t = date.getTime()
  return [y, y + 1]
    .flatMap(year => SEASONS.filter(s => isRegistered(s.id)).map(s => ({ id: s.id, from: new Date(year, s.from[0] - 1, s.from[1]) })))
    .filter(x => x.from.getTime() > t)
    .sort((a, b) => a.from.getTime() - b.from.getTime())[0]
}
