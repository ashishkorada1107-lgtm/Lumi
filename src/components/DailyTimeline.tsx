"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, MapPin } from "lucide-react";
import { TimelineElement } from "@/lib/timeline";
import { cn } from "@/lib/utils";

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function format12Hour(timeStr: string) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

type ItemState = 'current' | 'finished' | 'upcoming';

export default function DailyTimeline({
  allTimelineElements,
  emptyMessage = "Nothing scheduled for this date",
  viewingDateStr,
}: {
  allTimelineElements: TimelineElement[];
  emptyMessage?: string;
  viewingDateStr?: string;
}) {
  // null on server → HTML structure is identical on SSR and initial client render
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isViewingToday, setIsViewingToday] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const actualTodayStr = format(now, 'yyyy-MM-dd');
      
      if (viewingDateStr) {
        setIsViewingToday(viewingDateStr === actualTodayStr);
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        const urlDate = searchParams.get('date');
        setIsViewingToday(!urlDate || urlDate === actualTodayStr);
      }
    };
    updateTime();
    
    // Use 60 seconds since calculations are based on minutes
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  let isScheduleFinished = false;
  let formattedFinishedTime = "";
  let currentTimeLinePercent: number | null = null;
  const displayTimeline = [...allTimelineElements];

  if (currentTime && isViewingToday && displayTimeline.length > 0) {
    const firstItem = displayTimeline[0];
    const firstStartMin = timeToMinutes(firstItem.start);
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (nowMin < firstStartMin) {
      const curH = currentTime.getHours().toString().padStart(2, "0");
      const curM = currentTime.getMinutes().toString().padStart(2, "0");

      const beforePeriod: TimelineElement = {
        isFreePeriod: true,
        start: `${curH}:${curM}`,
        end: firstItem.start,
        duration: Math.floor(firstStartMin - nowMin),
        recommendedTask: null,
      };
      displayTimeline.unshift(beforePeriod);
    }

    const lastItem = displayTimeline[displayTimeline.length - 1];
    const lastStart = timeToMinutes(lastItem.start);
    let lastEnd = timeToMinutes(lastItem.isFreePeriod ? lastItem.end : lastItem.end_time);

    if (lastEnd <= lastStart) lastEnd += 1440;

    if (nowMin >= lastEnd) {
      isScheduleFinished = true;
      const curH = currentTime.getHours().toString().padStart(2, '0');
      const curM = currentTime.getMinutes().toString().padStart(2, '0');
      formattedFinishedTime = format12Hour(`${curH}:${curM}`);
    }

    const timelineStart = timeToMinutes(displayTimeline[0].start);
    const timelineEndItem = displayTimeline[displayTimeline.length - 1];
    let timelineEnd = timeToMinutes(
      timelineEndItem.isFreePeriod ? timelineEndItem.end : timelineEndItem.end_time
    );
    if (timelineEnd <= timelineStart) timelineEnd += 1440;

    if (nowMin >= timelineStart && nowMin <= timelineEnd) {
      currentTimeLinePercent = ((nowMin - timelineStart) / (timelineEnd - timelineStart)) * 100;
    }
  }

  return (
    <div className="space-y-0">
      {allTimelineElements.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl">
          <p className="text-sm text-zinc-600">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative ml-3">
          {/* Timeline vertical line */}
          <div className="absolute left-0 top-2 bottom-2 w-px bg-zinc-800" />

          <div className="space-y-5 pb-4">
            {displayTimeline.map((item) => {
              let state: ItemState = 'upcoming';
              let progressPercent = 0;
              let formattedCurrentTime = "";

              if (currentTime && isViewingToday) {
                const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes() + (currentTime.getSeconds() / 60);
                const startMin = timeToMinutes(item.start);
                let endMin = item.isFreePeriod ? timeToMinutes(item.end) : timeToMinutes(item.end_time);

                if (endMin <= startMin) endMin += 1440;

                if (nowMin < startMin) {
                  state = 'upcoming';
                } else if (nowMin < endMin) {
                  state = 'current';
                  const duration = endMin - startMin;
                  const preciseElapsed = nowMin - startMin;
                  progressPercent = Math.max(0, Math.min(100, (preciseElapsed / duration) * 100));
                  const curH = currentTime.getHours().toString().padStart(2, '0');
                  const curM = currentTime.getMinutes().toString().padStart(2, '0');
                  formattedCurrentTime = format12Hour(`${curH}:${curM}`);
                } else {
                  state = 'finished';
                }
              }

              const isCurrent = state === 'current';
              const isFinished = state === 'finished';

              // â”€â”€ FREE PERIOD â”€â”€
              if (item.isFreePeriod) {
                return (
                  <div key={`fp-${item.start}`} className="relative pl-6">
                    {/* Timeline dot */}
                    <div className={cn(
                      "absolute w-2 h-2 rounded-full -left-[3.5px] top-2 z-10 transition-opacity",
                      isFinished ? "bg-zinc-700 opacity-40" : "bg-zinc-600 border border-zinc-500"
                    )} />

                    {/* Live indicator during free period */}
                    {isCurrent && (
                      <div
                        className="absolute -left-[4px] z-20 flex items-center gap-2"
                        style={{ top: `calc(${progressPercent}% + 4px)`, transform: 'translateY(-50%)' }}
                      >
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-[pulse-slow_3s_ease-in-out_infinite] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span className="text-[10px] font-semibold text-red-400">{formattedCurrentTime}</span>
                      </div>
                    )}

                    <div className={cn(
                      "py-2 transition-opacity",
                      isFinished ? "opacity-35" : ""
                    )}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                          Free
                        </span>
                        <span className="text-[11px] text-zinc-700">
                          {format12Hour(item.start)} &rarr; {format12Hour(item.end)}
                        </span>
                        <span className="text-[11px] text-zinc-700">
                          {Math.floor(item.duration / 60) > 0
                            ? `${Math.floor(item.duration / 60)}h `
                            : ''}
                          {item.duration % 60}m
                        </span>
                      </div>

                      {item.recommendedTask && (
                        <div className="mt-2 flex items-start gap-2 px-4 py-3 lg:px-3 lg:py-2 rounded-2xl lg:rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-zinc-600 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-zinc-400">{item.recommendedTask.title}</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">
                              {item.recommendedTask.estimated_minutes}m &middot; {item.recommendedTask.priority}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // â”€â”€ SCHEDULED ITEM (class / activity) â”€â”€
              const isClass = item.type === 'class';
              const accentColor = isClass ? "bg-indigo-500" : "bg-amber-500";
              const accentBorder = isClass
                ? "border-l-indigo-500/70"
                : "border-l-amber-500/70";

              return (
                <div key={item.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute w-2 h-2 rounded-full -left-[3.5px] top-3 z-10 transition-all",
                    isCurrent
                      ? cn(accentColor, "shadow-[0_0_6px_rgba(99,102,241,0.4)]")
                      : isFinished
                        ? "bg-zinc-800 border border-zinc-700"
                        : "bg-zinc-800 border border-zinc-600"
                  )} />

                  {/* Time label */}
                  <div className={cn(
                    "text-[11px] font-medium mb-1.5 transition-colors",
                    isFinished ? "text-zinc-700" : "text-zinc-500"
                  )}>
                    {format12Hour(item.start_time)} &rarr; {format12Hour(item.end_time)}
                  </div>

                  {/* Card */}
                  <div className={cn(
                    "rounded-2xl lg:rounded-lg border-l-4 lg:border-l-[2px] px-5 py-4 lg:px-4 lg:py-3 transition-all duration-200",
                    isCurrent
                      ? cn("bg-zinc-800/70 border border-zinc-700/60", accentBorder, "shadow-sm")
                      : isFinished
                        ? "bg-zinc-900/30 border border-transparent border-l-zinc-800 opacity-40"
                        : "bg-zinc-900/60 border border-zinc-800/60 border-l-zinc-700 hover:bg-zinc-800/50"
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn(
                        "font-medium text-sm leading-snug",
                        isFinished ? "text-zinc-500" : "text-zinc-100"
                      )}>
                        {item.title}
                      </p>
                      {/* IN PROGRESS badge â€” always in DOM, opacity toggles */}
                      <span className={cn(
                        "shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded transition-opacity",
                        isCurrent
                          ? isClass
                            ? "opacity-100 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "opacity-100 bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "opacity-0 pointer-events-none bg-transparent text-transparent border-transparent"
                      )}>
                        Now
                      </span>
                    </div>

                    {(item.location || true) && (
                      <div className={cn(
                        "flex items-center gap-3 mt-1.5 text-xs transition-colors",
                        isFinished ? "text-zinc-700" : "text-zinc-500"
                      )}>
                        {item.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{item.location}</span>
                          </div>
                        )}
                        <span className="text-zinc-700">{isClass ? 'Class' : 'Activity'}</span>
                      </div>
                    )}

                    {/* Progress bar for current item */}
                    {isCurrent && (
                      <div className="mt-2.5 w-full bg-zinc-700/50 rounded-full h-px overflow-hidden">
                        <div
                          className={cn(
                            "h-px rounded-full transition-all duration-5000",
                            isClass ? "bg-indigo-400" : "bg-amber-400"
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isScheduleFinished && (
              <div className="relative pl-6 pt-1">
                <div className="absolute w-2 h-2 bg-red-500 rounded-full -left-[3.5px] top-2 animate-[pulse-slow_3s_ease-in-out_infinite] shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-600">Schedule complete</p>
                  <span className="text-xs font-semibold text-red-500">{formattedFinishedTime}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

