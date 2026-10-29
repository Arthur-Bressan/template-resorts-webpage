"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: boolean | undefined;
};

let sessionConsent: boolean | undefined;

function hasConsent() {
  if (sessionConsent !== undefined) return sessionConsent;
  try { return localStorage.getItem("cookie-consent") === "accepted"; }
  catch { return false; }
}

export function ConsentAnalytics({ googleAnalyticsId }: { googleAnalyticsId?: string }) {
  const [accepted, setAccepted] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const pathname = usePathname();
  const measurementId = /^G-[A-Z0-9]+$/.test(googleAnalyticsId || "") ? googleAnalyticsId : undefined;
  // Payment-return URLs contain a private consultation token. Never send those
  // URLs to optional analytics providers, even after consent.
  const privateRoute = pathname.startsWith("/admin") || pathname.startsWith("/reservas");
  const enabled = accepted && !privateRoute;

  useEffect(() => {
    const sync = (event?: Event) => {
      if (event?.type === "cookie-consent-change") {
        const choice: unknown = (event as CustomEvent).detail;
        if (choice === "accepted" || choice === "rejected") sessionConsent = choice === "accepted";
      } else if (event?.type === "storage") {
        sessionConsent = undefined;
      }
      const consent = hasConsent();
      if (measurementId) (window as AnalyticsWindow)[`ga-disable-${measurementId}`] = !consent || /^\/(admin|reservas)(\/|$)/.test(window.location.pathname);
      setAccepted(consent);
    };
    sync();
    window.addEventListener("cookie-consent-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cookie-consent-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [measurementId]);

  useEffect(() => {
    if (!measurementId) return;
    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow[`ga-disable-${measurementId}`] = !enabled;
    analyticsWindow.gtag?.("consent", "update", { analytics_storage: enabled ? "granted" : "denied" });
  }, [enabled, measurementId]);

  useEffect(() => {
    if (!enabled || !googleReady || !measurementId || !hasConsent()) return;
    (window as AnalyticsWindow).gtag?.("event", "page_view", {
      send_to: measurementId,
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}`,
      page_referrer: document.referrer.split(/[?#]/)[0],
    });
  }, [enabled, googleReady, measurementId, pathname]);

  if (!enabled) return null;

  return <>
    <Analytics beforeSend={(event) => {
      if (!hasConsent()) return null;
      const url = new URL(event.url, window.location.origin);
      if (/^\/(admin|reservas)(\/|$)/.test(url.pathname) || /^\/(admin|reservas)(\/|$)/.test(window.location.pathname)) return null;
      return { ...event, url: `${url.origin}${url.pathname}` };
    }} />
    {measurementId && <Script
      id="consented-google-analytics"
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
      onReady={() => {
        const analyticsWindow = window as AnalyticsWindow;
        if (!hasConsent()) return;
        analyticsWindow.dataLayer ||= [];
        analyticsWindow.gtag ||= (...args: unknown[]) => { analyticsWindow.dataLayer!.push(args); };
        analyticsWindow[`ga-disable-${measurementId}`] = false;
        analyticsWindow.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
        analyticsWindow.gtag("js", new Date());
        analyticsWindow.gtag("config", measurementId, { send_page_view: false, page_location: `${window.location.origin}${pathname}`, page_referrer: document.referrer.split(/[?#]/)[0] });
        setGoogleReady(true);
      }}
    />}
  </>;
}
