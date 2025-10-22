import type { Metadata } from "next";
import { Geist, Geist_Mono, Inika } from "next/font/google";
import "./globals.css";

const inika = Inika({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-inika",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StolTaom",
  description: "Stol bron qilish va taom buyurtma qilish xizmati",
  icons: "/favicon.ico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Determine theme override from env:
  // - DEFAULT_THEME: 'dark' | 'light' | 'system'
  // - ENABLE_DARK_MODE: 'true' | 'false' (legacy boolean)
  const themePref = (process.env.DEFAULT_THEME || '').toLowerCase()
  let themeClass = ''
  if (themePref === 'dark') themeClass = 'force-dark'
  else if (themePref === 'light') themeClass = 'force-light'
  else if (process.env.ENABLE_DARK_MODE === 'true') themeClass = 'force-dark'
  else if (process.env.ENABLE_DARK_MODE === 'false') themeClass = 'force-light'

  return (
    <html lang="en">
      <body
        className={`${inika.className} ${inika.variable} ${geistSans.variable} ${geistMono.variable} antialiased ${themeClass}`}
      >
        {children}
      </body>
    </html>
  );
}
