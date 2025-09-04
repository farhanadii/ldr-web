import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Little Love Hub 💖",
  description: "A crafted space for us — countdown, time zones, capsule notes & games.",
  icons: {
    icon: [
      { url: "/favicon1.png?v=2" },
      { url: "/favicon1.png?v=2", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon1.png?v=2",
    apple: "/favicon1.png?v=2",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}