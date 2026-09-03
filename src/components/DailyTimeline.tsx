"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, BookOpen } from "lucide-react";
import { TimelineElement } from "@/lib/timeline";

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
}: {
  allTimelineElements: TimelineElement[];
  emptyMessage?: string;
}) {
  // null on server → HTML structure is identical on SSR and initial client render
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isViewingToday, setIsViewingToday] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const searchParams = new URLSearchParams(window.location.search);
      const urlDate = searchParams.get('date');
      const actualTodayStr = format(now, 'yyyy-MM-dd');
      setIsViewingToday(!urlDate || urlDate === actualTodayStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, []);

  let isScheduleFinished = false;
  let formattedFinishedTime = "";
  if (currentTime && isViewingToday && allTimelineElements.length > 0) {
    const lastItem = allTimelineElements[allTimelineElements.length - 1];
    const lastStart = timeToMinutes(lastItem.start);
    let lastEnd = timeToMinutes(lastItem.isFreePeriod ? lastItem.end : lastItem.end_time);
    // Handle midnight-crossing: if last event ends at 00:00 or any time <= its start
    if (lastEnd <= lastStart) lastEnd += 1440;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    if (nowMin >= lastEnd) {
      isScheduleFinished = true;
      const curH = currentTime.getHours().toString().padStart(2, '0');
      const curM = currentTime.getMinutes().toString().padStart(2, '0');
      formattedFinishedTime = format12Hour(`${curH}:${curM}`);
    }
  }

  return (
    <div className="space-y-4">
      {allTimelineElements.length === 0 ? (
        <div className="py-8 text-center border rounded-xl border-dashed">
          <p className="text-zinc-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-zinc-100 dark:border-zinc-800 ml-3 space-y-6 pb-6">
          {allTimelineElements.map((item, idx) => {
            // When currentTime is null (SSR), everything is 'upcoming' → identical HTML on server & client
            let state: ItemState = 'upcoming';
            let progressPercent = 0;
            let formattedCurrentTime = "";

            if (currentTime && isViewingToday) {
              const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes() + (currentTime.getSeconds() / 60);
              const startMin = timeToMinutes(item.start);
              let endMin = item.isFreePeriod ? timeToMinutes(item.end) : timeToMinutes(item.end_time);

              // Handle midnight-crossing events: if end <= start, the event runs past midnight.
              // Treat "00:00" and any end <= start as 1440 (next day) for comparison purposes.
              if (endMin <= startMin) {
                endMin += 1440;
              }

              // Correct three-way state: current iff start <= now < end
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

            // ── FREE PERIOD ──────────────────────────────────────────────────
            if (item.isFreePeriod) {
              return (
                <div key={`fp-${idx}`} className="relative pl-6">
                  <div className={`absolute w-3 h-3 bg-green-100 border-2 border-green-500 rounded-full -left-[7.5px] top-1.5 dark:bg-green-900 z-10 transition-opacity ${isFinished ? 'opacity-40' : ''}`} />

                  {/* Live dot — only during a free period, moves with time */}
                  {isCurrent && (
                    <div
                      className="absolute -left-[5px] z-20 flex items-center"
                      style={{ top: `calc(${progressPercent}% + 6px)`, transform: 'translateY(-50%)' }}
                    >
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.7)] ring-2 ring-white dark:ring-zinc-950" />
                      <span className="ml-2 text-[11px] font-semibold text-red-500">{formattedCurrentTime}</span>
                    </div>
                  )}

                  <div className={`text-xs font-semibold text-green-600 dark:text-green-400 mb-1 transition-opacity ${isFinished ? 'opacity-50' : ''}`}>
                    FREE PERIOD • {format12Hour(item.start)} – {format12Hour(item.end)}{' '}
                    ({Math.floor(item.duration / 60) > 0 ? `${Math.floor(item.duration / 60)}h ` : ''}{item.duration % 60}m)
                  </div>

                  {item.recommendedTask && (
                    <Card className={`bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/50 shadow-none transition-opacity ${isFinished ? 'opacity-50' : ''}`}>
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Recommended Task</p>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-zinc-300" />
                          <div>
                            <p className="text-sm font-medium">{item.recommendedTask.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Est: {item.recommendedTask.estimated_minutes} min • {item.recommendedTask.priority} priority
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            }

            // ── SCHEDULED ITEM (class / activity) ────────────────────────────
            const isClass = item.type === 'class';

            const dotClass = [
              "absolute w-3 h-3 border-2 rounded-full -left-[7.5px] top-1.5 z-10 transition-colors",
              isClass ? "border-blue-500" : "border-purple-500",
              isCurrent
                ? isClass ? "bg-blue-500" : "bg-purple-500"
                : isFinished
                  ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                  : "bg-white dark:bg-zinc-950",
            ].join(' ');

            const cardClass = [
              "transition-all",
              isCurrent
                ? isClass
                  ? "shadow-md border-blue-400 dark:border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-300 dark:ring-blue-700"
                  : "shadow-md border-purple-400 dark:border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 ring-1 ring-purple-300 dark:ring-purple-700"
                : isFinished
                  ? "shadow-none opacity-50"
                  : "shadow-sm",
            ].join(' ');

            return (
              <div key={item.id} className="relative pl-6">
                <div className={dotClass} />

                <div className={`text-xs font-semibold mb-1 transition-colors ${isFinished ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500'}`}>
                  {format12Hour(item.start_time)} – {format12Hour(item.end_time)}
                </div>

                {/* Card — IDENTICAL JSX structure on server and client.
                    Visual differences are purely via className, never structural. */}
                <Card className={cardClass}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <p className={`font-semibold transition-colors ${isFinished ? 'text-zinc-400 dark:text-zinc-500' : ''}`}>
                        {item.title}
                      </p>
                      {/* Always rendered — opacity-0 when not in progress so HTML structure never changes */}
                      <Badge
                        variant="default"
                        className={[
                          "shrink-0 text-[10px] font-bold px-1.5 py-0.5 shadow-none transition-opacity",
                          isCurrent
                            ? isClass
                              ? "opacity-100 bg-blue-500 hover:bg-blue-600 text-white"
                              : "opacity-100 bg-purple-500 hover:bg-purple-600 text-white"
                            : "opacity-0 pointer-events-none bg-zinc-200 text-transparent",
                        ].join(' ')}
                        aria-hidden={!isCurrent}
                      >
                        IN PROGRESS
                      </Badge>
                    </div>

                    <div className={`flex items-center gap-4 mt-2 text-sm transition-colors ${isFinished ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500'}`}>
                      {item.location && (
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          <span>{item.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-normal px-1.5 transition-colors ${
                            isCurrent
                              ? isClass ? "border-blue-300 dark:border-blue-700" : "border-purple-300 dark:border-purple-700"
                              : isFinished ? "border-zinc-200 dark:border-zinc-700 text-zinc-400" : ""
                          }`}
                        >
                          {isClass ? 'Class' : 'Activity'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {isScheduleFinished && (
            <div className="relative pl-6 pt-2">
              <div className="absolute w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.8)] -left-[5px] top-3 animate-pulse" />
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">Schedule finished for today</p>
                <span className="text-red-500 font-bold text-[11px]">{formattedFinishedTime}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
