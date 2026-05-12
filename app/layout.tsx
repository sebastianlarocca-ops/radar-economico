import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Macro Pulse — Macroeconomic Intelligence",
  description: "Dashboard macro y financiero — Argentina, USA, Eurozona, China.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230B1020'/><rect width='32' height='32' rx='8' fill='none' stroke='%235B9DFF' stroke-width='1.5' stroke-opacity='0.5'/><polyline points='4,22 9,14 13,18 18,8 23,15 28,11' fill='none' stroke='%235B9DFF' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/><circle cx='28' cy='11' r='2.5' fill='%235B9DFF'/></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B1020",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable}`}>
      <body style={{ fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)" }}>
        {children}
      </body>
    </html>
  );
}
