import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { CARDS, Card, PACKS, PackId, cardsForPacks, customCards } from './game/cards';
import type { RRSession } from './game/roundRobin';
import type { RoundsSession } from './game/rounds';
import { Access, canUsePack, computeAccess, usablePacks } from './monetization/entitlements';
import { StoreState, fetchStoreState } from './purchases';
import {
  DEFAULT_SETTINGS,
  GameRecord,
  Settings,
  addGame,
  clearHistory,
  saveHistory,
  loadHistory,
  loadRoundRobin,
  loadRounds,
  loadSettings,
  saveRoundRobin,
  saveRounds,
  saveSettings,
} from './storage';

interface AppState {
  ready: boolean;
  settings: Settings;
  history: GameRecord[];
  access: Access;
  /** Cards the group can draw right now. */
  deck: Card[];
  /**
   * Court Rules for Chaos Rules: every one this player can use, whichever packs are
   * switched on for the card deck (Chaos Rules is its own switch).
   */
  courtRules: Card[];
  /** Cards from premium packs this player doesn't have (for teasers). Never adult packs. */
  lockedCards: Card[];
  updateSettings: (patch: Partial<Settings>) => void;
  recordGame: (record: GameRecord) => void;
  resetHistory: () => void;
  /** Remove one game (a test game, or one scored by mistake). */
  deleteGame: (id: string) => void;
  /** Put games back, e.g. to undo a delete. */
  restoreHistory: (games: GameRecord[]) => void;
  applyStoreState: (state: StoreState) => void;
  /** The open-play round robin in progress (saved on the phone), or null. */
  roundRobin: RRSession | null;
  setRoundRobin: (update: (prev: RRSession | null) => RRSession | null) => void;
  /** The drinking game in progress (saved on the phone), or null. */
  rounds: RoundsSession | null;
  /** Save the drinking game's new state, or pass null to end it. */
  setRounds: (session: RoundsSession | null) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [roundRobin, setRoundRobinState] = useState<RRSession | null>(null);
  const [rounds, setRoundsState] = useState<RoundsSession | null>(null);

  /** The drinking game in progress: changed, and saved, after every round. */
  const setRounds = useCallback((session: RoundsSession | null) => {
    setRoundsState(session);
    saveRounds(session).catch(() => {});
  }, []);

  const setRoundRobin = useCallback((update: (prev: RRSession | null) => RRSession | null) => {
    setRoundRobinState((prev) => {
      const next = update(prev);
      if (next !== prev) saveRoundRobin(next).catch(() => {});
      return next;
    });
  }, []);

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
    Promise.all([loadSettings(), loadHistory(), loadRoundRobin(), loadRounds()]).then(([s, h, rr, r]) => {
      setRoundRobinState(rr);
      setRoundsState(r);
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

  const courtRules = useMemo(() => {
    const adultOk = settings.ageConfirmed && settings.dateNightConsent;
    const allowed = (pack: PackId) =>
      canUsePack(pack, access, settings.unlockedPacks) && (!PACKS.find((p) => p.id === pack)?.adult || adultOk);
    return CARDS.filter((c) => c.kind === 'court' && allowed(c.pack));
  }, [settings, access]);

  const recordGame = useCallback((record: GameRecord) => {
    setHistory((prev) => [record, ...prev]);
    setNow(Date.now());
    addGame(record).catch(() => {});
  }, []);

  const resetHistory = useCallback(() => {
    setHistory([]);
    clearHistory().catch(() => {});
  }, []);

  const deleteGame = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveHistory(next).catch(() => {});
      return next;
    });
  }, []);

  const restoreHistory = useCallback((games: GameRecord[]) => {
    setHistory(games);
    saveHistory(games).catch(() => {});
  }, []);

  return (
    <Ctx.Provider
      value={{
        ready,
        settings,
        history,
        access,
        deck,
        courtRules,
        lockedCards,
        updateSettings,
        recordGame,
        resetHistory,
        deleteGame,
        restoreHistory,
        applyStoreState,
        roundRobin,
        setRoundRobin,
        rounds,
        setRounds,
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
