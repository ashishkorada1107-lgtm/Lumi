"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LAST_SYNCED_KEY = "dailyflow:last-synced";

function readLastSynced() {
  const value = window.localStorage.getItem(LAST_SYNCED_KEY);
  return value ? new Date(value) : null;
}

export function OfflineStatus() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    const syncNow = () => {
      const now = new Date();
      window.localStorage.setItem(LAST_SYNCED_KEY, now.toISOString());
      setLastSynced(now);
    };

    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
      router.refresh();
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    setLastSynced(readLastSynced());
    if (navigator.onLine) syncNow();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-2 z-50 -translate-x-1/2 rounded-full border border-amber-500/30 bg-amber-950/90 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur"
    >
      Offline · Last synced{" "}
      {lastSynced
        ? lastSynced.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "not yet"}
    </div>
  );
}
