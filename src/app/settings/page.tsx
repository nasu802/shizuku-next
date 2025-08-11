"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePomodoroSettings } from "@/hooks/usePomodoroSettings";
import { ArrowLeftIcon, BeakerIcon } from "@heroicons/react/24/outline";

const toMin = (sec:number) => sec / 60;
const toSec = (min:number) => Math.round(min * 60);
const clamp = (n:number, min:number, max:number) => Math.min(max, Math.max(min, n));

// 入力整形（全角→半角、先頭ゼロ除去、小数点1つ、"0."は維持）
function normalizeDecimalInput(raw: string) {
  if (raw == null) return "";
  const s = raw
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30))
    .replace(/[，、]/g, "")
    .replace(/[．｡。]/g, ".");
  let out = "", dot = false;
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !dot) { out += ch; dot = true; }
  }
  if (out === ".") out = "0.";
  if (out.startsWith("0") && !out.startsWith("0.")) {
    out = out.replace(/^0+(?=\d)/, "");
    if (out === "") out = "0";
  }
  return out;
}

// 表示フォーマット（末尾0を落として 25.00→25 / 1.50→1.5）
function fmt(n:number) {
  if (!Number.isFinite(n)) return "";
  return String(Number(n.toFixed(2)));
}

const MUTE_KEY = "shizuku.muted";
const BASE_VOL = 0.35;

export default function SettingsPage() {
  const { focusSec, breakSec, save, loaded } = usePomodoroSettings();

  const [focusStr, setFocusStr] = useState("");
  const [breakStr, setBreakStr] = useState("");
  const [status, setStatus] = useState<"idle"|"saving"|"saved"|"loading">("loading");

  const [muted, setMuted] = useState(false);
  useEffect(() => { try { const v = localStorage.getItem(MUTE_KEY); if (v !== null) setMuted(v === "1"); } catch {} }, []);

  useEffect(() => {
    if (!loaded) return;
    setFocusStr(fmt(toMin(focusSec)));
    setBreakStr(fmt(toMin(breakSec)));
    setStatus("idle");
  }, [loaded, focusSec, breakSec]);

  const onChangeFocus = (e:React.ChangeEvent<HTMLInputElement>) => setFocusStr(normalizeDecimalInput(e.target.value));
  const onChangeBreak  = (e:React.ChangeEvent<HTMLInputElement>) => setBreakStr(normalizeDecimalInput(e.target.value));

  const onBlurNormalize = (which:"focus"|"break") => {
    const src = which === "focus" ? focusStr : breakStr;
    const currentSec = which === "focus" ? focusSec : breakSec;
    if (src === "") return (which === "focus" ? setFocusStr : setBreakStr)(fmt(toMin(currentSec)));
    const n = parseFloat(src); if (!Number.isFinite(n)) return (which === "focus" ? setFocusStr : setBreakStr)(fmt(toMin(currentSec)));
    const clamped = clamp(n, 0.1, 600);
    (which === "focus" ? setFocusStr : setBreakStr)(fmt(clamped));
  };

  // 自動保存（500msデバウンス）
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);
  const lastSavedRef = useRef<{f:number; b:number}>({ f: focusSec, b: breakSec });
  useEffect(() => {
    if (!loaded) return;
    if (!initRef.current) { initRef.current = true; lastSavedRef.current = { f: focusSec, b: breakSec }; return; }
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      const f = parseFloat(focusStr || ""); const b = parseFloat(breakStr || "");
      if (!Number.isFinite(f) || !Number.isFinite(b)) return;
      const fSec = toSec(Math.min(600, Math.max(0.1, f)));
      const bSec = toSec(Math.min(600, Math.max(0.1, b)));
      if (fSec !== lastSavedRef.current.f || bSec !== lastSavedRef.current.b) {
        setStatus("saving");
        save({ focusSec: fSec, breakSec: bSec });
        lastSavedRef.current = { f: fSec, b: bSec };
        setStatus("saved"); setTimeout(()=>setStatus("idle"), 1200);
      }
    }, 500);
    return () => { if (tRef.current) clearTimeout(tRef.current); };
  }, [loaded, focusStr, breakStr, save, focusSec, breakSec]);

  // 許可してテスト（フラスコ）
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [soundMsg, setSoundMsg] = useState<"idle"|"ok"|"fail"|"muted">("idle");
  useEffect(() => {
    const a = new Audio("/sounds/water-drop.mp3");
    a.preload = "auto";
    a.volume = muted ? 0 : BASE_VOL;
    audioRef.current = a;
  }, [muted]);

  async function unlockAndTest() {
    if (!audioRef.current) return;
    try {
      audioRef.current.volume = 0;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = muted ? 0 : BASE_VOL;
      setUnlocked(true);

      const a = audioRef.current.cloneNode(true) as HTMLAudioElement;
      a.volume = muted ? 0 : BASE_VOL;
      await a.play();
      setSoundMsg(muted ? "muted" : "ok");
      setTimeout(()=>setSoundMsg("idle"), 1600);
    } catch {
      setUnlocked(false);
      setSoundMsg("fail");
      setTimeout(()=>setSoundMsg("idle"), 2000);
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-slate-50 text-slate-900">
      <form className="w-full max-w-md px-6 py-8 md:px-8 md:py-10 grid gap-4">
        {/* ←戻る と 説明テキストを縦センター揃え */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="戻る"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <p className="text-sm leading-snug text-slate-600">
            小数も入力できます。<br />入力すると自動で保存されます。
          </p>
        </div>

        {/* その場で解錠＆テスト（フラスコ） */}
        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-700">音が鳴らない場合は押してください</span>
            <button
              type="button"
              onClick={unlockAndTest}
              title={unlocked ? "許可済み（テスト再生）" : "許可してテスト"}
              aria-label={unlocked ? "許可済み（テスト再生）" : "許可してテスト"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-100"
            >
              <BeakerIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="h-5 text-xs text-slate-600 mt-1" aria-live="polite">
            {soundMsg === "ok" ? "テスト音を再生しました" :
             soundMsg === "muted" ? "ミュート中です（トップ右上の🔇で解除できます）" :
             soundMsg === "fail" ? "再生に失敗しました。端末の音量・消音スイッチを確認してください" : " "}
          </div>
        </div>

        {/* 入力：集中（分） */}
        <label className="grid gap-1.5">
          <span className="text-sm text-slate-600">集中（分）</span>
          <div className="relative">
            <input
              type="text" inputMode="decimal"
              value={focusStr}
              onChange={onChangeFocus}
              onBlur={()=>onBlurNormalize("focus")}
              placeholder="25"
              className="w-full pr-12 pl-3 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">分</span>
          </div>
        </label>

        {/* 入力：休憩（分） */}
        <label className="grid gap-1.5">
          <span className="text-sm text-slate-600">休憩（分）</span>
          <div className="relative">
            <input
              type="text" inputMode="decimal"
              value={breakStr}
              onChange={onChangeBreak}
              onBlur={()=>onBlurNormalize("break")}
              placeholder="5"
              className="w-full pr-12 pl-3 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">分</span>
          </div>
        </label>

        {/* ステータス */}
        <div className="text-sm text-slate-600" aria-live="polite">
          {status === "loading" ? "読み込み中..." : status === "saving" ? "保存中..." : status === "saved" ? "保存しました" : " "}
        </div>
      </form>
    </main>
  );
}
