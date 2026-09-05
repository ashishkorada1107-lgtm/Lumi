"use client";

import { useEffect } from "react";
import { syncLocalReminders } from "@/lib/local-notifications";

type Props = {
  userId?: string;
  classes?: Array<{
    id: number;
    title: string;
    day_of_week: string;
    start_time: string;
  }>;
  tasks?: Array<{
    id: number;
    title: string;
    due_date: string | null;
    completed: boolean;
  }>;
  replaceClasses?: boolean;
  replaceTasks?: boolean;
};

export default function LocalNotificationSync({
  userId,
  classes,
  tasks,
  replaceClasses,
  replaceTasks,
}: Props) {
  useEffect(() => {
    syncLocalReminders(userId, { classes, tasks, replaceClasses, replaceTasks });

    const handleOnline = () => {
      syncLocalReminders(userId, { classes, tasks, replaceClasses, replaceTasks });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [userId, classes, tasks, replaceClasses, replaceTasks]);

  return null;
}
