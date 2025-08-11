"use client";
import { useCallback, useEffect, useState } from "react";

type Settings = { focusSec: number; breakSec: number };

const STORAGE_KEY = "shizuku.settings.v1";
const DEFAULTS: Settings = { focusSec: 25 * 60, breakSec: 5 * 60 };

// クライアントでだけ localStorage を読む
function loadFromStorage(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const obj = JSON.parse(raw);
    const f = Number(obj.focusSec), b = Number(obj.breakSec);
    if (!Number.isFinite(f) || !Number.isFinite(b)) return DEFAULTS;
    // 最低6秒は保証（極端な値のガード）
    return { focusSec: Math.max(6, Math.floor(f)), breakSec: Math.max(6, Math.floor(b)) };
  } catch {
    return DEFAULTS;
  }
}

export function usePomodoroSettings() {
  const [state, setState] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // 初回マウント時だけ localStorage を読む（SSRでは走らない）
  useEffect(() => {
    const s = loadFromStorage();
    setState(s);
    setLoaded(true);
  }, []);

  // 保存（呼ばれた時だけ localStorage を触る）
  const save = useCallback((next: Partial<Settings>) => {
    setState(prev => {
      const merged = { ...prev, ...next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    });
  }, []);

  const { focusSec, breakSec } = state;
  return { focusSec, breakSec, save, loaded };
}
