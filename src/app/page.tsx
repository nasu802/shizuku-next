import Link from "next/link";

export default function Home() {
  return (
    <main style={{minHeight:"100dvh", display:"grid", placeItems:"center", gap:16, textAlign:"center"}}>
      <h1>💧 Shizuku Pomodoro</h1>
      <p style={{opacity:.7}}>Next.js + 音テスト用ミニページ</p>
      <Link href="/playground" style={{padding:"10px 16px", display:"inline-block", border:"1px solid #ccc", borderRadius:8}}>
        /playground へ
      </Link>
    </main>
  );
}
