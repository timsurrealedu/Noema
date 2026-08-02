import type { Metadata, Viewport } from "next";
import "./globals.css";
import {AppStateProvider} from "./components/AppState";
import {PWARegister} from "./components/PWARegister";
import {ServiceNotice} from "./components/ServiceNotice";
import {NavigationWarmup} from "./components/NavigationWarmup";

export const metadata: Metadata = {
  title: "Noema — Today",
  description: "Capture, understand, act.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {themeColor:"#0b0d0e", colorScheme:"dark light"};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><AppStateProvider>{children}<NavigationWarmup/><PWARegister/><ServiceNotice/></AppStateProvider></body></html>;
}
