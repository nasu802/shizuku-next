"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Playground() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const a = new Audio("/sounds/water-drop.mp3");
    a.preload = "auto";
    audioRef.current = a;
  }, []);

  const unlock = async () => {
    if (!audioRef.current) return;
    try {
      audioRef.current.volume = 0;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.35;
      setUnlocked(true);
    } catch { setUnlocked(false); }
  };

  const playOnce = async () => {
    if (!audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch {}
  };

  if (!mounted) return null;

  return (
    <main style={{minHeight:"100dvh", display:"grid", placeItems:"center", gap:16}}>
      <div style={{display:"grid", gap:12, textAlign:"center"}}>
        <h1>🔊 Playground（水音テスト）</h1>
        <button onClick={unlock} style={{padding:"10px 16px"}}>① 音の許可を有効化</button>
        <button onClick={playOnce} style={{padding:"10px 16px"}} disabled={!unlocked}>② テスト再生</button>
        <p style={{opacity:.7, fontSize:14}}>
          状態: {unlocked ? "✅ 解錠済み" : "🔒 未解錠（まず①を押す）"}
        </p>
        <Link href="/" style={{fontSize:14}}>← トップへ戻る</Link>
      </div>
    </main>
  );
}
