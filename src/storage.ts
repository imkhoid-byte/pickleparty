import AsyncStorage from '@react-native-async-storage/async-storage';

import { PackId } from './game/cards';
import type { RRSession } from './game/roundRobin';
import type { RoundsSession } from './game/rounds';
import { Team } from './game/scoring';
import { AnnouncerId, announcerFor } from './audio/personas';
import { Spice } from './game/spice';

export interface Settings {
  spice: Spice;
  /** Set once the player confirms they are 21+ (needed for drinking modes). */
  ageConfirmed: boolean;
  /** Whether the age gate has been shown at all. */
  ageAsked: boolean;
  /** The Terms version the player agreed to (TERMS_VERSION), and when, as a record of their agreement. */
  termsVersion: string | null;
  termsAcceptedAt: number | null;
  /** Packs bought one by one (from the store). */
  unlockedPacks: PackId[];
  activePacks: PackId[];
  haptics: boolean;
  /** Sound effects on big moments. */
  sound: boolean;
  /** A soft pop when buttons are tapped. */
  uiSounds: boolean;
  /** Read the drink breaks, rotations and workouts out loud, by name. */
  voice: boolean;
  /** Drinking game, Calm: just the rounds and the drinks (no Party Cards at the break). */
  calm: boolean;
  /** Drinking game, Chaos: a new Court Rule every round. */
  chaos: boolean;
  /** The first-match "How it works" has been shown. */
  seenHowTo: boolean;
  /** Instant Replay: start filming when a game starts (the group's last choice). */
  filmHighlights: boolean;
  /** Record the court's sound with the clips. */
  replaySound: boolean;
  /** How many times the "tap the camera after a great point" tip has shown (the first two). */
  replayTipsShown: number;
  /** Which announcer personality reads the prompts. */
  announcer: AnnouncerId;
  /** When the free Pro trial began (first launch). */
  trialStartedAt: number | null;
  /** Last known subscription status, so Pro works offline. The store is the source of truth. */
  proCached: boolean;
  trialEndedPaywallShown: boolean;
  /** Both partners agreed to Date Night cards. */
  dateNightConsent: boolean;
  /** Pro: the crew's own cards. */
  customCards: { id: string; text: string }[];
  /** The drinking game's players last time, to start the next one with. */
  lastPlayers: string[];
}

export interface GameRecord {
  id: string;
  date: number;
  teamNames: [string, string];
  scores: [number, number];
  winner: Team;
  pickled: boolean;
  rallies: number;
}

export const DEFAULT_SETTINGS: Settings = {
  spice: 'chill',
  ageConfirmed: false,
  ageAsked: false,
  termsVersion: null,
  termsAcceptedAt: null,
  unlockedPacks: ['classic'],
  activePacks: ['classic'],
  haptics: true,
  sound: true,
  uiSounds: true,
  voice: true,
  calm: false,
  chaos: false,
  seenHowTo: false,
  filmHighlights: false,
  replaySound: false,
  replayTipsShown: 0,
  announcer: 'squeaky',
  trialStartedAt: null,
  proCached: false,
  trialEndedPaywallShown: false,
  dateNightConsent: false,
  customCards: [],
  lastPlayers: [],
};

const SETTINGS_KEY = 'pickleparty.settings.v1';
const HISTORY_KEY = 'pickleparty.history.v1';
const ROUND_ROBIN_KEY = 'pickleparty.roundrobin.v1';
const ROUNDS_KEY = 'pickleparty.rounds.v1';
const MAX_HISTORY = 200;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadSettings(): Promise<Settings> {
  const s = { ...DEFAULT_SETTINGS, ...(await readJson<Partial<Settings>>(SETTINGS_KEY, {})) };
  // An announcer that no longer exists falls back to the default one.
  return { ...s, announcer: announcerFor(s.announcer).id };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadHistory(): Promise<GameRecord[]> {
  return readJson<GameRecord[]>(HISTORY_KEY, []);
}

export async function addGame(record: GameRecord): Promise<GameRecord[]> {
  const history = [record, ...(await loadHistory())].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

/** Replace the saved games (deleting one, or undoing a delete). */
export async function saveHistory(history: GameRecord[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

/** The open-play round robin in progress, if any. */
export async function loadRoundRobin(): Promise<RRSession | null> {
  const s = await readJson<RRSession | null>(ROUND_ROBIN_KEY, null);
  return s && Array.isArray(s.players) && Array.isArray(s.rounds) ? { ...s, target: s.target ?? 11 } : null;
}

export async function saveRoundRobin(session: RRSession | null): Promise<void> {
  if (session) await AsyncStorage.setItem(ROUND_ROBIN_KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(ROUND_ROBIN_KEY);
}

/** The drinking game in progress, saved after every round so a reload doesn't lose the night. */
export async function loadRounds(): Promise<RoundsSession | null> {
  const s = await readJson<RoundsSession | null>(ROUNDS_KEY, null);
  return s && Array.isArray(s.players) && Array.isArray(s.rounds) && Array.isArray(s.court) ? s : null;
}

export async function saveRounds(session: RoundsSession | null): Promise<void> {
  if (session) await AsyncStorage.setItem(ROUNDS_KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(ROUNDS_KEY);
}
