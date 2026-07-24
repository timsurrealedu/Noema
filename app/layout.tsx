import type { Metadata, Viewport } from "next";
import "./globals.css";
import {AppStateProvider} from "./components/AppState";
import {PWARegister} from "./components/PWARegister";
import {ServiceNotice} from "./components/ServiceNotice";

export const metadata: Metadata = {
  title: "LifeOS — Today",
  description: "Capture, understand, act.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {themeColor:"#0b0d0e", colorScheme:"dark light"};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><AppStateProvider>{children}<PWARegister/><ServiceNotice/></AppStateProvider></body></html>;
}
