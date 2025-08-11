"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePomodoroSettings } from "@/hooks/usePomodoroSettings";
import { Cog6ToothIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/outline";
import { PlayIcon, PauseIcon, StopIcon } from "@heroicons/react/24/solid";

const BASE_VOL = 0.35;
const MID_VOL  = 0.25;
const NUDGE_VOL= 0.15;

const VISUAL_TICK_SEC   = 30;
const ENABLE_MID_CUE    = true;
const EARLY_WINDOW_SEC  = 600;
const EARLY_INTERVAL_SEC= 180;
const MIN_INTERVAL_MS   = 0;

const MUTE_KEY = "shizuku.muted";

export default function Home() {
  const { focusSec, breakSec, loaded } = usePomodoroSettings();

  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(focusSec);
  const [drops, setDrops] = useState(0);

  // ミュート（永続）
  const [muted, setMuted] = useState(false);
  useEffect(() => { try { const v = localStorage.getItem(MUTE_KEY); if (v !== null) setMuted(v === "1"); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch {} }, [muted]);

  // 設定変更は停止中なら即反映
  useEffect(() => {
    if (!loaded) return;
    if (!isRunning) setTimeLeft(mode === "focus" ? focusSec : breakSec);
  }, [loaded, focusSec, breakSec, mode, isRunning]);

  // 音
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const lastPlayRef = useRef(0);

  // 初期化
  useEffect(() => {
    const a = new Audio("/sounds/water-drop.mp3");
    a.preload = "auto";
    a.volume = BASE_VOL;
    audioRef.current = a;
  }, []);

  // ミュート切替で音量だけ反映
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : BASE_VOL;
  }, [muted]);

  async function unlockAudio() {
    if (!audioRef.current || unlocked) return;
    try {
      audioRef.current.volume = 0;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = muted ? 0 : BASE_VOL;
      setUnlocked(true);
    } catch {}
  }

  const playWithVolume = useCallback((vol:number) => {
    if (!audioRef.current || !unlocked) return;
    const now = Date.now();
    if (now - lastPlayRef.current < MIN_INTERVAL_MS) return;
    const a = audioRef.current.cloneNode(true) as HTMLAudioElement;
    a.volume = muted ? 0 : vol;
    a.play().catch(() => {});
    lastPlayRef.current = now;
  }, [unlocked, muted]);

  function tinyVibrate(ms=8) {
    // ✅ any を使わず、標準の型付き API をそのまま呼ぶ
    if (typeof navigator !== "undefined") {
      try { navigator.vibrate?.(ms); } catch {}
    }
  }

  // 視覚フィードバック（瓶UIへイベント）
  const visualTick = useCallback((elapsed:number, total:number) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("shizuku:visual-tick", { detail: { elapsed, total }}));
    }
  }, []);

  // タイマー
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, timeLeft]);

  // セッション内キュー管理
  const lastVisualTickRef = useRef(0);
  const lastEarlyNudgeRef = useRef(0);
  const midCueFiredRef   = useRef(false);

  useEffect(() => {
    if (mode === "focus") {
      lastVisualTickRef.current = 0;
      lastEarlyNudgeRef.current = 0;
      midCueFiredRef.current = false;
    }
  }, [mode, focusSec]);

  // 1秒ごとの判定
  useEffect(() => {
    if (!isRunning || mode !== "focus") return;
    const elapsed = Math.max(0, focusSec - timeLeft);

    if (elapsed > 0 && elapsed % VISUAL_TICK_SEC === 0 && lastVisualTickRef.current !== elapsed) {
      visualTick(elapsed, focusSec);
      lastVisualTickRef.current = elapsed;
    }

    if (elapsed > 0 && elapsed <= EARLY_WINDOW_SEC && elapsed % EARLY_INTERVAL_SEC === 0 && lastEarlyNudgeRef.current !== elapsed) {
      playWithVolume(NUDGE_VOL);
      tinyVibrate(8);
      lastEarlyNudgeRef.current = elapsed;
    }

    const half = Math.floor(focusSec / 2);
    if (ENABLE_MID_CUE && elapsed === half && !midCueFiredRef.current) {
      playWithVolume(MID_VOL);
      tinyVibrate(12);
      midCueFiredRef.current = true;
    }
  }, [isRunning, mode, timeLeft, focusSec, visualTick, playWithVolume]);

  // フェーズ切り替え（終了時）
  useEffect(() => {
    if (!isRunning || timeLeft !== 0) return;
    if (mode === "focus") {
      setDrops((d) => d + 1);
      setMode("break");
      setTimeLeft(breakSec);
      playWithVolume(BASE_VOL);
      tinyVibrate(20);
    } else {
      setMode("focus");
      setTimeLeft(focusSec);
    }
  }, [isRunning, timeLeft, mode, focusSec, breakSec, playWithVolume]);

  // 操作
  async function togglePlayPause() {
    if (!isRunning && !unlocked) await unlockAudio();
    setIsRunning((v) => !v);
  }
  function handleStop() {
    setIsRunning(false);
    setMode("focus");
    setTimeLeft(focusSec);
  }
  function toggleMute() { setMuted((m) => !m); }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <main className="min-h-dvh grid place-items-center bg-slate-50 text-slate-900">
      <div className="w-full max-w-md px-6 py-8 md:px-8 md:py-10">
        {/* ヘッダー：タイトル + 右上にミュート＆設定 */}
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">Shizuku Pomodoro</h1>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              title={muted ? "ミュート解除" : "ミュート"}
              aria-label={muted ? "ミュート解除" : "ミュート"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-100"
            >
              {muted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
            </button>
            <Link
              href="/settings"
              aria-label="設定"
              title="設定"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-100"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </Link>
          </nav>
        </header>

        <section className="grid gap-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {mode === "focus" ? "集中モード" : "休憩モード"}
            </span>
            <span className="text-xs text-transparent">.</span>
          </div>

          <div className="text-center">
            <div className="font-mono tabular-nums text-6xl md:text-7xl tracking-wide">
              {mm}:{ss}
            </div>
          </div>

          {/* コントロール */}
          <div className="flex justify-center gap-3">
            <button
              onClick={togglePlayPause}
              title={isRunning ? "一時停止" : "再生"}
              aria-label={isRunning ? "一時停止" : "再生"}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-2 ${
                isRunning
                  ? "bg-slate-700 hover:bg-slate-600 focus-visible:ring-slate-400"
                  : "bg-sky-600 hover:bg-sky-500 focus-visible:ring-sky-400"
              }`}
            >
              {isRunning ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </button>

            <button
              onClick={handleStop}
              title="やめる"
              aria-label="やめる"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <StopIcon className="h-6 w-6 text-slate-800" />
            </button>
          </div>

          <div className="text-center text-sm text-slate-600">今日の水滴数：{drops}滴</div>
        </section>
      </div>
    </main>
  );
}
