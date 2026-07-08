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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${archivo.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <ToastProvider>
          <LaneProvider>{children}</LaneProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
