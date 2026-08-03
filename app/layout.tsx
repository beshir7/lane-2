import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/primitives";
import { LaneProvider } from "@/components/lane-provider";

// Fonts are bound to the CSS custom properties the design system reads
// (var(--font-display) etc.), overriding the :root fallbacks in globals.css.
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-display", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Lane 2 — Athlete Management System",
  description: "Run a world-class program from one workspace: athletes, competitions, calendars, documents and analytics.",
};

// Every API call the app makes goes to this one origin. Opening the connection
// while the HTML is still parsing means the DNS lookup, TCP handshake and TLS
// negotiation happen in parallel with the script download instead of being paid
// for by the first query — worth a few hundred ms on a cold connection.
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "";
  }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${archivo.variable} ${inter.variable} ${jetbrains.variable}`}>
      <head>
        {SUPABASE_ORIGIN && (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        )}
      </head>
      <body>
        <ToastProvider>
          <LaneProvider>{children}</LaneProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
