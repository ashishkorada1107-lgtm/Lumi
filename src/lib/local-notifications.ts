import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

type ReminderClass = {
  id: number;
  title: string;
  day_of_week: string;
  start_time: string;
};

type ReminderTask = {
  id: number;
  title: string;
  due_date: string | null;
  completed: boolean;
};

type ReminderCache = {
  classes: ReminderClass[];
  tasks: ReminderTask[];
  scheduledIds: number[];
};

const CACHE_PREFIX = "dailyflow:local-reminders:";
const REMINDER_MINUTES_BEFORE_CLASS = 10;
const DAYS_TO_SCHEDULE = 14;

let reconcileQueue = Promise.resolve();

function isAndroidNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

function readCache(userId: string): ReminderCache {
  try {
    const value = localStorage.getItem(cacheKey(userId));
    if (value) return JSON.parse(value) as ReminderCache;
  } catch (error) {
    console.error("Failed to read local reminder cache", error);
  }

  return { classes: [], tasks: [], scheduledIds: [] };
}

function writeCache(userId: string, cache: ReminderCache) {
  localStorage.setItem(cacheKey(userId), JSON.stringify(cache));
}

function stableId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) || 1;
}

function parseTime(value: string, date: Date) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function dayMatches(dayOfWeek: string, date: Date) {
  const day = date.toLocaleDateString("en-US", { weekday: "long" });
  return dayOfWeek.toLowerCase().split(",").some((value) => value.trim() === day.toLowerCase());
}

function createNotifications(cache: ReminderCache) {
  const now = new Date();
  const notifications: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
    extra: { kind: string; sourceId: number };
  }> = [];

  for (let offset = 0; offset < DAYS_TO_SCHEDULE; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    date.setHours(0, 0, 0, 0);

    for (const classItem of cache.classes) {
      if (!dayMatches(classItem.day_of_week, date)) continue;
      const classStart = parseTime(classItem.start_time, date);
      if (!classStart) continue;
      const reminderAt = new Date(classStart.getTime() - REMINDER_MINUTES_BEFORE_CLASS * 60_000);
      if (reminderAt <= now) continue;

      notifications.push({
        id: stableId(`class:${classItem.id}:${date.toISOString().slice(0, 10)}`),
        title: "Upcoming class",
        body: `${classItem.title} starts in ${REMINDER_MINUTES_BEFORE_CLASS} minutes`,
        schedule: { at: reminderAt },
        extra: { kind: "class", sourceId: classItem.id },
      });
    }
  }

  for (const task of cache.tasks) {
    if (task.completed || !task.due_date) continue;
    // Tasks currently have a date but no time. Use the existing date at 09:00 local.
    const reminderAt = new Date(`${task.due_date}T09:00:00`);
    if (Number.isNaN(reminderAt.getTime()) || reminderAt <= now) continue;

    notifications.push({
      id: stableId(`task:${task.id}:${task.due_date}`),
      title: "Task due today",
      body: task.title,
      schedule: { at: reminderAt },
      extra: { kind: "task", sourceId: task.id },
    });
  }

  return notifications;
}

async function reconcile(userId: string) {
  const staleUserKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(CACHE_PREFIX) || key === cacheKey(userId)) continue;
    staleUserKeys.push(key);
  }

  for (const key of staleUserKeys) {
    try {
      const staleCache = JSON.parse(localStorage.getItem(key) || "{}") as Partial<ReminderCache>;
      if (staleCache.scheduledIds?.length) {
        await LocalNotifications.cancel({
          notifications: staleCache.scheduledIds.map((id) => ({ id })),
        });
      }
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to clear stale local reminders", error);
    }
  }

  const cache = readCache(userId);
  const permissions = await LocalNotifications.checkPermissions();
  if (permissions.display === "prompt") {
    const requested = await LocalNotifications.requestPermissions();
    if (requested.display !== "granted") return;
  } else if (permissions.display !== "granted") {
    return;
  }

  if (cache.scheduledIds.length > 0) {
    await LocalNotifications.cancel({
      notifications: cache.scheduledIds.map((id) => ({ id })),
    });
  }

  const notifications = createNotifications(cache);
  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  writeCache(userId, {
    ...cache,
    scheduledIds: notifications.map((notification) => notification.id),
  });
}

export function syncLocalReminders(
  userId: string | undefined,
  data: {
    classes?: ReminderClass[];
    tasks?: ReminderTask[];
    replaceClasses?: boolean;
    replaceTasks?: boolean;
  }
) {
  if (!userId || !isAndroidNative()) return;

  const current = readCache(userId);
  const next: ReminderCache = {
    ...current,
    classes: data.classes
      ? (data.replaceClasses ? data.classes : [...current.classes, ...data.classes])
          .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
      : current.classes,
    tasks: data.tasks
      ? (data.replaceTasks ? data.tasks : [...current.tasks, ...data.tasks])
          .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
      : current.tasks,
  };

  writeCache(userId, next);
  reconcileQueue = reconcileQueue
    .then(() => reconcile(userId))
    .catch((error) => console.error("Failed to reconcile local reminders", error));
}
