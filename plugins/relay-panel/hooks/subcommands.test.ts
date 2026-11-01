import { expect, test } from 'claude-code/testing'
import { isRelayCommand, looseId, parseRelayArgs } from './subcommands'
import type { RelayAction } from './subcommands'

// Fixed ids, so the parser's tests do not move when a pack is added.
const IDS = ['clawd', 'cats', 'dogs', 'adventurers', 'winter', 'turkeys', 'christmas']
const parse = (args: string | undefined): RelayAction | null => parseRelayArgs(args, IDS)

test('parseRelayArgs: agents and preview', () => {
  expect(parse('agents')).toEqual({ kind: 'agents', open: false })
  expect(parse('agents open')).toEqual({ kind: 'agents', open: true })
  expect(parse('preview')).toEqual({ kind: 'preview' })
  expect(parse('pack preview')).toEqual({ kind: 'preview' })
  expect(parse('packs preview')).toEqual({ kind: 'preview' })
})

test('parseRelayArgs: pack list', () => {
  for (const args of ['pack', 'packs', 'pack list', 'packs list']) expect(parse(args)).toEqual({ kind: 'list' })
})

test('parseRelayArgs: trims, collapses whitespace, ignores case', () => {
  expect(parse('  AGENTS   Open ')).toEqual({ kind: 'agents', open: true })
  expect(parse('\tPack\n  Seasonal   ON')).toEqual({ kind: 'seasons', on: true })
  expect(parse('PACKS  Shuffle  Cats')).toEqual({ kind: 'shuffle', ids: ['cats'] })
})

test('parseRelayArgs: pack shuffle [ids] with loose ids', () => {
  expect(parse('pack shuffle')).toEqual({ kind: 'shuffle', ids: [] })
  expect(parse('pack shuffle cats dogs')).toEqual({ kind: 'shuffle', ids: ['cats', 'dogs'] })
  expect(parse('pack shuffle cat, dog')).toEqual({ kind: 'shuffle', ids: ['cats', 'dogs'] })
  // Unknown ids are kept as typed (lowercased): the shuffle refuses them by name.
  expect(parse('pack shuffle turkeys Dragons')).toEqual({ kind: 'shuffle', ids: ['turkeys', 'dragons'] })
})

test('parseRelayArgs: seasonal and seasons', () => {
  for (const word of ['seasonal', 'seasons']) {
    expect(parse(`pack ${word} on`)).toEqual({ kind: 'seasons', on: true })
    expect(parse(`packs ${word} off`)).toEqual({ kind: 'seasons', on: false })
    // Anything else is a usage reply, not a task.
    for (const rest of ['', ' maybe', ' on off', ' on please', ' the thing']) expect(parse(`pack ${word}${rest}`)).toEqual({ kind: 'seasons-usage' })
  }
  expect(parse('pack auto')).toEqual({ kind: 'seasons', on: true })
  expect(parse('packs auto')).toEqual({ kind: 'seasons', on: true })
})

test('parseRelayArgs: pack <one word> sets the everyday pack, loosely', () => {
  expect(parse('pack cats')).toEqual({ kind: 'set', word: 'cats' })
  expect(parse('pack cat')).toEqual({ kind: 'set', word: 'cats' })
  expect(parse('packs Dog')).toEqual({ kind: 'set', word: 'dogs' })
  expect(parse('pack xmas')).toEqual({ kind: 'set', word: 'christmas' })
  expect(parse('pack thanksgiving')).toEqual({ kind: 'set', word: 'turkeys' })
  // An unknown word is still a subcommand: the reply names it.
  expect(parse('pack dragons')).toEqual({ kind: 'set', word: 'dragons' })
})

test('parseRelayArgs: anything else is a task', () => {
  for (const args of [
    undefined,
    '',
    '   ',
    'fix the login bug',
    'preview the deploy changes',
    'preview now',
    'agents should retry',
    'agents open now',
    'agents open the door',
    'pack the release into a zip',
    'pack cats and dogs',
    'packs of cards',
    'packing list',
    'previews',
    'agent',
    'refactor the pack module',
    'list',
    'auto',
    'cats',
  ]) {
    expect(parse(args)).toBeNull()
  }
})

test('looseId: exact, plural and singular, aliases; unknown words come back lowercased', () => {
  expect(looseId('cats', IDS)).toBe('cats')
  expect(looseId('cat', IDS)).toBe('cats')
  expect(looseId('dog', IDS)).toBe('dogs')
  expect(looseId('adventurer', IDS)).toBe('adventurers')
  expect(looseId('turkey', IDS)).toBe('turkeys')
  expect(looseId('crab', IDS)).toBe('clawd')
  expect(looseId('Crabs', IDS)).toBe('clawd')
  expect(looseId("Claw'd", IDS)).toBe('clawd')
  expect(looseId('claw’d', IDS)).toBe('clawd')
  expect(looseId('thanksgiving', IDS)).toBe('turkeys')
  expect(looseId('xmas', IDS)).toBe('christmas')
  expect(looseId('snowman', IDS)).toBe('winter')
  expect(looseId('Dragons', IDS)).toBe('dragons')
  // An alias to a pack that is not registered stays as typed.
  expect(looseId('xmas', ['cats'])).toBe('xmas')
})

test('isRelayCommand: relay and relay:relay only', () => {
  expect(isRelayCommand('relay')).toBe(true)
  expect(isRelayCommand('relay:relay')).toBe(true)
  for (const name of [undefined, '', 'review', 'relay-packs', 'relay-agents', 'relay-panel:relay', 'Relay', 'relays']) expect(isRelayCommand(name)).toBe(false)
})
