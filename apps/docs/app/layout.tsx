import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DocNavigation } from "../src/components/DocNavigation";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "AURA Documentation",
  description: "Complete documentation for the AURA AI Automation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div style={{ display: "flex" }}>
          <DocNavigation />
          <main style={{ flex: 1, padding: "2rem" }}>{children}</main>
        </div>
      </body>
    </html>
  );
}