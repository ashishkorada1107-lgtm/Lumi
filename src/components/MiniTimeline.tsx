"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { BookOpen, Clock, Sparkles } from "lucide-react";
import { TimelineElement } from "@/lib/timeline";
import { cn } from "@/lib/utils";

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function format12Hour(timeStr: string) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function MiniTimeline({
  elements,
  isViewingToday,
  hoursAhead = 4,
}: {
  elements: TimelineElement[];
  isViewingToday: boolean;
  hoursAhead?: number;
}) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setCurrentTime(toZonedTime(new Date(), "Asia/Kolkata"));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  const upcomingItems = useMemo(() => {
    if (!elements.length) return [];

    // Fall back to 0 on initial render to prevent hydration mismatches
    const nowMin = currentTime
      ? currentTime.getHours() * 60 + currentTime.getMinutes()
      : 0;

    const cutoff = nowMin + hoursAhead * 60;

    return elements.filter((item) => {
      const startMin = timeToMinutes(item.start);
      const endMin = item.isFreePeriod
        ? timeToMinutes(item.end)
        : timeToMinutes(item.end_time);

      if (!isViewingToday) return true;
      if (endMin <= nowMin && !(endMin <= startMin)) return false;
      return startMin <= cutoff || (startMin <= nowMin && endMin > nowMin);
    }).slice(0, 5);
  }, [elements, currentTime, isViewingToday, hoursAhead]);

  const nowMin = currentTime
    ? currentTime.getHours() * 60 + currentTime.getMinutes()
    : null;

  if (upcomingItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Clock className="w-8 h-8 text-zinc-600 mb-2" />
        <p className="text-sm text-zinc-500">Nothing in the next few hours</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-1">
      {isViewingToday && nowMin !== null && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold text-red-400">
            Now · {format12Hour(format(currentTime!, "HH:mm"))}
          </span>
        </div>
      )}

      {upcomingItems.map((item, idx) => {
        const startMin = timeToMinutes(item.start);
        const endMin = item.isFreePeriod
          ? timeToMinutes(item.end)
          : timeToMinutes(item.end_time);
        const isCurrent =
          isViewingToday && nowMin !== null && nowMin >= startMin && nowMin < endMin;
        const isPast =
          isViewingToday && nowMin !== null && nowMin >= endMin && endMin > startMin;

        if (item.isFreePeriod) {
          return (
            <div
              key={`fp-${idx}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed transition-opacity",
                isCurrent
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : "border-zinc-800 bg-zinc-900/30",
                isPast && "opacity-40"
              )}
            >
              <div className="w-1 h-7 rounded-full bg-emerald-500/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-400">Free</p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {format12Hour(item.start)} &ndash; {format12Hour(item.end)}
                </p>
              </div>
              {item.recommendedTask && (
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </div>
          );
        }

        const isClass = item.type === "class";
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
              isCurrent
                ? isClass
                  ? "border-indigo-500/50 bg-indigo-950/30 ring-1 ring-indigo-500/20"
                  : "border-amber-500/50 bg-amber-950/30 ring-1 ring-amber-500/20"
                : "border-zinc-800 bg-zinc-900/40",
              isPast && "opacity-40"
            )}
          >
            <div
              className={cn(
                "w-1 h-7 rounded-full shrink-0",
                isClass ? "bg-indigo-500" : "bg-amber-500"
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-100 truncate">{item.title}</p>
              <p className="text-[10px] text-zinc-500">
                {format12Hour(item.start_time)} &ndash; {format12Hour(item.end_time)}
              </p>
            </div>
            {isCurrent && (
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                isClass
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              )}>
                Now
              </span>
            )}
            {!isCurrent && item.location && (
              <BookOpen className="w-3 h-3 text-zinc-600 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
