import { packIds } from './packs'

// The panel's subcommands of `/relay`: `/relay agents`, `/relay preview`, `/relay pack ...`.
// `/relay` belongs to the relay plugin's skill, so the mod does not register it; it reads the
// arguments at `prompt.submit` (register.tsx) and answers the ones below itself. Every other
// argument is a task for the skill and passes through untouched.

export type RelayAction =
  | { kind: 'agents'; open: boolean }
  | { kind: 'preview' }
  | { kind: 'list' }
  | { kind: 'shuffle'; ids: string[] }
  | { kind: 'seasons'; on: boolean }
  | { kind: 'seasons-usage' }
  | { kind: 'set'; word: string }

// Spellings of a pack that are not its id or its id's singular.
const ALIASES: Readonly<Record<string, string>> = {
  crab: 'clawd',
  crabs: 'clawd',
  "claw'd": 'clawd',
  thanksgiving: 'turkeys',
  xmas: 'christmas',
  snowman: 'winter',
}

// A pack word as typed to a pack id: exact id, alias, then singular or plural of an id
// (cat -> cats, adventurers -> adventurer). A word that names nothing comes back as it is.
export function looseId(word: string, ids: readonly string[] = packIds()): string {
  const w = word.toLowerCase().replace(/[‘’]/g, "'")
  if (ids.includes(w)) return w
  const alias = Object.hasOwn(ALIASES, w) ? ALIASES[w] : undefined
  if (alias && ids.includes(alias)) return alias
  if (ids.includes(`${w}s`)) return `${w}s`
  if (w.endsWith('s') && ids.includes(w.slice(0, -1))) return w.slice(0, -1)
  return w
}

// What `/relay <args>` asks of the panel, or null when the arguments are a task for the skill.
// Case-insensitive, whitespace collapsed; only the exact forms below match.
//   agents | agents open        toggle / open the agents pane
//   preview                     open the pack gallery
//   pack | packs | pack list    list the packs        (pack preview: open the gallery)
//   pack shuffle [ids...]       shuffle the everyday pack
//   pack seasonal|seasons on|off
//   pack auto                   seasons on
//   pack <word>                 set the everyday pack (loose names)
export function parseRelayArgs(args: string | undefined, ids: readonly string[] = packIds()): RelayAction | null {
  const t = (args ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  const [head, sub] = t
  if (head === 'agents') {
    if (t.length === 1) return { kind: 'agents', open: false }
    return t.length === 2 && sub === 'open' ? { kind: 'agents', open: true } : null
  }
  if (head === 'preview') return t.length === 1 ? { kind: 'preview' } : null
  if (head !== 'pack' && head !== 'packs') return null

  if (t.length === 1) return { kind: 'list' }
  if (sub === 'shuffle') {
    const rest = t.slice(2).join(' ').split(/[\s,]+/).filter(Boolean)
    return { kind: 'shuffle', ids: rest.map(id => looseId(id, ids)) }
  }
  if (sub === 'seasonal' || sub === 'seasons') {
    if (t.length === 3 && (t[2] === 'on' || t[2] === 'off')) return { kind: 'seasons', on: t[2] === 'on' }
    return { kind: 'seasons-usage' }
  }
  // Anything else is one word naming a pack or a setting; more words are a task.
  if (t.length !== 2 || sub === undefined) return null
  if (sub === 'list') return { kind: 'list' }
  if (sub === 'preview') return { kind: 'preview' }
  if (sub === 'auto') return { kind: 'seasons', on: true }
  return { kind: 'set', word: looseId(sub, ids) }
}

// The command names the engine may report for the relay plugin's skill.
export const isRelayCommand = (name: string | undefined): boolean => name === 'relay' || name === 'relay:relay'
