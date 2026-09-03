import { Database } from "@/types/database.types";

type ClassEvent = Database["public"]["Tables"]["classes"]["Row"];
type ActivityEvent = Database["public"]["Tables"]["activities"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export type BriefingData = {
  greeting: string;
  summary: {
    classesCount: number;
    tasksCount: number;
    activitiesCount: number;
  };
  priorityTask: Task | null;
  nextScheduled: { title: string, time: string } | null;
  freeTime: string | null;
  recommendation: string | null;
};

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function generateMorningBriefing(
  classes: ClassEvent[],
  activities: ActivityEvent[],
  tasks: Task[],
  targetDateStr: string,
  actualTodayStr: string,
  currentTimeStr: string
): BriefingData {
  // 1. Process Tasks for today
  const targetTasks = tasks.filter(t => t.due_date === targetDateStr);
  const pendingTargetTasks = targetTasks.filter(t => !t.completed);
  
  const overdueTasks = tasks.filter(t => !t.completed && t.due_date && t.due_date < targetDateStr);
  const upcomingHighTasks = tasks.filter(t => !t.completed && t.priority === 'High' && (!t.due_date || t.due_date > targetDateStr));
  
  const relevantTasks = [...pendingTargetTasks, ...overdueTasks, ...upcomingHighTasks];

  // 2. Today's Priority
  const priorityCandidates = [...overdueTasks, ...pendingTargetTasks].sort((a, b) => {
    if (a.priority === 'High' && b.priority !== 'High') return -1;
    if (b.priority === 'High' && a.priority !== 'High') return 1;
    if (a.priority === 'Medium' && b.priority === 'Low') return -1;
    if (b.priority === 'Medium' && a.priority === 'Low') return 1;
    return (a.due_date || "") < (b.due_date || "") ? -1 : 1;
  });
  const priorityTask = priorityCandidates.length > 0 ? priorityCandidates[0] : null;

  // 3. Scheduled Items & Next
  const scheduledItems = [
    ...classes.map(c => ({ title: c.title, start_time: c.start_time, end_time: c.end_time })),
    ...activities.map(a => ({ title: a.title, start_time: a.start_time, end_time: a.end_time }))
  ].sort((a, b) => a.start_time < b.start_time ? -1 : 1);

  let nextScheduled = null;
  if (targetDateStr === actualTodayStr) {
    const nextItem = scheduledItems.find(item => item.start_time >= currentTimeStr);
    if (nextItem) {
      nextScheduled = { title: nextItem.title, time: nextItem.start_time };
    }
  } else if (scheduledItems.length > 0) {
    nextScheduled = { title: scheduledItems[0].title, time: scheduledItems[0].start_time };
  }

  // 4. Free Periods & Recommendation
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

  // Find best free period (e.g., longest one, or just the first significant one > 30m)
  let bestFreePeriod = null;
  let recommendationStr = null;

  // Find a free period that fits a task
  let recommendedTask = null;
  for (const fp of freePeriods) {
    const fittingTask = priorityCandidates.find(t => t.estimated_minutes && t.estimated_minutes <= fp.duration);
    if (fittingTask) {
      bestFreePeriod = fp;
      recommendedTask = fittingTask;
      break;
    }
  }

  if (!bestFreePeriod && freePeriods.length > 0) {
    // Just pick the longest
    bestFreePeriod = freePeriods.sort((a, b) => b.duration - a.duration)[0];
  }

  let freeTimeStr = null;
  if (bestFreePeriod) {
    freeTimeStr = `${bestFreePeriod.start} - ${bestFreePeriod.end}`;
    if (recommendedTask) {
      recommendationStr = `Your ${freeTimeStr} free period is a good time to work on your "${recommendedTask.title}" task.`;
    } else {
      recommendationStr = `You have a free period from ${freeTimeStr} to rest or catch up.`;
    }
  }

  let greeting = "Good morning ☀️";
  const hour = parseInt(currentTimeStr.split(':')[0]);
  if (hour >= 12 && hour < 17) greeting = "Good afternoon 🌤️";
  else if (hour >= 17) greeting = "Good evening 🌙";

  return {
    greeting,
    summary: {
      classesCount: classes.length,
      tasksCount: relevantTasks.length,
      activitiesCount: activities.length
    },
    priorityTask,
    nextScheduled,
    freeTime: freeTimeStr,
    recommendation: recommendationStr
  };
}

