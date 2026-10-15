import AsyncStorage from '@react-native-async-storage/async-storage';

import { PackId } from './game/cards';
import type { RRSession } from './game/roundRobin';
import { Team } from './game/scoring';
import { AnnouncerId, announcerFor } from './audio/personas';
import { Spice } from './game/spice';

export interface Settings {
  spice: Spice;
  /** Set once the player confirms they are 21+ (needed for drinking modes). */
  ageConfirmed: boolean;
  /** Whether the age gate has been shown at all. */
  ageAsked: boolean;
  /** Packs bought one by one (from the store). */
  unlockedPacks: PackId[];
  activePacks: PackId[];
  haptics: boolean;
  /** Sound effects on big moments. */
  sound: boolean;
  /** Read penalties out loud with the team names. */
  voice: boolean;
  /** High-contrast match screen for playing outdoors. */
  sunlight: boolean;
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
  unlockedPacks: ['classic'],
  activePacks: ['classic'],
  haptics: true,
  sound: true,
  voice: true,
  sunlight: false,
  announcer: 'squeaky',
  trialStartedAt: null,
  proCached: false,
  trialEndedPaywallShown: false,
  dateNightConsent: false,
  customCards: [],
};

const SETTINGS_KEY = 'pickleparty.settings.v1';
const HISTORY_KEY = 'pickleparty.history.v1';
const ROUND_ROBIN_KEY = 'pickleparty.roundrobin.v1';
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

/** The open-play round robin in progress, if any. */
export async function loadRoundRobin(): Promise<RRSession | null> {
  const s = await readJson<RRSession | null>(ROUND_ROBIN_KEY, null);
  return s && Array.isArray(s.players) && Array.isArray(s.rounds) ? { ...s, target: s.target ?? 11 } : null;
}

export async function saveRoundRobin(session: RRSession | null): Promise<void> {
  if (session) await AsyncStorage.setItem(ROUND_ROBIN_KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(ROUND_ROBIN_KEY);
}
