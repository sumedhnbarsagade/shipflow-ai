import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ShipFlow AI | Build & Ship AI-Powered Products from Feature to Production",
  description: "Accelerate your software team's feature delivery lifecycle. Structured requirement clarifications, automated PRD and task generation, real-time AI code reviews, and human release approvals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-950 text-slate-100`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

