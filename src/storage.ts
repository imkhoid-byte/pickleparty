import AsyncStorage from '@react-native-async-storage/async-storage';

import { PackId } from './game/cards';
import { Team } from './game/scoring';
import { Spice } from './game/spice';

export interface Settings {
  spice: Spice;
  /** Set once the player confirms they are 21+ (needed for drinking modes). */
  ageConfirmed: boolean;
  /** Whether the age gate has been shown at all. */
  ageAsked: boolean;
  unlockedPacks: PackId[];
  activePacks: PackId[];
  haptics: boolean;
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
};

const SETTINGS_KEY = 'pickleparty.settings.v1';
const HISTORY_KEY = 'pickleparty.history.v1';
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
