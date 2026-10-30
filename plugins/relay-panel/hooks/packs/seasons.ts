// Seasonal packs and the everyday pack: which pack the panel draws on a given day. Pure, no engine calls.
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

// The pack the seasons alone draw on `date`: the season's, if that pack is registered, else OFF_SEASON.
export const seasonalPackAt = (date: Date, isRegistered: (id: string) => boolean): string => {
  const s = seasonAt(date)
  return s && isRegistered(s.id) ? s.id : OFF_SEASON
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

// --- the everyday pack and the seasons together.

// The everyday value that draws a pack picked at random once per session.
export const SHUFFLE = 'shuffle'

// Holiday packs are the seasons' packs: never a shuffle candidate, still a fixed everyday pick.
export const isHoliday = (id: string): boolean => SEASONS.some(s => s.id === id)

// The occurrence of `s` that holds on `date` (or starts in `date`'s year): its first and last local day.
const occurrence = (s: Season, date: Date): { from: Date; to: Date } => {
  const wraps = key(...s.from) > key(...s.to)
  // Early in the year a wrapping season started the year before.
  const y = wraps && key(date.getMonth() + 1, date.getDate()) <= key(...s.to) ? date.getFullYear() - 1 : date.getFullYear()
  return { from: new Date(y, s.from[0] - 1, s.from[1]), to: new Date(wraps ? y + 1 : y, s.to[0] - 1, s.to[1]) }
}

// The key a skipped season is stored under: '<id>:<year the season starts>'. A key from a
// past season never matches again, so a stale skip is ignored on its own.
export const seasonKey = (s: Season, date: Date): string => `${s.id}:${occurrence(s, date).from.getFullYear()}`

// The last local day of the occurrence of `s` that holds on `date`.
export const seasonEndAt = (s: Season, date: Date): Date => occurrence(s, date).to

// The packs a shuffle picks from, in registry order: the list (empty = every pack), registered, no holiday packs.
export const shuffleCandidates = (shuffleList: readonly string[], registered: readonly string[]): string[] =>
  (shuffleList.length ? registered.filter(id => shuffleList.includes(id)) : registered).filter(id => !isHoliday(id))

// One shuffle pick. Last session's pick is left out while another candidate remains;
// no candidates draws OFF_SEASON. `random` returns [0, 1), as Math.random does.
export const pickShuffle = (o: {
  shuffleList: readonly string[]
  registered: readonly string[]
  lastShuffle?: string
  random: () => number
}): string => {
  const all = shuffleCandidates(o.shuffleList, o.registered)
  const c = all.length > 1 && o.lastShuffle ? all.filter(id => id !== o.lastShuffle) : all
  if (!c.length) return OFF_SEASON
  return c[Math.min(c.length - 1, Math.max(0, Math.floor(o.random() * c.length)))]
}

export type PackState = {
  now: Date
  // A pack id, or SHUFFLE.
  everyday: string
  shuffleList: readonly string[]
  seasons: boolean
  skipSeason?: string
  lastShuffle?: string
  registered: readonly string[]
  // This session's shuffle pick, once made; without it a shuffle picks with `random`.
  shuffled?: string
  random?: () => number
  // Drawn when neither the everyday pack nor OFF_SEASON is registered.
  fallback?: string
}

export type Resolved = {
  // The pack to draw.
  id: string
  // The season holding now whose pack is registered, shown or not.
  season?: Season
  // True when the season's pack is the one drawn (rule 1).
  isSeasonal: boolean
  // True when that season is skipped (`skipSeason` is its key).
  isSkipped: boolean
  // The shuffle pick, when the everyday pack is SHUFFLE.
  shuffled?: string
}

// Which pack to draw:
// 1. seasons on, a season holds, its pack is registered and it is not skipped: the season's pack;
// 2. else the everyday pack: a registered id, else OFF_SEASON, else `fallback`;
//    SHUFFLE draws the session's pick (made here with `random` if not given).
export const resolvePack = (st: PackState): Resolved => {
  const at = seasonAt(st.now)
  const season = at && st.registered.includes(at.id) ? at : undefined
  const isSkipped = !!season && st.skipSeason === seasonKey(season, st.now)
  if (st.seasons && season && !isSkipped) return { id: season.id, season, isSeasonal: true, isSkipped, shuffled: st.shuffled }
  if (st.everyday === SHUFFLE) {
    const shuffled =
      st.shuffled ??
      pickShuffle({ shuffleList: st.shuffleList, registered: st.registered, lastShuffle: st.lastShuffle, random: st.random ?? Math.random })
    return { id: shuffled, season, isSeasonal: false, isSkipped, shuffled }
  }
  const id = st.registered.includes(st.everyday)
    ? st.everyday
    : st.registered.includes(OFF_SEASON) || st.fallback === undefined
      ? OFF_SEASON
      : st.fallback
  return { id, season, isSeasonal: false, isSkipped, shuffled: st.shuffled }
}
