import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlatTracker Next",
  description: "Modern flatmate management app scaffold with auth, expenses, tasks, and dashboard.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">{children}</body>
    </html>
  );
}
