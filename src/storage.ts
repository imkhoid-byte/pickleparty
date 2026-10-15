import AsyncStorage from '@react-native-async-storage/async-storage';

import { PackId } from './game/cards';
import { Format, Team } from './game/scoring';
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
  /** When the free Pro trial began (first launch). */
  trialStartedAt: number | null;
  /** Last known subscription status, so Pro works offline. The store is the source of truth. */
  proCached: boolean;
  trialEndedPaywallShown: boolean;
  /** Both partners agreed to Date Night cards. */
  dateNightConsent: boolean;
  /** Pro: the crew's own cards. */
  customCards: { id: string; text: string }[];
  /** Everyone this phone has played with, most recent first. */
  crew: string[];
}

export interface GameRecord {
  id: string;
  date: number;
  teamNames: [string, string];
  scores: [number, number];
  winner: Team;
  pickled: boolean;
  /** 0 when the score was entered after the game instead of rally by rally. */
  rallies: number;
  /** Player names per side (one each for singles). Older games only have team names. */
  players?: [string[], string[]];
  /** The party (session) this game was played in. */
  sessionId?: string;
}

export type RotationMode = 'mix' | 'winnersStay' | 'random';

/** A night of games with the same group. Saved so it survives the app being closed. */
export interface PartySession {
  id: string;
  startedAt: number;
  /** Who is here right now. */
  present: string[];
  format: Format;
  target: number;
  rotation: RotationMode;
  upNext: [string[], string[]] | null;
  houseRuleId: string | null;
  /** Last game whose results reveal was shown. */
  revealedGameId: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  spice: 'chill',
  ageConfirmed: false,
  ageAsked: false,
  unlockedPacks: ['classic'],
  activePacks: ['classic'],
  haptics: true,
  trialStartedAt: null,
  proCached: false,
  trialEndedPaywallShown: false,
  dateNightConsent: false,
  customCards: [],
  crew: [],
};

const SETTINGS_KEY = 'pickleparty.settings.v1';
const HISTORY_KEY = 'pickleparty.history.v1';
const SESSION_KEY = 'pickleparty.session.v1';
const MAX_HISTORY = 5000;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await readJson<Partial<Settings>>(SETTINGS_KEY, {})) };
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

export async function loadSession(): Promise<PartySession | null> {
  return readJson<PartySession | null>(SESSION_KEY, null);
}

export async function saveSession(session: PartySession | null): Promise<void> {
  if (session) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(SESSION_KEY);
}
