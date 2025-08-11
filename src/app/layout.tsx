import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const title = "Shizuku Pomodoro";
const description = "静かな視覚フィードバックで“続けやすさ”に振ったポモドーロタイマー。水面の揺れと最小限の合図だけ。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s | Shizuku Pomodoro" },
  description,
  alternates: { canonical: "/" }, // metadataBase付きで絶対URLに解決
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Shizuku Pomodoro",
    title,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Shizuku Pomodoro" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
