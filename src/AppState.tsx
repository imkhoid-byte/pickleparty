import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  DEFAULT_SETTINGS,
  GameRecord,
  Settings,
  addGame,
  clearHistory,
  loadHistory,
  loadSettings,
  saveSettings,
} from './storage';

interface AppState {
  ready: boolean;
  settings: Settings;
  history: GameRecord[];
  updateSettings: (patch: Partial<Settings>) => void;
  recordGame: (record: GameRecord) => void;
  resetHistory: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<GameRecord[]>([]);

  useEffect(() => {
    Promise.all([loadSettings(), loadHistory()]).then(([s, h]) => {
      setSettings(s);
      setHistory(h);
      setReady(true);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next).catch(() => {});
      return next;
    });
  }, []);

  const recordGame = useCallback((record: GameRecord) => {
    setHistory((prev) => [record, ...prev]);
    addGame(record).catch(() => {});
  }, []);

  const resetHistory = useCallback(() => {
    setHistory([]);
    clearHistory().catch(() => {});
  }, []);

  return (
    <Ctx.Provider value={{ ready, settings, history, updateSettings, recordGame, resetHistory }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}
