import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BackgroundMusicProvider from "@/components/providers/BackgroundMusicProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "The Archive — For Aulia",
    template: "%s · The Archive",
  },
  description:
    "Sebuah ruang kecil berisi kenangan, cerita, dan sesuatu yang dibuat khusus untuk Aulia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen font-sans">
        <BackgroundMusicProvider>{children}</BackgroundMusicProvider>
      </body>
    </html>
  );
}
