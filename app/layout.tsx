import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, Crosshair } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shannon Workbench",
  description: "Autonomous pentest management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-slate-950 text-slate-100">
        {/* Fixed sidebar */}
        <aside className="fixed inset-y-0 left-0 w-56 flex flex-col bg-slate-950 border-r border-slate-800 z-30">
          {/* App name */}
          <div className="h-14 flex items-center px-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-md bg-violet-600 flex items-center justify-center shrink-0">
                <Crosshair className="size-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-100 leading-tight">
                Shannon<br />
                <span className="font-normal text-slate-400 text-xs">Workbench</span>
              </span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            <Link
              href="/"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors group"
            >
              <LayoutDashboard className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
              Dashboard
            </Link>
            <Link
              href="/engagements"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors group"
            >
              <Crosshair className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
              Engagements
            </Link>
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-800 shrink-0">
            <p className="text-xs text-slate-600 font-mono">v0.1.0</p>
          </div>
        </aside>

        {/* Main content — offset by sidebar width */}
        <main className="pl-56 flex-1 flex flex-col min-h-full overflow-x-hidden">
          {children}
        </main>

        <Toaster />
      </body>
    </html>
  );
}
