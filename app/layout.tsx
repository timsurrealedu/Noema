import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import {AppStateProvider} from "./components/AppState";
import {PWARegister} from "./components/PWARegister";
import {ServiceNotice} from "./components/ServiceNotice";
import {NavigationWarmup} from "./components/NavigationWarmup";
import {PageMotion} from "./components/PageMotion";

export const metadata: Metadata = {
  title: "Noema — Today",
  description: "Capture, understand, act.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {themeColor:"#1d2021",colorScheme:"dark light",viewportFit:"cover"};

const themeScript=`(()=>{try{const theme=localStorage.getItem("noema-theme")==="light"?"light":"dark",root=document.documentElement;root.dataset.theme=theme;root.style.colorScheme=theme;let meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement("meta");meta.name="theme-color";document.head.append(meta)}meta.content=theme==="light"?"#fbf1c7":"#1d2021"}catch{}})()`;

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><Script id="noema-theme" strategy="beforeInteractive">{themeScript}</Script><AppStateProvider>{children}<NavigationWarmup/><PWARegister/><ServiceNotice/><PageMotion/></AppStateProvider></body></html>;
}
