import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Card, PACKS, PackId, cardsForPacks, customCards } from './game/cards';
import { Access, computeAccess, usablePacks } from './monetization/entitlements';
import { StoreState, fetchStoreState } from './purchases';
import { nameKey } from './game/players';
import {
  DEFAULT_SETTINGS,
  GameRecord,
  PartySession,
  Settings,
  addGame,
  clearHistory,
  loadHistory,
  loadSession,
  loadSettings,
  saveSession,
  saveSettings,
} from './storage';

interface AppState {
  ready: boolean;
  settings: Settings;
  history: GameRecord[];
  access: Access;
  /** Cards the group can draw right now. */
  deck: Card[];
  /** Cards from premium packs this player doesn't have (for teasers). Never adult packs. */
  lockedCards: Card[];
  updateSettings: (patch: Partial<Settings>) => void;
  recordGame: (record: GameRecord) => void;
  resetHistory: () => void;
  applyStoreState: (state: StoreState) => void;
  /** The party in progress, if any. */
  session: PartySession | null;
  setSession: (next: PartySession | null) => void;
  /** Remember names so next time they're one tap away. */
  rememberPlayers: (names: string[]) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [session, setSessionState] = useState<PartySession | null>(null);
  // Re-evaluated on every render that matters; trial expiry only needs day precision.
  const [now, setNow] = useState(() => Date.now());

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next).catch(() => {});
      return next;
    });
  }, []);

  const applyStoreState = useCallback(
    (state: StoreState) =>
      setSettings((prev) => {
        const next = {
          ...prev,
          proCached: state.pro,
          unlockedPacks: [...new Set([...prev.unlockedPacks, ...state.ownedPacks])],
        };
        saveSettings(next).catch(() => {});
        return next;
      }),
    [],
  );

  useEffect(() => {
    Promise.all([loadSettings(), loadHistory(), loadSession()]).then(([s, h, party]) => {
      setSessionState(party);
      // Players from before the trial existed start theirs now.
      const loaded = s.ageAsked && s.trialStartedAt === null ? { ...s, trialStartedAt: Date.now() } : s;
      setSettings(loaded);
      if (loaded !== s) saveSettings(loaded).catch(() => {});
      setHistory(h);
      setNow(Date.now());
      setReady(true);
    });
    fetchStoreState().then((state) => state && applyStoreState(state));
  }, [applyStoreState]);

  const access = useMemo(
    () => computeAccess({ trialStartedAt: settings.trialStartedAt, subscribed: settings.proCached, now }),
    [settings.trialStartedAt, settings.proCached, now],
  );

  const { deck, lockedCards } = useMemo(() => {
    const owned = settings.unlockedPacks;
    let packs = usablePacks(settings.activePacks, access, owned);
    const adultOk = settings.ageConfirmed && settings.dateNightConsent;
    packs = packs.filter((id) => !PACKS.find((p) => p.id === id)?.adult || adultOk);
    if (packs.length === 0) packs = ['classic'];
    const cards = cardsForPacks(packs);
    if (access.isPro) cards.push(...customCards(settings.customCards));
    const lockedPacks = PACKS.filter(
      (p) => p.premium && !p.adult && !access.isPro && !owned.includes(p.id),
    ).map((p) => p.id as PackId);
    return { deck: cards, lockedCards: cardsForPacks(lockedPacks) };
  }, [settings, access]);

  const recordGame = useCallback((record: GameRecord) => {
    setHistory((prev) => [record, ...prev]);
    setNow(Date.now());
    addGame(record).catch(() => {});
  }, []);

  const setSession = useCallback((next: PartySession | null) => {
    setSessionState(next);
    saveSession(next).catch(() => {});
  }, []);

  const rememberPlayers = useCallback(
    (names: string[]) =>
      setSettings((prev) => {
        const keys = new Set(names.map(nameKey));
        const crew = [...names, ...prev.crew.filter((n) => !keys.has(nameKey(n)))].slice(0, 60);
        const next = { ...prev, crew };
        saveSettings(next).catch(() => {});
        return next;
      }),
    [],
  );

  const resetHistory = useCallback(() => {
    setHistory([]);
    clearHistory().catch(() => {});
  }, []);

  return (
    <Ctx.Provider
      value={{
        ready,
        settings,
        history,
        access,
        deck,
        lockedCards,
        updateSettings,
        recordGame,
        resetHistory,
        applyStoreState,
        session,
        setSession,
        rememberPlayers,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}
