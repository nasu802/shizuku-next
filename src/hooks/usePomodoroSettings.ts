"use client";
import { useCallback, useEffect, useState } from "react";

export type PomodoroSettings = { focusSec: number; breakSec: number };
// 既定は 25分 / 5分（秒で保存）
const DEFAULTS: PomodoroSettings = { focusSec: 25 * 60, breakSec: 5 * 60 };
const KEY = "shizuku.settings";

export function usePomodoroSettings() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        const focusSec = Math.max(1, Number(obj.focusSec) || DEFAULTS.focusSec);
        const breakSec = Math.max(1, Number(obj.breakSec) || DEFAULTS.breakSec);
        setSettings({ focusSec, breakSec });
      }
    } catch {}
    setLoaded(true);
  }, []);

  const save = useCallback((next: PomodoroSettings) => {
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  return { ...settings, save, loaded };
}
