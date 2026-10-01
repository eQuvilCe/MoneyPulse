import type { Metadata } from "next";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AIBuddy from "@/components/AIBuddy";
import { ToastProvider } from "@/components/Toast";
import Onboarding from "@/components/Onboarding";
import AIBriefing from "@/components/AIBriefing";
import { AppProvider } from "@/components/AppProvider";
import AuthShell from "@/components/AuthShell";
import MobileNav from "@/components/MobileNav";
import PWARegister from "@/components/PWARegister";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoneyPulse — Know where your money goes",
  description: "AI finance tracker for Uzbekistan. SMS import, Pulse score, budgets and forecast.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MoneyPulse",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-[#05070d] text-white antialiased">
        <AppProvider>
          <ToastProvider>
            <AuthShell>
              <Sidebar />
              <main className="relative z-10 min-h-screen lg:ml-[240px]">
                <div className="mx-auto max-w-5xl px-4 py-6 pb-28 pt-16 lg:px-8 lg:py-8 lg:pb-10 lg:pt-8">
                  {children}
                </div>
              </main>
              <AIBuddy />
              <MobileNav />
              <PWARegister />
              <Onboarding />
              <AIBriefing />
            </AuthShell>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
