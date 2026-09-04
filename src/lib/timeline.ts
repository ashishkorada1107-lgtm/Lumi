import { Database } from "@/types/database.types";
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];
type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type ScheduledTimelineItem = {
  isFreePeriod: false;
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  type: 'class' | 'activity';
  original: Record<string, unknown>;
  start: string;
};

export type FreePeriodTimelineItem = {
  isFreePeriod: true;
  start: string;
  end: string;
  duration: number;
  recommendedTask: Task | null;
};

export type TimelineElement = ScheduledTimelineItem | FreePeriodTimelineItem;

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function generateTimeline(
  classes: Class[],
  activities: Activity[],
  priorityCandidates: Task[]
): TimelineElement[] {
  const scheduledItems = [
    ...classes.map(c => ({ id: `cls-${c.id}`, title: c.title, start_time: c.start_time, end_time: c.end_time, location: c.room, type: 'class' as const, original: c })),
    ...activities.map(a => ({ id: `act-${a.id}`, title: a.title, start_time: a.start_time, end_time: a.end_time, location: a.location, type: 'activity' as const, original: a }))
  ].sort((a, b) => a.start_time < b.start_time ? -1 : 1);

  const freePeriods: { start: string, end: string, duration: number }[] = [];
  
  if (scheduledItems.length > 0) {
    const mergedItems = [{ start: scheduledItems[0].start_time, end: scheduledItems[0].end_time }];
    for (let i = 1; i < scheduledItems.length; i++) {
      const item = scheduledItems[i];
      const last = mergedItems[mergedItems.length - 1];
      if (item.start_time <= last.end) {
        if (item.end_time > last.end) last.end = item.end_time;
      } else {
        mergedItems.push({ start: item.start_time, end: item.end_time });
      }
    }

    for (let i = 0; i < mergedItems.length - 1; i++) {
      const current = mergedItems[i];
      const next = mergedItems[i+1];
      if (current.end < next.start) {
        freePeriods.push({
          start: current.end,
          end: next.start,
          duration: timeToMinutes(next.start) - timeToMinutes(current.end)
        });
      }
    }
  }

  const availableForRecommendation = [...priorityCandidates];
  const recommendations = freePeriods.map(fp => {
    const recIndex = availableForRecommendation.findIndex(t => t.estimated_minutes && t.estimated_minutes <= fp.duration);
    let recommendedTask = null;
    if (recIndex !== -1) {
      recommendedTask = availableForRecommendation[recIndex];
      availableForRecommendation.splice(recIndex, 1);
    }
    return { ...fp, recommendedTask };
  });

  return [
    ...scheduledItems.map(item => ({ ...item, start: item.start_time, isFreePeriod: false as const })),
    ...recommendations.map(fp => ({ ...fp, isFreePeriod: true as const }))
  ].sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
}
