"use client";

import {useEffect, useRef} from "react";
import {usePathname} from "next/navigation";

/**
 * Directional page-arrival motion for Noema's five modules.
 *
 * The entrance itself is pure CSS (see globals.css `noema-enter-*`), triggered by
 * React remounting each route's main content on App Router navigation. This component
 * only decides the *direction* — forward / back / none — from the nav order, and
 * stamps it on <html data-nav-dir> early enough that the arriving page paints with it.
 *
 * We deliberately avoid the View Transitions API: App Router navigations commit
 * asynchronously (RSC fetch), so `startViewTransition` would snapshot the outgoing
 * page and produce a broken transition. A mount-driven CSS entrance is robust to that.
 */

const NAV_ORDER = ["/", "/capture", "/vault", "/calendar", "/coding"];

const matchIndex = (pathname: string): number =>
  NAV_ORDER.findIndex(base => pathname === base || pathname.startsWith(base + "/"));

const directionFor = (from: string, to: string): "forward" | "back" | "none" => {
  const a = matchIndex(from), b = matchIndex(to);
  if (a < 0 || b < 0) return "none";
  return b > a ? "forward" : b < a ? "back" : "none";
};

export function PageMotion() {
  const pathname = usePathname();
  const last = useRef<string>(pathname);

  // Capture-phase click interceptor: stamp direction before navigation commits so the
  // arriving page paints with the right entrance. Covers both .app-shell (home) and
  // ModuleShell nav links, plus any other internal <a>.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (/^https?:\/\//i.test(href) && !href.startsWith(location.origin)) return;
      let url: URL;
      try {url = new URL(href, location.href)} catch {return}
      if (url.origin !== location.origin) return;
      document.documentElement.dataset.navDir = directionFor(location.pathname, url.pathname);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Normalize for non-link navigation (browser back/forward, programmatic router.push).
  useEffect(() => {
    const dir = directionFor(last.current, pathname);
    if (dir !== "none") document.documentElement.dataset.navDir = dir;
    last.current = pathname;
  }, [pathname]);

  return null;
}
